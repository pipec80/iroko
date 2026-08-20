# Architecture

Durable technical decisions and system-level design documentation for Iroko —
the "what and why" that doesn't change with every audit finding. Distinct
from `docs/exec-plans/` (bounded, time-boxed implementation plans) and from
`docs/local/` (working notes, drafts, superseded audits).

## Documents

- [System overview](system-overview.md) — context, building blocks, runtime
  boundaries, and a change map.
- [Billing Platform v2 design](billing-platform-v2-design.md) — target billing
  domain and provider architecture; its active implementation status is owned
  by Plan 011.

Use an [ADR](../adr/) for a significant decision and an
[execution plan](../exec-plans/) for bounded implementation work. Architecture
documents describe the durable system; they do not prove runtime health or
plan completion.
