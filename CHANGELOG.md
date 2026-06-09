# Changelog

All notable changes to Iroko are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

---

## [Unreleased]

### Security

- Update Next.js 16.2.4 → 16.2.7 (closes CVE proxy bypass, SSRF, DoS in Cache Components)
- Update @vitest/browser 4.1.5 → 4.1.8 (closes otelCarrier XSS in devDep)
- Update next-intl 4.9.1 → 4.13.0 (closes icu-minify moderate vuln)
- Anti-enumeration: `signUpAction` returns generic confirmation for existing emails (F3-02)
- `createDocument`: derive `accountId` server-side via RPC, never from client input (F2-01)
- UUID validation on `saveDocument` and `revokeSessionAction` before Postgres round-trip (F2-02)
- `get_account_subscription` RPC: add membership check via `private.user_is_member()` (F2-03)

### Added

- GitHub Actions CI pipeline: 4 parallel jobs (quality / security / test / build)
- Vitest coverage config with 20% thresholds
- Auth actions unit tests: 13 cases covering anti-enum and MFA flow
- Vercel Analytics and Speed Insights in root layout
- Sentry integration: DSN in env.ts, `captureException` in all 3 error boundaries
- `withSentryConfig` wrapper in next.config.ts (org: iroko, source maps)
- `vercel.json` with cache headers for auth routes and static assets
- Loading skeletons for projects, reports, billing, and operations routes
- Skip-to-content accessibility link in locale layout
- `LICENSE` (Proprietary), `SECURITY.md`, `CONTRIBUTING.md`
- GitHub templates: PR template, bug report, feature request
- Dependabot for weekly npm + monthly GitHub Actions updates

### Changed

- `<html lang>` is now dynamic per locale (was hardcoded `"es"`)
- Move `html/body` to `[locale]/layout.tsx` — root layout is now minimal
- Extract `strongPassword` Zod schema to `lib/validation/shared.ts` (DRY)
- Replace `process.env.SITE_URL` with `env.SITE_URL` in all server-side code
- Google OAuth `client_id` moved from hardcoded to `env(GOOGLE_CLIENT_ID)` in config.toml
- Remove `/es/` locale prefix from all 5 email templates
- `resendConfirmationAction`: replace `typeof` check with `emailSchema.safeParse()`
- Rewrite README.md with project name, stack, setup guide, and scripts

### Removed

- Unused production dependencies: `ai`, `jose`, `react-hook-form`, `@hookform/resolvers`, `zustand`, `nanoid`

---

> **Note:** This project uses [conventional commits](https://www.conventionalcommits.org/).
> Future releases will be auto-generated from the commit history.
