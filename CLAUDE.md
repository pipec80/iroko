# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev            # Start dev server (Turbopack)
pnpm build          # Build for production + generate sitemap
pnpm start          # Run production server
pnpm typecheck      # TypeScript check without emit

# Code quality
pnpm lint           # Run ESLint
pnpm lint:fix       # Auto-fix ESLint issues
pnpm format         # Format with Prettier
pnpm format:check   # Check Prettier formatting
pnpm knip           # Detect unused files/exports

# Testing
pnpm test           # Run Vitest unit tests
pnpm test:ui        # Vitest with browser UI
pnpm test:coverage  # Vitest with coverage report
pnpm test:e2e       # Playwright E2E tests
pnpm test:e2e:ui    # Playwright with interactive UI

# Run a single test file (use partial path — avoids bracket issues on Windows)
pnpm test src/lib/__tests__/server-action         # files outside [brackets] dirs: full path ok
pnpm test "dashboard/account/__tests__/actions"   # files inside [locale]/[slug]: use unique suffix

# Supabase local
pnpm supa:start     # Start local Supabase (requires Docker)
pnpm supa:stop      # Stop local Supabase
pnpm supa:fix-ports # Fix Studio/API ports lost after Windows sleep (Docker Desktop bug)
pnpm supa:gen:types # Regenerate src/types/database.ts from local schema
```

## Architecture

### Stack

- **Next.js 16** App Router, React 19, TypeScript strict mode
- **React Compiler** enabled — no manual `useMemo`/`useCallback`
- **Tailwind CSS 4** with Material Design 3 tokens as CSS variables
- **TanStack Query 5** for server state, **Zustand 5** for client state
- **next-intl 4** for i18n routing and translations
- **Supabase** as backend (database + auth)
- **Sentry** for error tracking, **Pino** for structured server logging
- **Vitest** (unit) + **Playwright** (E2E)

### Route structure

```
src/app/[locale]/
├── (public)/        # Marketing pages — no auth
├── (auth)/          # Login, signup, confirmation
└── dashboard/       # Protected app — sidebar + topbar layout
```

All routes are prefixed with locale (`/es/`, `/en/`). Default locale is `es`.

### Critical: No middleware.ts

**All edge logic lives in `src/proxy.ts`**, not `middleware.ts`. This is intentional — `middleware.ts` causes Turbopack crashes. The proxy file:

- Runs next-intl locale routing
- Injects CSP nonce headers
- Adds security headers (X-Frame-Options, X-Content-Type-Options, etc.)

Never create a `middleware.ts` file. When adding edge logic, extend `src/proxy.ts`.

### i18n

- Locales: `en`, `es` (default: `es`)
- Message files: `messages/en.json`, `messages/es.json`
- Use typed navigation from `@/i18n/routing`: `Link`, `useRouter`, `redirect`, `usePathname`
- All page params are Promises in Next.js 16: `params: Promise<{ locale: string }>`

### Environment variables

Defined and validated in `src/env.ts` using `@t3-oss/env-nextjs`. Add new vars there before using `process.env`.

Current server vars: `NODE_ENV`, `LOG_LEVEL`, `SITE_URL`.

### Logging

Use the logger from `src/lib/logger.ts` (Pino-based):

```ts
import { logger } from '@/lib/logger';
logger.info({ userId, action: 'checkout' }, 'Payment initiated');
```

Typed fields: `userId`, `tenantId`, `requestId`, `action`, `component`. Auto-redacts passwords, tokens, emails, and auth headers in all environments.

### Supabase schemas

Always call `.schema('name')` when querying non-public schemas:

```ts
supabase.schema('private').from('table')...
```

### Styling

Use `cn()` from `@/lib/utils` to merge Tailwind classes. Material Symbols icons are available as a font (not an npm package). Custom fonts: Plus Jakarta Sans (body), IBM Plex Mono (mono).

## Code quality rules

- **No `any`** — enforced at error level by `@typescript-eslint`
- **Type-only imports** — use `import type` for types
- **Conventional commits** — enforced by commitlint (`feat:`, `fix:`, `chore:`, etc.)
- **No hardcoded secrets** — `eslint-plugin-no-secrets` with tolerance 5.7
- Pre-commit hooks (Husky + lint-staged) run ESLint + Prettier automatically

## Testing

- Vitest config: `vitest.config.ts` — jsdom environment, globals enabled, setup in `src/test/setup.ts`
- Playwright config: `playwright.config.ts` — tests in `src/test/e2e/`, auto-starts dev server on port 3000
- Path alias `@` maps to `src/` in both test configs
- **Test roadmap: `TESTING-PLAN.md`** — per-folder inventory of what needs tests, priorities (P0-P2), conventions (mock patterns, assertion rules), and phase prompts. Read it before writing or modifying tests.
