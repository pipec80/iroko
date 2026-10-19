# ADR 0004: CSP nonce and rendering boundary

- Status: Accepted
- Date: 2026-10-15
- Plan: [012.4 — CSP and secrets](../exec-plans/completed/012-4-csp-and-secrets.md)

## Context

The current script policy permits inline scripts. Removing that permission must
preserve Next.js hydration, locale routing, theme initialization, CAPTCHA and
existing observability consumers. A nonce policy also affects document rendering
and shared HTML caching; security headers alone do not establish compatibility.

## Options considered

1. Keep the existing inline script permission. This avoids rendering changes
   but retains the script-execution allowance that Plan 012.4 aims to remove.
2. Use hashes for allowed inline scripts. This would require a stable inventory
   and verified integration for framework-generated and changing script content;
   that capability has not been established in this repository.
3. Generate a nonce per server-rendered document and propagate it consistently
   through the framework and explicit script consumers.

## Decision

Choose option 3 as the local implementation design, conditional on the task 1
rendering baseline and task 5 acceptance gate. Generate a cryptographically
random 16-byte nonce in `src/proxy.ts`; overwrite client-supplied nonce/CSP
headers and keep request and response policies coherent. Do not create
`middleware.ts`.

Server rendering supplies the nonce to Next.js, theme initialization and the
client nonce provider used by CAPTCHA. Client navigation, prefetch and server
actions must retain the nonce of the live document, rather than replacing it
with a nonce from a later RSC response. Preserve locale/auth headers, cookies,
redirects and existing session cache protections.

Production `script-src` removes `unsafe-inline` and `unsafe-eval`, initially
retaining existing origin allowlists without introducing `strict-dynamic`.
`style-src 'unsafe-inline'` remains an explicit exception. CSP reporting follows
the configured Sentry DSN and is disabled without that DSN or during local
validation; local acceptance must not send real provider events.

## Consequences and review gate

- Nonce-bearing HTML requires request-time rendering and must not enter a
  shared HTML cache. Static rendering and shared-cache benefits may be reduced.
- Task 1 must record the actual static/dynamic route matrix and build sizes.
  Before global adoption, compare the proposed rendering behavior against that
  baseline. If static routes would become dynamic, stop that change for review
  with the concrete impact; do not silently adopt partial coverage.
- Evaluate resource and caching impact within the existing Free services.
  Insufficient capacity does not authorize paid upgrades or new resources.
- Browser acceptance must cover normal and error/not-found documents, all four
  locales, hydration, navigation, theme, late CAPTCHA mounting and observability
  gates, including paths excluded by the existing proxy matcher.

## Acceptance boundary

Acceptance records the approved local design and its review conditions. It does
not establish implementation, complete document coverage, runtime behavior,
measured capacity or Cloud parity: those remain **[NO VERIFICADO]** until dated
evidence is recorded. Global CSP adoption remains conditional on the baseline.
Cloud changes, deployment, push and merge require separate explicit authorization.
No existing ADR is superseded.
