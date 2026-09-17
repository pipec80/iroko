# Mercado Pago abandoned checkout resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve stale or ambiguous checkout intents after verified provider
inspection without deleting history or authorizing a blind second preapproval.

**Architecture:** Extend `billing.checkout_intents` with bounded resolution
audit fields and add one ungranted private operator function. Normal checkout
coordination stays service-driven; the operator may only close a reviewed local
intent as `canceled` or `failed`.

**Tech Stack:** PostgreSQL/Supabase migrations, pgTAP and Markdown runbooks.

**Spec:**
[`docs/architecture/mercadopago-reliability-design.md`](../../architecture/mercadopago-reliability-design.md#delivery-e--abandoned-and-ambiguous-checkout-resolution)

## Global Constraints

- `reserved`, `pending` and `needs_review` continue to block a new provider
  POST; age and lease expiry permit investigation only.
- A known checkout URL remains resumable.
- The resolver never deletes an intent, changes subscription access, or calls
  Mercado Pago.
- A discovered remote subscription must be attached and converged through the
  existing provider/reducer path before local resolution.
- The resolver has no `PUBLIC`, `anon`, `authenticated` or `service_role`
  application grant.
- Cloud execution is an independently authorized operation.

---

### Task 1: Add the immutable operator-resolution audit trail

**Files:**

- Create: `supabase/migrations/20260911110000_billing_checkout_operator_resolution.sql`
- Modify: `supabase/schemas/billing.sql`
- Modify: `supabase/schemas/private.sql`
- Test: `supabase/tests/database/40_billing_checkout_resolution.test.sql`
- Regenerate: `src/types/database.ts`

**Interfaces:**

- Produces:

```sql
private.resolve_billing_checkout_intent(
  p_intent_id uuid,
  p_outcome text,
  p_resolution_code text,
  p_operator_reference text
) RETURNS text
```

- [ ] **Step 1: Write the failing pgTAP contract**

Seed separate `needs_review`, stale `pending`, fresh `pending`, `confirmed` and
remote-linked intents. Assert the following behavior:

```sql
SELECT has_column('billing', 'checkout_intents', 'resolved_at');
SELECT has_column('billing', 'checkout_intents', 'resolution_code');
SELECT has_column('billing', 'checkout_intents', 'resolved_by');
SELECT has_function(
  'private', 'resolve_billing_checkout_intent',
  ARRAY['uuid','text','text','text']
);
SELECT ok(
  NOT has_function_privilege(
    'service_role',
    'private.resolve_billing_checkout_intent(uuid,text,text,text)',
    'EXECUTE'
  ),
  'operator resolver has no application grant'
);
```

Use `lives_ok` for a `needs_review → failed` resolution and then assert status,
resolution code, operator reference and non-null timestamp. Use `throws_like`
for invalid outcome, blank/overlong code, blank/overlong operator, fresh
pending, confirmed, and a row with `external_subscription_id IS NOT NULL`.
Assert a second resolution cannot overwrite the first audit record.

- [ ] **Step 2: Run the new database test and observe RED**

Run:
`supabase test db --local supabase/tests/database/40_billing_checkout_resolution.test.sql`

Expected: FAIL because the columns and private function do not exist.

- [ ] **Step 3: Implement the constrained schema and function**

Add nullable fields with constraints:

```sql
resolved_at timestamptz,
resolution_code text CHECK (
  resolution_code IS NULL OR
  (NULLIF(btrim(resolution_code), '') IS NOT NULL AND char_length(resolution_code) <= 100)
),
resolved_by text CHECK (
  resolved_by IS NULL OR
  (NULLIF(btrim(resolved_by), '') IS NOT NULL AND char_length(resolved_by) <= 120)
),
CONSTRAINT checkout_intents_resolution_complete CHECK (
  (resolved_at IS NULL AND resolution_code IS NULL AND resolved_by IS NULL)
  OR
  (resolved_at IS NOT NULL AND resolution_code IS NOT NULL AND resolved_by IS NOT NULL)
)
```

The `SECURITY DEFINER SET search_path = ''` function must lock the row
`FOR UPDATE`, accept only `p_outcome IN ('canceled','failed')`, require bounded
inputs, and accept only:

```sql
status = 'needs_review'
OR (
  status = 'pending'
  AND external_subscription_id IS NULL
  AND lease_expires_at IS NOT NULL
  AND lease_expires_at <= now()
)
```

Reject any row with a remote ID using
`billing_checkout_remote_requires_convergence`. Update all audit fields in one
statement and return the final status. Revoke execution from every application
role; do not add a grant.

- [ ] **Step 4: Mirror, regenerate and observe GREEN**

Run:

```bash
pnpm supa:reset
pnpm supa:gen:types
supabase test db --local supabase/tests/database/40_billing_checkout_resolution.test.sql
supabase test db --local supabase/tests/database/36_billing_checkout_intents.test.sql
```

Expected: tests 36 and 40 pass, proving the resolver does not weaken normal
checkout coordination.

- [ ] **Step 5: Commit the database slice**

```bash
git add supabase/migrations/20260911110000_billing_checkout_operator_resolution.sql supabase/schemas/billing.sql supabase/schemas/private.sql supabase/tests/database/40_billing_checkout_resolution.test.sql src/types/database.ts
git commit -m "feat: add audited checkout resolution"
```

### Task 2: Add an exact operator procedure

**Files:**

- Modify: `docs/runbooks/billing-reconciliation.md`
- Modify: `docs/quality/operational-evidence.md`

**Interfaces:**

- Consumes: private resolver from Task 1 and existing
  `public.attach_billing_checkout_remote(uuid,text,text)`.
- Produces: a reproducible, sanitized MP-08 evidence record.

- [ ] **Step 1: Write the decision tree before the command**

Document these mutually exclusive provider findings:

1. Remote resource exists and belongs to the expected seller/account/plan:
   attach it with the existing service path, retrieve fresh provider state and
   run the reducer. Do not call the private resolver.
2. Provider proves no remote resource exists: close the local row as `failed`
   with `remote_absent_after_provider_review`.
3. Provider shows an explicitly canceled/expired resource without a usable
   checkout: close as `canceled` with
   `remote_terminal_after_provider_review`.
4. Identity or provider evidence remains ambiguous: retain `needs_review` and
   escalate; do not run SQL that releases the reservation.

- [ ] **Step 2: Add read-only preflight queries**

Include queries that select only the target intent, its customer/subscription
join and existing open anomalies. Require the operator to record UTC time,
environment, sanitized account/intent/remote aliases and provider observation.
Use a transaction around the mutation:

```sql
BEGIN;
SELECT *
FROM private.resolve_billing_checkout_intent(
  :'intent_id'::uuid,
  :'outcome',
  :'resolution_code',
  :'operator_reference'
);
SELECT status, resolved_at, resolution_code, resolved_by
FROM billing.checkout_intents
WHERE id = :'intent_id'::uuid;
COMMIT;
```

State that the command requires separate authorization for the target
environment and must never include tokens, emails or full provider payloads.

- [ ] **Step 3: Add rollback semantics**

Document that an erroneous committed resolution is not overwritten. Record a
new financial/operational incident and repair through a reviewed follow-up
migration or provider convergence; the audit row remains evidence.

- [ ] **Step 4: Validate documentation**

Run:

```bash
pnpm docs:check
pnpm test:docs-check
pnpm exec prettier --ignore-path NUL --check docs/runbooks/billing-reconciliation.md docs/quality/operational-evidence.md
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit the operator handoff**

```bash
git add docs/runbooks/billing-reconciliation.md docs/quality/operational-evidence.md
git commit -m "docs: define abandoned checkout resolution"
```

### Task 3: Close only the local MP-08 code gate

**Files:**

- Modify: `docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md`
- Modify: `docs/exec-plans/active/011-phase2-mercadopago-tasks.md`
- Modify: `docs/exec-plans/active/011-phase6-reconciliation-tasks.md`

**Interfaces:**

- Consumes: tested resolver and runbook from Tasks 1–2.
- Produces: synchronized local status; no provider acceptance claim.

- [ ] **Step 1: Record executed evidence**

Update MP-08 with the migration, test 40, resolver restrictions and runbook
section. Preserve `[NO VERIFICADO]` for provider and Cloud results.

- [ ] **Step 2: Run the complete checkout regression gate**

Run:

```bash
pnpm supa:test
pnpm test src/lib/billing/__tests__/service.test.ts
pnpm typecheck
pnpm lint
pnpm docs:check
git diff --check
```

Expected: all commands exit 0; no test authorizes a second provider POST after
an unknown response.

- [ ] **Step 3: Commit the status update**

```bash
git add docs/exec-plans/active/011-mercadopago-v1-chile-acceptance.md docs/exec-plans/active/011-phase2-mercadopago-tasks.md docs/exec-plans/active/011-phase6-reconciliation-tasks.md
git commit -m "docs: record checkout resolution evidence"
```
