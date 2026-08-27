# Billing Platform v2 — Design Spec

Status: Approved architecture, extracted from the billing audit and
revalidated against current provider APIs on 2026-08-18. Verified against
the actual Iroko codebase and a live Supabase Cloud query on 2026-08-19
(see `docs/exec-plans/active/011-billing-correctness.md` for the specific
file:line evidence that grounds this spec).

Repository: pipec80/iroko

Scope: Billing core + Stripe + Paddle + Lemon Squeezy + Mercado Pago +
observability + reconciliation.

## 1. Goal

Build a provider-agnostic billing subsystem where Iroko owns normalized
billing state and access decisions, while each PSP owns payment collection,
retries/dunning, hosted payment UI, and provider-specific lifecycle
behavior.

The implementation must make these invariants impossible to violate
accidentally:

- A provider event never invents an Iroko plan.
- An invoice/payment event never silently changes a subscription plan.
- Every external identifier is namespaced by provider.
- One Iroko account may have billing identities in multiple providers.
- Cancellation must stop future charges at the PSP before Iroko marks the
  provider subscription canceled.
- A second paid checkout cannot accidentally create a second active
  recurring subscription.
- Payment failures and recoveries are observable and persisted.
- Provider state and Iroko state can be reconciled.

## 2. Non-goals

- Do not build a custom retry/dunning engine.
- Do not build a tax engine. Paddle and Lemon Squeezy are Merchant of
  Record; Stripe and Mercado Pago remain provider-specific integrations.
- Do not build cross-provider subscription migration in v2 core.
- Do not implement coupons, metered billing, seat billing, proration
  strategy, or usage billing unless a provider adapter needs a minimal
  field to preserve existing behavior.
- Do not expose provider-specific semantics directly to dashboard
  components.

## 3. Architecture

```
Dashboard / Server Actions
          |
     BillingService
          |
  +-------+--------------------+
  |       |                    |
Catalog  Domain state      Provider registry
  |       |                    |
  |       +-> Customers        +-> Stripe
  |       +-> Subscriptions    +-> Paddle
  |       +-> Invoices         +-> Lemon Squeezy
  |       +-> PaymentAttempts  +-> Mercado Pago
  |                            +-> Mock
  |
Provider prices

Provider webhook
     |
verify signature
     |
normalize discriminated event
     |
persist raw provider event/idempotency
     |
Billing reducer
     |
DB state + Sentry + PostHog
     |
Reconciliation worker (safety net)
```

### Boundary rule

Provider adapters may:

- call provider APIs;
- verify webhook authenticity;
- translate provider payloads into typed domain events;
- expose provider capabilities.

Provider adapters must not mutate billing database tables directly and must
not invoke the common webhook handler recursively.

The billing domain service owns:

- authorization-facing orchestration;
- customer identity lookup/creation;
- plan/price resolution;
- prevention of duplicate paid subscriptions;
- local provisional state where required by a provider;
- provider calls;
- domain persistence.

The billing reducer owns deterministic state transitions from normalized
events.

## 4. Provider-neutral types

### Provider names

```ts
export type ProviderName = 'mock' | 'stripe' | 'paddle' | 'lemonsqueezy' | 'mercadopago';
```

### Capabilities

```ts
export interface ProviderCapabilities {
  customerPortal: boolean;
  cancelImmediately: boolean;
  cancelAtPeriodEnd: boolean;
  updatePaymentMethod: boolean;
  changePlan: boolean;
  pauseSubscription: boolean;
}
```

Dashboard behavior must derive from these flags; it must not infer
capability from provider name.

### Checkout

```ts
export interface CheckoutParams {
  accountId: string;
  customerEmail: string;
  planSlug: string;
  interval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  url: string;
  externalCheckoutId?: string;
  externalSubscriptionId?: string;
}
```

`customerEmail` is required because Mercado Pago's hosted
pending-preapproval flow requires payer identity and because it is also
useful when creating customer records in other providers.

### Cancellation

```ts
export type CancellationTiming = 'immediate' | 'period_end';

export interface CancelSubscriptionParams {
  externalSubscriptionId: string;
  timing: CancellationTiming;
}
```

If a provider does not support `period_end` natively, `capabilities.cancelAtPeriodEnd`
is `false` until an Iroko-owned scheduler is implemented and proven safe.

