# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |

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

### Response timeline

| Step                   | Time                                                       |
| ---------------------- | ---------------------------------------------------------- |
| Initial acknowledgment | Within 48 hours                                            |
| Severity assessment    | Within 5 business days                                     |
| Fix deployed           | Depends on severity (critical: 24h, high: 7d, medium: 30d) |
| Credit (if desired)    | In the release notes                                       |

## Security Architecture

This project implements multiple layers of security:

- **Database**: Row Level Security (RLS) on all tables, SECURITY DEFINER RPCs with `SET search_path = ''`
- **Auth**: Supabase Auth with MFA (TOTP; WebAuthn/phone available on Pro). MFA is enforced at the edge — a user with an enrolled factor cannot reach protected routes until the session is elevated to `aal2`.
- **Sessions**: session timebox and inactivity timeout are configured but require the Supabase **Pro** plan; on the Free plan they are `0s` (disabled). Enable them (7d / 2h) in `supabase/config.toml` after upgrading. See the "Free tier — la verdad" section of `ROADMAP.md`.
- **Leaked password protection**: HaveIBeenPwned checking on signup/password-change requires the Supabase **Pro** plan (Dashboard → Authentication → Sign In / Providers). Disabled on the Free plan — no local config equivalent.
- **Headers**: strict CSP (`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`) with `'unsafe-inline'` on `script-src` — per-request nonces are intentionally **not** used because they are incompatible with statically-generated pages. HSTS (2 years + preload), COOP, CORP.
- **Rate limiting**: write requests to the Data API are capped per client IP (resolved from the un-spoofable `cf-connecting-ip` header) via a `db_pre_request` hook.
- **Input validation**: Zod schemas on all server actions and API boundaries
- **Secrets**: No secrets in client bundle, all server-side via validated env vars

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
