# Security Policy

## Supported Versions

Iroko es actualmente una base interna y no publica todavía una versión con SLA
de soporte para terceros. La rama activa recibe mantenimiento para los
proyectos propios; una política de versiones soportadas se definirá si se
aprueba su distribución comercial.

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Iroko, report it privately:

**Email:** felipe.castro@zgroup.cl  
**Subject:** `[SECURITY] <brief description>`

### What to include

- Description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept if possible)
- Affected component (auth, RLS policies, API, etc.)
- Your suggested fix (optional but appreciated)

### Response targets

Mientras el proyecto sea interno, estos son objetivos operativos y no un SLA
público o contractual:

| Step                   | Time                                                       |
| ---------------------- | ---------------------------------------------------------- |
| Initial acknowledgment | Within 48 hours                                            |
| Severity assessment    | Within 5 business days                                     |
| Fix deployed           | Depends on severity (critical: 24h, high: 7d, medium: 30d) |
| Credit (if desired)    | In the release notes                                       |

## Security Architecture

The repository implements multiple security layers, but this list is not a
certification or proof of current production health. The completed P0
tenant-isolation remediation is recorded in
[Plan 010](docs/exec-plans/completed/010-tenant-isolation-and-regression-tests.md),
and additional hardening is tracked in
[Plan 012](docs/exec-plans/active/012-security-hardening-and-pricing-truth.md).

- **Database**: Row Level Security (RLS) on all tables, SECURITY DEFINER RPCs with `SET search_path = ''`
- **Auth**: Supabase Auth with MFA (TOTP; WebAuthn/phone available on Pro). MFA is enforced at the edge — a user with an enrolled factor cannot reach protected routes until the session is elevated to `aal2`.
- **Sessions**: session timebox and inactivity timeout are `0s` (disabled) in `supabase/config.toml`, consistent with the declared Free baseline. Their provider capability and any future change require separate verification and authorization; [Plan 012](docs/exec-plans/active/012-security-hardening-and-pricing-truth.md) owns the pricing/security reconciliation.
- **Leaked password protection**: HaveIBeenPwned checking on signup/password-change requires the Supabase **Pro** plan (Dashboard → Authentication → Sign In / Providers). Disabled on the Free plan — no local config equivalent.
- **Headers**: local Plan 012.4 code uses a fresh 16-byte nonce per request and propagates it to document rendering, theme and CAPTCHA. Production `script-src` omits `unsafe-inline`/`unsafe-eval`; `style-src 'unsafe-inline'` remains an explicit exception. Nonce-bearing documents use request-time rendering and private/no-store caching. HSTS (2 years + preload), COOP and CORP remain. [ADR 0004](docs/adr/0004-csp-nonce-and-rendering-boundary.md) records the trade-off; isolated local Chromium acceptance passed, while real Turnstile and Cloud acceptance remain **[NO VERIFICADO]**.
- **Rate limiting**: the Data API hook and application API admission have separate contracts. Plan 012.3 recorded bounded application acceptance; legacy CF/XFF trust in the SQL hook remains **[NO VERIFICADO]**, as recorded in its [follow-up register](docs/audits/2026-10-14-plan-012-3-follow-ups.md).
- **Input validation**: Zod schemas on all server actions and API boundaries
- **Secrets**: server secrets are validated in `src/env.ts`. Impersonation return cookies use a dedicated key and strict session-bound v2 envelope. Mock billing uses its own strong secret, canonical signed tokens and disjoint checkout/event schemas; every production mock consumer requires explicit opt-in regardless of the default provider. Sentry build uploads require a trusted context and explicit authorization; token presence alone does not enable them.

Plan 012.4 implementation and dated local checks are recorded in the
[hardening audit](docs/audits/2026-10-15-plan-012-4-local-hardening.md). These
changes have not established Cloud parity or deployment acceptance. The
[impersonation recovery/rotation runbook](docs/modules/impersonation.md#recovery-and-dedicated-key-rotation-runbook)
requires directed owner closure before invalidating active return cookies.
Mock checkout tokens remain bearer tokens without TTL/jti or one-time-use
protection; stricter parsing does not claim replay prevention.

## Scope

### In scope

- Authentication and session management
- Authorization / RLS bypass
- Injection attacks (SQL, XSS, CSRF)
- Sensitive data exposure
- Broken access control between tenants

### Out of scope

- Denial of service attacks requiring significant resources
- Social engineering
- Issues in third-party services (Supabase, Vercel, Sentry)
- Vulnerabilities in development-only dependencies