Unsupported provider operations are optional methods on `PaymentProvider`;
adapters must not implement fake no-op portal/cancellation methods.
`BillingService` asserts both the capability flag and method presence
before invoking an optional operation.

```ts
export interface PaymentProvider {
  readonly name: ProviderName;
  readonly capabilities: ProviderCapabilities;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  createPortalSession?(params: PortalParams): Promise<{ url: string }>;
  cancelSubscription?(params: CancelSubscriptionParams): Promise<void>;
  verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent | null>;
}
```

## 5. Normalized event model

Replace the broad optional `NormalizedEvent` with a discriminated union.
Each event carries only fields it is allowed to mutate.

```ts
interface BillingEventBase {
  provider: ProviderName;
  externalEventId: string;
  accountId: string;
  raw: unknown;
}

export interface SubscriptionCreatedEvent extends BillingEventBase {
  type: 'subscription_created';
  externalSubscriptionId: string;
  externalPriceId: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  externalCustomerId?: string;
}

export interface SubscriptionUpdatedEvent extends BillingEventBase {
  type: 'subscription_updated';
  externalSubscriptionId: string;
  externalPriceId?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  externalCustomerId?: string;
}

export interface SubscriptionCanceledEvent extends BillingEventBase {
  type: 'subscription_canceled';
  externalSubscriptionId: string;
  canceledAt?: string;
  accessUntil?: string;
}

export interface InvoicePaidEvent extends BillingEventBase {
  type: 'invoice_paid';
  externalSubscriptionId: string;
  externalInvoiceId: string;
  externalPaymentId?: string;
  amountPaid: number;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  paidAt: string;
  hostedUrl?: string;
  pdfUrl?: string;
}

export interface InvoicePaymentFailedEvent extends BillingEventBase {
  type: 'invoice_payment_failed';
  externalSubscriptionId: string;
  externalInvoiceId: string;
  externalPaymentId?: string;
  amountDue?: number;
  currency?: string;
  failureCode?: string;
  failureMessage?: string;
  attemptedAt: string;
}

export interface PaymentRecoveredEvent extends BillingEventBase {
  type: 'payment_recovered';
  externalSubscriptionId: string;
  externalInvoiceId: string;
  externalPaymentId?: string;
  amountPaid?: number;
  currency?: string;
  recoveredAt: string;
}

export type NormalizedBillingEvent =
  | SubscriptionCreatedEvent
  | SubscriptionUpdatedEvent
  | SubscriptionCanceledEvent
  | InvoicePaidEvent
  | InvoicePaymentFailedEvent
  | PaymentRecoveredEvent;
```

### Mutation rules

| Event                    | May change plan                                | May change subscription status                                   | May change period | Writes invoice  | Writes payment attempt |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------- | ----------------- | --------------- | ---------------------- |
| `subscription_created`   | yes, via reverse price mapping                 | yes                                                              | yes               | no              | no                     |
| `subscription_updated`   | only if `externalPriceId` is present and valid | yes                                                              | yes               | no              | no                     |
| `subscription_canceled`  | no                                             | yes                                                              | access only       | no              | no                     |
| `invoice_paid`           | no                                             | no, except explicit recovery policy in reducer                   | no                | yes             | yes                    |
| `invoice_payment_failed` | no                                             | no; provider subscription event is source of subscription status | no                | optional/update | yes                    |
| `payment_recovered`      | no                                             | no; provider subscription event remains status source            | no                | yes/update      | yes                    |

## 6. Data model

### 6.1 `billing.provider_prices`

Relational source of truth for provider price mapping. It replaces runtime
dependence on `billing.plans.provider_ids` JSON.

```sql
create table billing.provider_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references billing.plans(id) on delete cascade,
  provider text not null,
  external_price_id text,
  currency char(3) not null,
  amount integer not null check (amount >= 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, provider, currency)
);

create unique index provider_prices_external_id_unique
  on billing.provider_prices(provider, external_price_id)
  where external_price_id is not null;
```

- Outbound lookup: `(plan slug, interval, provider, currency) -> provider price`.
- Inbound lookup: `(provider, external_price_id) -> Iroko plan`.
- Mercado Pago may use `external_price_id = null` when using an inline
  `auto_recurring` amount rather than a reusable remote plan.

