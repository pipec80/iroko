# Phase 5 (PR-5) — Mercado Pago redesign: task-by-task implementation plan

> For agentic workers: REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Detailed breakdown of **Phase 5** from
> [`011-billing-correctness.md`](011-billing-correctness.md). Corresponds
> to PR-5 (depends on PR-3 — `BillingService`+capabilities+UI guard —
> **not** on Stripe certification; this phase can run in parallel with
> Phase 2 once Fase 1 is merged). **P0 before enabling MercadoPago in
> production** — this is not optional hardening, the current adapter has
> two confirmed bugs that let a canceled-in-Iroko subscription keep
> charging in MercadoPago (BILL-002, see Plan 011 Contexto).

**Goal:** Replace the current `preapproval_plan_id` + `status: pending`
checkout path (which nothing in `billing.plans.provider_ids` actually
configures today — verified empty in Cloud) with the hosted
pending-preapproval flow, and close the two confirmed cancellation
mechanisms that let MercadoPago keep charging after Iroko marks a
subscription canceled.

**Spec:** [`docs/architecture/billing-platform-v2-design.md`](../../architecture/billing-platform-v2-design.md),
section 7.4. **Re-open before implementing** (last checked 2026-08-18) —
use the Chile documentation specifically, this project targets a Chilean
business context:

