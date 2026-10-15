# Next.js 16.4.1 security update — 2026-10-15

## Outcome

The local dependency tree now pins `next`, `@next/bundle-analyzer`, and
`eslint-config-next` to `16.4.1`. The Next workspace override is aligned to the
same version. This addresses the two critical Next advisories published on
2026-10-14: unauthenticated RCE in Cache Components returning multiple typed
arrays and unauthenticated RCE in image optimization with SVGs on glibc Linux.
The release also includes a high severity Server Actions denial-of-service
fix. See the [Next 16.4.1 release](https://github.com/vercel/next.js/releases/tag/v16.4.1),
[Cache Components advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr),
and [SVG image optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).

The repository had no `use cache` directives and has `cacheComponents: false`
in `next.config.ts` at review time. Production image optimization remains
enabled. `sharp` is pinned to `0.35.5`, which the SVG advisory names as a
workaround; the Next patch is still applied as the durable fix. No auth code,
Supabase schema, or route contract changed.

## Dependency changes

- `package.json`: pin `next`, `@next/bundle-analyzer`, and `eslint-config-next`
  to `16.4.1`.
- `pnpm-workspace.yaml`: align the Next override and narrowly allow the exact
  Next 16.4.1 release artifacts through the configured release-age delay, so
  the security fix can be installed immediately.
- `pnpm-lock.yaml`: refresh the exact dependency graph and prune unreferenced
  lock entries.
- Plan 012.4 records the current Next baseline as `16.4.1`; its security work
  remains pending and separately scoped.

## Local verification

Executed on 2026-10-15:

- `pnpm install --frozen-lockfile` — passed; Next 16.4.1 packages installed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed with five existing warnings: one relative navigation
  warning and four non-null assertions in the Mercado Pago cloud acceptance
  test.
- `pnpm test` — passed, 112 test files and 1,281 tests.
- `pnpm build` in the repository — compiled with Next 16.4.1 and completed
  TypeScript, then failed environment validation because the existing local
  environment file supplies invalid values for this non-Cloud validation
  context.
- A sanitized copy excluding `.env.local` was then built with direct
  `next build --webpack` and fake local-only environment values — passed through
  all 120 static pages. The Webpack build reports existing critical-dependency
  warnings from `require-in-the-middle` in the Sentry/OpenTelemetry chain. The
  normal Turbopack build could not run from the external scratch copy because
  the scratch harness symlinks `node_modules` outside its filesystem root.
- `pnpm audit --prod --audit-level=high` — passed, no known production
  vulnerabilities.
- Full `pnpm audit --audit-level=high` — one high advisory remains for
  development-only `braces <=3.0.3`, reached through ESLint, next-sitemap, and
  shadcn. The [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  currently lists no patched version, so no override was invented. Recheck
  when upstream publishes a fix.
- Prettier check for `package.json`, `pnpm-workspace.yaml`, and
  `pnpm-lock.yaml` — passed.
- `node scripts/check-docs.mjs` — passed, 147 Markdown files.

## Acceptance boundary

This is local dependency and build evidence only. Auth-specific E2E against the
official local Supabase stack, GitHub Actions, Dependabot alert refresh, Cloud
state, and deployment were not checked in this task. No Cloud write, push,
merge, or deploy was performed. The GitHub alerts can remain visible until
Dependabot rescans the updated branch or its PR is integrated.