> **Decision (2026-08-19):** `provider_prices.amount` must match
> `billing.plans.price` for the base currency — enforced with a
> trigger/check, not left free to diverge. With only 3 plans (Free/Pro/
> Teams) and no demonstrated business need for per-provider price
> divergence, allowing drift would recreate the exact dual-source-of-truth
> problem Plan 012 exists to eliminate elsewhere. See
> `011-billing-correctness.md` and `011-phase1-core-v2-tasks.md` Task 3.

### 6.2 `billing.customers`

Change uniqueness from one customer per account globally to one identity
per provider:

```sql
unique (account_id, provider)
unique (provider, external_id)
```

`external_id` stores Stripe customer ID, Paddle customer ID, Lemon Squeezy
customer ID, and Mercado Pago identity only when there is a stable provider
customer identifier worth persisting.

### 6.3 `billing.subscriptions`

Add a provider-scoped external identifier constraint:

```sql
create unique index subscriptions_provider_external_id_unique
  on billing.subscriptions(provider, external_subscription_id)
  where external_subscription_id is not null;
```

The local subscription row retains the resolved Iroko `plan_id`; adapters
never send a default plan slug.

### 6.4 `billing.events`

`external_event_id` is required for every normalized event and idempotency
is provider scoped:

```sql
external_event_id text not null
unique (provider, external_event_id)
```

Raw payload is retained for audit/debugging. Do not store secrets such as
webhook signatures or API credentials.

### 6.5 `billing.invoices`

Add `provider text not null` and provider-scoped external invoice identity:

```sql
create unique index invoices_provider_external_id_unique
  on billing.invoices(provider, external_invoice_id)
  where external_invoice_id is not null;
```

### 6.6 `billing.payment_attempts`

```sql
create table billing.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  subscription_id uuid references billing.subscriptions(id) on delete set null,
  invoice_id uuid references billing.invoices(id) on delete set null,
  external_payment_id text,
  external_invoice_id text,
  status text not null check (status in ('failed', 'paid', 'recovered')),
  amount integer,
  currency char(3),
  failure_code text,
  failure_message text,
  attempted_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index payment_attempts_provider_payment_unique
  on billing.payment_attempts(provider, external_payment_id)
  where external_payment_id is not null;
```

If a provider does not expose a stable payment ID, the reducer must derive
a deterministic provider-specific attempt key before insert; do not
generate random idempotency keys for incoming webhooks.

## 7. Provider behavior

### 7.1 Stripe — subsequent provider implementation

- Create or reuse a Stripe Customer and persist its `cus_*` in `billing.customers`.
- Checkout Session uses `mode: 'subscription'`, `customer: cus_*`, and a
  recurring Stripe Price resolved from `billing.provider_prices`.
- Reverse-map subscription item `price.id` to Iroko plan.
- Verify webhooks with Stripe SDK and raw request body.
- Normalize at least: `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.paid`, `invoice.payment_failed`,
  `invoice.payment_action_required` as a failure/action-required signal if
  useful for access/notification policy.
- Customer Portal session receives the persisted Stripe customer ID, never
  Iroko `accountId`.
- Immediate and end-of-period cancellation are native capabilities.
- Stripe Smart Retries/revenue recovery remains authoritative for retry
  scheduling.

### 7.2 Paddle

- Use recurring Paddle Price IDs from `billing.provider_prices`.
- Checkout may be created through a transaction with recurring `price_id`
  and `custom_data.account_id`.
- Store Paddle customer/subscription identifiers from webhook lifecycle.
- Reverse-map Paddle price IDs to Iroko plan.
- Verify `Paddle-Signature` against the raw body; prefer the official Node
  SDK if it keeps the adapter smaller and typed.
- Normalize subscription lifecycle plus transaction payment failure/success
  signals.
- Customer portal sessions are created on demand and never cached.
- Immediate and next-billing-period cancellation are native capabilities.
- Paddle recovery settings own payment retries/dunning.

### 7.3 Lemon Squeezy

- Map Iroko plan to Lemon Squeezy Variant ID in `billing.provider_prices`.
- Create hosted checkout with `checkout_data.custom.account_id`.
- Verify HMAC-SHA256 `X-Signature` on the exact raw body.
- Normalize: subscription created/updated/cancelled/expired; payment
  success/failed/recovered.
- `cancelled` is not final loss of access. Access remains through `ends_at`;
  `expired` is final end-of-term state.
- Portal URLs are generated fresh on click; never cache signed portal URLs.
- Lemon Squeezy owns dunning/retries.