- Subscriptions overview/retries: https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/overview
- Associated-plan flow (what's being removed): https://www.mercadopago.com.br/developers/en/docs/subscriptions/integration-configuration/subscription-associated-plan
- Pending payment without associated plan (what's being added): https://www.mercadopago.cl/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
- Subscription management: https://www.mercadopago.cl/developers/en/docs/subscriptions/subscription-management

## Global Constraints

Same as Phase 1 — SOLID/DRY/KISS/YAGNI, early returns, no
`any`/`console.log`, manual migrations mirrored in `supabase/schemas/*.sql`,
`(select auth.uid())`, `SECURITY DEFINER` + `search_path=''` + explicit
grants, `pnpm typecheck && pnpm lint` before every commit, squash merge,
fix bugs found in-branch.

## Contexto — bugs confirmados en el adapter actual (verificados 2026-08-19)

- **Checkout roto por diseño de datos, no de código.**
  `mercadopago.ts:135-153` (`createCheckout`) resuelve `planId` vía
  `get_plan_provider_id(...)` y lo manda como `preapproval_plan_id` — pero
  `billing.plans.provider_ids = {}` en los 5 planes (confirmado en vivo).
  Aunque se poblara, este es el flujo que el spec pide reemplazar
  directamente (sección 7.4) por el flujo sin plan asociado.
- **BILL-002, mecanismo A — shape mismatch.**
  `cancelSubscription(externalId, true)` (`mercadopago.ts:159-172`) llama
  `handleProviderWebhook('mercadopago', JSON.stringify(event), 'internal')`
  con un `NormalizedEvent` serializado donde `verifyWebhook` espera
  `WebhookBody { type, data: { id } }` — `body.data?.id` es `undefined`,
  retorna `null` antes de `verifyManifest()`. Además no revisa el
  `.status` de la respuesta.
- **BILL-002, mecanismo C — el cron nunca llama a la API real.**
  `private.cancel_overdue_mercadopago_subscriptions()`
  (`supabase/schemas/private.sql:494-506`) solo hace
  `UPDATE billing.subscriptions SET status='canceled'`. Comentario propio:
  _"No llama a la API de MercadoPago."_
- **Descartado en la auditoría — no incluir.** El mecanismo "admin client
  sin sesión" que otra auditoría atribuyó a
  `findAccountIdBySubscription`: se verificó que usa `createClient()`
  (sesión real), no un admin client. No es parte del alcance de este plan.

---

## File map

**Modified**

- `src/lib/billing/providers/mercadopago.ts` — reescritura del checkout y
  de la cancelación diferida.
- `src/lib/billing/providers/__tests__/mercadopago.test.ts`,
  `mercadopago.contract.test.ts` (ya existen — extender).
- `supabase/tests/database/13_mercadopago_deferred_cancel.test.sql` — ya
  existe, extender con los casos nuevos de Task 5.

**New**

- `supabase/migrations/<timestamp>_mercadopago_cancellation_edge_function.sql`
  - espejo en `supabase/schemas/private.sql` (Task 5).
- `supabase/functions/cancel-mercadopago-subscriptions/` (Edge Function,
  mismo patrón que `process-email-queue` — Task 5).

---

## Task 1: Lock the two confirmed cancellation bugs with tests

**Files:**

- Modify: `supabase/tests/database/13_mercadopago_deferred_cancel.test.sql`
- Modify: `src/lib/billing/providers/__tests__/mercadopago.test.ts`

- [ ] **Step 1: pgTAP — the cron must not leave a canceled-in-Iroko row
      without a corresponding real cancellation attempt**

```sql
-- after cancel_overdue_mercadopago_subscriptions() runs, a row that was
-- cancel_at_period_end=true and past current_period_end must be flagged
-- pending_provider_cancel=true, NOT silently marked status='canceled'
-- without ever having contacted MercadoPago (this column does not exist
-- yet — that's exactly what Task 5 adds).
```

- [ ] **Step 2: Vitest — deferred cancel never routes through webhook
      verification**

```ts
it('never calls handleProviderWebhook for deferred cancellation', async () => {
  const handleProviderWebhookSpy = vi.spyOn(webhookHandlerModule, 'handleProviderWebhook');

  await mercadopagoProvider.cancelSubscription({
    externalSubscriptionId: 'sub_123',
    timing: 'period_end',
  });

  expect(handleProviderWebhookSpy).not.toHaveBeenCalled();
});

it('propagates a failure instead of silently succeeding when deferred cancel cannot be recorded', async () => {
  applyNormalizedBillingEvent.mockRejectedValue(new Error('db_write_failed'));

  await expect(
    mercadopagoProvider.cancelSubscription({
      externalSubscriptionId: 'sub_123',
      timing: 'period_end',
    }),
  ).rejects.toThrow('db_write_failed');
});
```

- [ ] **Step 3: Run and verify failures**

```bash
pnpm supa:test
pnpm test -- src/lib/billing/providers/__tests__/mercadopago.test.ts
```

Expected: fails — current code still routes through
`handleProviderWebhook('mercadopago', ..., 'internal')` and swallows the
error (per the confirmed audit finding).

---

## Task 2: Replace checkout — pending preapproval without associated plan

**Files:**

- Modify: `src/lib/billing/providers/mercadopago.ts` (`createCheckout`)

- [ ] **Step 1: Test**

```ts
it('creates a pending preapproval without an associated plan, using auto_recurring from the resolved provider price', async () => {
  getProviderPrice.mockResolvedValue({ amount: 2900, currency: 'USD', externalPriceId: null });

  const result = await mercadopagoProvider.createCheckout({
    accountId: ACCOUNT_ID,
    customerEmail: 'a@iroko.app',
    planSlug: 'pro',
    interval: 'month',
    successUrl: SUCCESS_URL,
    cancelUrl: CANCEL_URL,
  });

  expect(postResourceMock).toHaveBeenCalledWith(
    '/preapproval',
    expect.objectContaining({
      reason: expect.any(String),
      external_reference: ACCOUNT_ID,
      payer_email: 'a@iroko.app',
      auto_recurring: expect.objectContaining({
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 29,
        currency_id: 'USD',
      }),
      back_url: SUCCESS_URL,
      status: 'pending',
    }),
  );
  expect(postResourceMock.mock.calls[0][1]).not.toHaveProperty('preapproval_plan_id');
  expect(result.externalSubscriptionId).toEqual(expect.any(String));
});

it('persists a provisional incomplete local subscription with the selected Iroko plan before redirect', async () => {
  await mercadopagoProvider.createCheckout({ /* ... */ planSlug: 'pro', interval: 'month' });
  expect(persistProvisionalSubscription).toHaveBeenCalledWith(
    expect.objectContaining({ accountId: ACCOUNT_ID, planSlug: 'pro', status: 'incomplete' }),
  );
});
```

- [ ] **Step 2: Implement**

Confirm the exact `auto_recurring` field shape against the live "pending
payment without associated plan" doc linked above before implementing —
`frequency`/`frequency_type` naming and accepted values have precedent for
changing across MercadoPago API revisions. `transaction_amount` comes from
`getProviderPrice()` (Fase 1 catalog) — MercadoPago is the one provider
where `externalPriceId` may legitimately be `null` (design spec section
6.1) since there's no reusable remote plan; `amount`/`currency` from the
same catalog row are used instead.

The "persist provisional incomplete subscription before redirect" step is
MercadoPago-specific (design spec section 8, checkout orchestration step 8) — no other provider needs this, because Stripe/Paddle/Lemon Squeezy all
confirm subscription existence via webhook before Iroko needs to know
about it, but MercadoPago's `pending` preapproval can sit unconfirmed for
a while and the local row needs to exist for the returning user's billing
overview to make sense.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/mercadopago.ts
git commit -m "feat: replace MercadoPago preapproval_plan_id checkout with pending auto_recurring flow"
```

---

## Task 3: Normalize `subscription_preapproval` safely

**Files:**

- Modify: `src/lib/billing/providers/mercadopago.ts` (`verifyWebhook`)

- [ ] **Step 1: Test — including the actual sandbox status spelling, not
      just the documented one**

```ts
it('normalizes subscription_preapproval with externalPriceId omitted (MercadoPago has no reusable price id)', async () => {
  const event = await mercadopagoProvider.verifyWebhook(
    FIXTURE_PREAPPROVAL_AUTHORIZED_RAW,
    VALID_SIG,
  );
  expect(event).toMatchObject({ type: 'subscription_created', status: 'active' });
  expect(event).not.toHaveProperty('externalPriceId');
});

it('maps every documented preapproval status, not just authorized/cancelled', async () => {
  // one assertion per status value MercadoPago's sandbox actually returns —
  // confirm the full set against a live sandbox call before finalizing
  // this test; do not assume the production docs list is exhaustive.
});
```

- [ ] **Step 2: Implement**

Reuse `mapPreapprovalStatus` (`mercadopago.ts:39-52`) — logic doesn't
change, only the returned event shape (Fase 1 discriminated union instead
of the old broad `NormalizedEvent`). Since `externalPriceId` isn't
meaningful for MercadoPago's no-plan flow, the reducer's plan resolution
for this provider falls back to the **local provisional subscription's
already-known `plan_id`** (persisted in Task 2) rather than a reverse
price lookup — document this as the one legitimate exception to "always
resolve plan via `externalPriceId`", and make sure the reducer (Fase 1)
actually supports this path; if it doesn't yet, that's a gap to close
here, not to work around.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/mercadopago.ts
git commit -m "feat: normalize MercadoPago subscription_preapproval without inventing a price id"
```

---

## Task 4: Normalize `subscription_authorized_payment` into invoice/payment events

**Files:**

- Modify: `src/lib/billing/providers/mercadopago.ts` (`verifyWebhook`)

- [ ] **Step 1: Test**

```ts
it('normalizes an approved authorized_payment as invoice_paid');
it(
  'normalizes a rejected authorized_payment as invoice_payment_failed with the MercadoPago status_detail as failureCode',
);
```

- [ ] **Step 2: Implement**

Confirm the exact rejection status field in the `authorized_payments`
resource against current docs (`status`/`status_detail`) before mapping to
`failureCode`/`failureMessage`.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/mercadopago.test.ts
pnpm typecheck && pnpm lint

git add src/lib/billing/providers/mercadopago.ts
git commit -m "feat: normalize MercadoPago authorized_payment as invoice paid/failed"
```

---

## Task 5: Fix deferred cancellation — real Edge Function, not a synthetic webhook or a DB-only cron

**Files:**

- Modify: `src/lib/billing/providers/mercadopago.ts` (`cancelSubscription`)
- Create: `supabase/migrations/<timestamp>_mercadopago_cancellation_edge_function.sql`
  - mirror in `supabase/schemas/private.sql`
- Create: `supabase/functions/cancel-mercadopago-subscriptions/`

- [ ] **Step 1: Test (already written in Task 1)**

- [ ] **Step 2: Fix `cancelSubscription` — call `applyNormalizedBillingEvent` directly**

```ts
async cancelSubscription(params: CancelSubscriptionParams): Promise<void> {
  if (params.timing === 'period_end') {
    // Do not synthesize a fake webhook and route it through
    // handleProviderWebhook/verifyWebhook — that path exists to verify
    // signatures on externally-originated payloads, and this event
    // originates inside Iroko. Call the reducer's apply step directly
    // (Fase 1, design spec section 3 Boundary rule — this is exactly the
    // "internal events enter after the cryptographic layer" rule).
    await applyNormalizedBillingEvent({
      type: 'subscription_canceled',
      provider: 'mercadopago',
      externalEventId: `mp_deferred_cancel_${params.externalSubscriptionId}_${Date.now()}`,
      accountId: await resolveAccountId(params.externalSubscriptionId),
      externalSubscriptionId: params.externalSubscriptionId,
      accessUntil: /* current_period_end, read from the existing subscription row */,
      raw: {},
    });
    return;
  }
  await putResource(`/preapproval/${params.externalSubscriptionId}`, { status: 'cancelled' });
}
```

Note `capabilities.cancelAtPeriodEnd` for MercadoPago is still `false`
(design spec section 7.4, MVP) — this fix makes the _mechanism_ safe
(no more silent 400), it does not change the MVP decision to not expose
`cancelAtPeriodEnd` in the UI. This method exists so the Edge Function in
Step 3 below has something correct to call once the cron flags a row.

- [ ] **Step 3: Build the Edge Function that actually cancels at MercadoPago**

Migration adds a `pending_provider_cancel boolean default false` column to
`billing.subscriptions` and rewrites the cron:

```sql
CREATE OR REPLACE FUNCTION private.flag_overdue_mercadopago_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE billing.subscriptions
  SET pending_provider_cancel = true
  WHERE provider = 'mercadopago'
    AND cancel_at_period_end = true
    AND current_period_end < now()
    AND status <> 'canceled'
    AND pending_provider_cancel = false;
END;
$$;
```

New Edge Function `supabase/functions/cancel-mercadopago-subscriptions/`
(same pattern as `process-email-queue` — service-role Supabase client,
scheduled via `pg_cron` HTTP call, same auth header convention already
established in this project): selects rows with
`pending_provider_cancel = true`, calls
`PUT /preapproval/{id} { status: 'cancelled' }` against MercadoPago for
each, and **only then** sets `status = 'canceled'` locally — if the
MercadoPago call fails, the row stays `pending_provider_cancel = true` for
the next run, it is never marked canceled locally without a confirmed
provider-side cancellation. This closes the exact bug: the old cron could
never fail because it did nothing external; the new one can fail loudly
and safely, on the correct side of the risk (leaving `pending_provider_cancel = true`
means MercadoPago is still trying to be canceled next run — the account
still has a paid subscription in Iroko too, so no double failure mode).

- [ ] **Step 4: Verify — pgTAP + Edge Function test**

```bash
pnpm supa:reset
pnpm supa:test
```

Add an Edge Function test following whatever pattern
`process-email-queue`'s handler test already uses in this repo — do not
invent a new testing approach for Edge Functions.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/schemas/private.sql \
  supabase/functions/cancel-mercadopago-subscriptions \
  src/lib/billing/providers/mercadopago.ts

git commit -m "fix: replace MercadoPago DB-only cancellation cron with a real provider-calling Edge Function"
```

---

## Task 6: HMAC contract tests using exact MP manifest rules

**Files:**

- Extend: `src/lib/billing/providers/__tests__/mercadopago.contract.test.ts`
  (already exists — confirm it covers the new checkout/event shapes, not
  just signature verification in isolation)

- [ ] **Step 1: Confirm existing coverage, extend for the new event
      normalization from Tasks 3-4**

- [ ] **Step 2: Verify and commit**

```bash
pnpm test -- src/lib/billing/providers/__tests__/mercadopago.contract.test.ts
pnpm typecheck && pnpm lint
```

---

## Task 7: Sandbox E2E — the release gate

**Files:** none (manual verification + PR evidence)

- [ ] **Step 1: Confirm MercadoPago sandbox credentials exist** — hard
      blocker if not.

- [ ] **Step 2: Run the full lifecycle against sandbox**

Pending authorization created → webhook confirms `subscription_preapproval`
authorized → local subscription flips from `incomplete` to `active` with
the correct plan (the one persisted provisionally in Task 2, not a
default) → recurring payment webhook (`subscription_authorized_payment`) →
`payment_attempts` row → immediate cancellation → verify MercadoPago shows
`cancelled`, not just Iroko's DB.

- [ ] **Step 3: Document event IDs/results in the PR.**

## Completion criteria for Phase 5

- No code path exists that marks a subscription `canceled` in Iroko
  without either (a) a real confirmed provider cancellation, or (b) an
  explicit `pending_provider_cancel` flag that a later run will retry.
- Checkout never sends `preapproval_plan_id`.
- The provisional local subscription created before redirect carries the
  plan the user actually selected — never a default.
- Sandbox E2E evidence recorded in the merged PR.
- `pnpm typecheck && pnpm lint`, relevant Vitest, pgTAP pass.
