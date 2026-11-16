# Plan 011 Billing Family — Deferred

The earlier freeze scope was satisfied for its recorded candidate. Implemented
and verified evidence remains valid only for its recorded scenario and date.
Remaining provider and operational scenarios are deferred; they are not
erased, completed or implied by the freeze decision.

Current bridge2026-11-13: [016](../../active/016-nextjs-supabase-code-review.md)
remains active. Billing is enabled; separating payment gateways into this family
does not remove the offered checkout/callback obligations. The current candidate
needs applicable real-provider evidence or an explicit bounded reuse decision.
The authorized MP-01 retry opens at most one pending hosted checkout and stops
before provider login/payment; it cannot certify a purchase, callback, recurring
worker or another gateway. Owner: billing/maintainer; return through the existing
Chile acceptance matrix with a named sandbox scenario and specific authorization.
No new payment plan, provider rollout, card or charge is authorized here.

Update2026-11-16: PR252/main118fedf is READY. MP-01 run43933678786 passed
hosted-checkout opening, stopping before provider login/payment, with one new
persisted intent and no published artifacts. This supersedes the earlier
MP-01 bootstrap failure, without certifying purchase, callback or financial
worker recovery. Billing remains enabled and its evidence obligations remain.

This directory preserves the Plan 011 design, task breakdown, Mercado Pago
acceptance matrices and operational follow-ups. Use each document's own
evidence boundary; the directory location does not certify a provider or
authorize provider, production or Cloud operations.

## Documents

- [Billing correctness and platform scope](011-billing-correctness.md)
- [Mercado Pago reliability roadmap](011-mercadopago-reliability-roadmap.md)
- [Mercado Pago v1 Chile acceptance](011-mercadopago-v1-chile-acceptance.md)
- [Phase 1 — core v2](011-phase1-core-v2-tasks.md)
- [Phase 2 — Mercado Pago](011-phase2-mercadopago-tasks.md)
- [Phase 3 — Stripe certification](011-phase3-stripe-certification-tasks.md)
- [Phase 4 — Paddle](011-phase4-paddle-tasks.md)
- [Phase 5 — Lemon Squeezy](011-phase5-lemon-squeezy-tasks.md)
- [Phase 6 — reconciliation](011-phase6-reconciliation-tasks.md)
- [011a — payment health and paid-through](011a-mercadopago-payment-health-paid-through.md)
- [011b — checkout resolution](011b-mercadopago-checkout-resolution.md)
- [011c — financial anomalies](011c-mercadopago-financial-anomalies.md)
- [011d — invoice discovery and reconciliation](011d-mercadopago-invoice-discovery-reconciliation.md)
- [011e — worker rollout](011e-mercadopago-worker-rollout.md)
- [011f — internal acceptance](011f-mercadopago-internal-acceptance.md)
- [011g — refund ingress](011g-mercadopago-refund-ingress.md)

For current direction and evidence, return to the
[MVP freeze roadmap](../../../../ROADMAP.md) and
[current state](../../../current-state.md).