### 7.4 Mercado Pago — reference launch provider

The current adapter's `preapproval_plan_id` + `status: pending` creation
path must be replaced.

Recommended v2 MVP:

- Use the hosted pending-preapproval flow without an associated preapproval
  plan.
- Build `auto_recurring` from the Iroko provider price: frequency,
  frequency type, transaction amount, currency.
- Send `reason`, `external_reference = accountId`, `payer_email`,
  `back_url`, and `status: 'pending'`.
- Persist the returned preapproval ID as a local incomplete subscription
  before redirect, preserving the selected Iroko `plan_id`.
- Normalize `subscription_preapproval` and `subscription_authorized_payment`
  webhooks.
- Treat Mercado Pago retry behavior as provider-owned.
- Immediate cancellation uses provider API.
- Set `cancelAtPeriodEnd: false` capability for MVP. Do not fake deferred
  cancellation by changing local DB state while the provider remains
  authorized.
- A later scheduler may offer end-of-period cancellation only if it calls
  Mercado Pago at the correct paid-through boundary and verifies provider
  success before changing local state.

## 8. Checkout orchestration

`BillingService.startCheckout()` must execute in this order:

1. authorize owner/admin using existing application flow;
2. load account billing overview;
3. if there is an active/trialing/past_due paid subscription, reject with
   `active_paid_subscription_exists`;
4. resolve provider and capabilities;
5. resolve internal plan and provider price;
6. resolve/create provider customer if the provider model requires it;
7. call provider checkout;
8. persist provisional state only when the provider returns a subscription
   identifier before payment (Mercado Pago flow);
9. emit `checkout_started` to PostHog after a successful provider API
   response;
10. redirect to returned hosted URL.

Changing plan is a separate future domain operation; it must not be
implemented by starting another checkout.

## 9. Webhook processing

`handleProviderWebhook()` must:

- resolve the provider;
- verify signature and normalize event;
- return 400 `invalid_signature` for unauthenticated payloads;
- persist/process through reducer with `(provider, externalEventId)`
  idempotency;
- never supply default plan/status/period/external subscription IDs;
- capture unexpected processing errors in Sentry and return 500 so the
  provider may retry;
- emit PostHog/notification side effects only after a non-duplicate
  committed domain transition.

Do not recursively pass synthetic internal events through provider webhook
verification.

## 10. Access policy

Provider payment retry state does not automatically mean immediate access
loss.

Default v2 access policy:

- `trialing` and `active`: access granted.
- `past_due`: access remains while provider is attempting recovery, unless
  a product-specific grace rule is added later.
- `unpaid`: access denied.
- `canceled` with future `access_until`/`current_period_end`: access
  through that time.
- `canceled` without future paid-through date: access denied.
- `paused`: access denied unless a future plan explicitly defines pause
  semantics.
- `incomplete`: paid entitlements not granted.

The entitlement layer must consume domain status/paid-through data, not
provider names.

## 11. Observability

### Sentry

Capture unexpected billing processing exceptions with:

- tags: `billing_provider`, `billing_event_type`, `billing_operation`;
- extras/context: external event/subscription/invoice IDs when useful;
- never attach webhook signatures, API keys, card data, or full provider
  payloads containing PII.

### PostHog

Server-side normalized events: `checkout_started`, `subscription_activated`,
`subscription_payment_failed`, `subscription_payment_recovered`,
`subscription_cancel_requested`, `subscription_canceled`,
`billing_reconciliation_drift`.

Common properties: `provider`, `plan_slug` when known, `interval` when
known, account ID through existing project conventions, and deterministic
insert ID where available.

### Logging

Use project logger only; no `console.log`. Financial errors must include an
action name and provider but no credentials/PII.

## 12. Reconciliation

Webhooks are primary. Reconciliation is the safety net.

A scheduled worker scans non-terminal subscriptions in bounded batches,
fetches remote provider state, and compares: customer ID; subscription ID;
provider price/plan mapping; status; current period end / access-through
date; cancellation state.

Safe deterministic differences may be repaired through the same
reducer/domain transition functions. Dangerous ambiguity is logged +
captured to Sentry and emits `billing_reconciliation_drift` rather than
guessing.

If implemented with Vercel Cron: endpoint requires
`Authorization: Bearer ${CRON_SECRET}`; production only; do not assume
automatic retries; verify the project's Vercel plan before relying on
sub-daily precision.

## 13. Security and Supabase constraints

- All schema changes are written manually in `supabase/migrations/` because
  `supabase db diff` is broken in the project's Windows workflow.
- Every schema change is mirrored in `supabase/schemas/*.sql` in the same
  commit.
- Use `(select auth.uid())` in RLS/authorization SQL, never naked
  `auth.uid()`.
- Any `SECURITY DEFINER` function must set `search_path = ''` and must be
  `REVOKE ... FROM PUBLIC`, then selectively granted.
- Billing tables remain protected from direct client mutation; application
  writes go through narrow server-side/admin/RPC boundaries.
- Never expose service role or provider secrets to `NEXT_PUBLIC_*`
  variables.

## 14. Release gates

A provider is not considered production-ready until all are true:

- credentials/env validation exists;
- real test-mode checkout succeeds;
- provider price reverse mapping succeeds;
- webhook signature verification is tested using provider-realistic
  signing;
- created/updated/canceled subscription lifecycle persists correctly;
- successful payment persists invoice/payment attempt;
- failed payment persists attempt and observability event;
- cancellation semantics match provider behavior;
- webhook replay is idempotent under `(provider, event)`;
- external customer/subscription/invoice/payment IDs are stored with
  provider namespace;
- UI uses provider capabilities;
- real sandbox E2E evidence is captured in the PR description;
- `pnpm typecheck && pnpm lint` pass before every commit;
- relevant Vitest/pgTAP/E2E tests pass before merge.

## 15. Delivery strategy

Implement in this dependency order:

1. Billing Core v2.
2. Mercado Pago redesign/hardening and sandbox certification as the LATAM
   reference provider.
3. Stripe certification as a subsequent provider implementation.
4. Paddle adapter.
5. Lemon Squeezy adapter.
6. Reconciliation + observability release hardening.

Mercado Pago is the launch reference because its credentials are available and
it is the nearer LATAM path. This changes delivery order, not the
provider-neutral Core v2 contract or any provider's release gate: Mercado Pago
still requires a real sandbox lifecycle and confirmed provider-side
cancellation before enablement. Stripe remains an independently certified
provider once its test credentials are available.

Do not implement Paddle/Lemon Squeezy on top of the current broad
event/RPC contract; doing so would multiply the known core defects across
four providers.

## 16. Official provider documentation checked on 2026-08-18

Re-open these pages immediately before implementing each provider because
billing APIs evolve.

**Stripe**

- Subscription webhooks and payment failures: https://docs.stripe.com/billing/subscriptions/webhooks
- Create Customer Portal Session: https://docs.stripe.com/api/customer_portal/sessions/create
- Checkout subscriptions: https://docs.stripe.com/payments/checkout/build-subscriptions

**Paddle**

- Verify webhook signatures: https://developer.paddle.com/webhooks/about/signature-verification/
- Cancel subscription: https://developer.paddle.com/api-reference/subscriptions/cancel-subscription/
- Customer portal sessions: https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session/
- Subscription past due/recovery: https://developer.paddle.com/webhooks/subscriptions/subscription-past-due/

**Lemon Squeezy**

- Create checkout: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
- Pass custom checkout data: https://docs.lemonsqueezy.com/help/checkout/passing-custom-data
- Sign webhook requests: https://docs.lemonsqueezy.com/help/webhooks/signing-requests
- Webhook event types: https://docs.lemonsqueezy.com/help/webhooks/event-types
- Customer Portal: https://docs.lemonsqueezy.com/guides/developer-guide/customer-portal
- Subscription object / signed URLs: https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object

**Mercado Pago**

- Use the Chile documentation where possible because this project is being
  developed for a Chilean user/business context; confirm production
  account/currency availability before enabling a plan.
- Subscriptions overview/retries: https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/overview
- Associated-plan flow: https://www.mercadopago.com.br/developers/en/docs/subscriptions/integration-configuration/subscription-associated-plan
- Pending payment without associated plan: https://www.mercadopago.cl/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
- Subscription management: https://www.mercadopago.cl/developers/en/docs/subscriptions/subscription-management

**Supabase / Vercel operational checks**

- Supabase changelog: https://supabase.com/changelog
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Vercel Cron security: https://vercel.com/docs/cron-jobs/manage-cron-jobs
