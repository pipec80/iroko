# AGENTS.md

This is the shared, tool-neutral contract for humans and coding agents working
in this repository. Tool-specific adapters may add instructions, but they must
not contradict this file.

## Project identity

Iroko is a reusable SaaS core built first for pipec's own products, with the
engineering quality and commercial optionality to become a distributable
boilerplate later. It is not yet documented or accepted as an installable
customer product.

## Read order and authority

Before changing the repository:

1. Read `docs/index.md` and `docs/current-state.md`.
2. Read the relevant architecture document or accepted ADR.
3. For approved work, read the active execution plan and its acceptance criteria.
4. Before writing or changing tests, read `TESTING-PLAN.md`.

When sources conflict, use this order:

1. executable code;
2. tests;
3. configuration and migrations;
4. `docs/current-state.md`;
5. accepted ADRs and current architecture;
6. active execution plans;
7. `ROADMAP.md`;
8. audits and completed plans;
9. ignored/local documents.

Mark unavailable runtime or Cloud evidence as `[NO VERIFICADO]`; documented
intent is not proof of implementation or operational health.

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
- **Tailwind CSS 4** with shadcn semantic tokens and the implemented Iroko palette
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

All routes are prefixed with locale (`/es/`, `/en/`, `/pt/`, `/fr/`). Default
locale is `es`.

### Critical: No middleware.ts

**All edge logic lives in `src/proxy.ts`**, not `middleware.ts`. This is intentional — `middleware.ts` causes Turbopack crashes. The proxy file:

- Runs next-intl locale routing
- Builds the Content Security Policy and other security headers
- Adds security headers (X-Frame-Options, X-Content-Type-Options, etc.)

Never create a `middleware.ts` file. When adding edge logic, extend `src/proxy.ts`.

### i18n

- Locales: `en`, `es`, `pt`, `fr` (default: `es`)
- Message files: `messages/en.json`, `messages/es.json`, `messages/pt.json`,
  `messages/fr.json`
- Use typed navigation from `@/i18n/routing`: `Link`, `useRouter`, `redirect`, `usePathname`
- All page params are Promises in Next.js 16: `params: Promise<{ locale: string }>`

### Environment variables

Defined and validated in `src/env.ts` using `@t3-oss/env-nextjs`. Add new vars there before using `process.env`.

Treat `src/env.ts` as the current inventory; do not duplicate its variable list
in documentation that is not generated from the code.

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

### Supabase migrations on Windows

`supabase db diff` is currently disabled for this repository on Windows because
the shadow database cannot rebuild the existing cross-file schema dependencies
in lexical order. Until that limitation is removed and verified:

1. write a versioned migration manually in `supabase/migrations/`;
2. update the corresponding `supabase/schemas/*.sql` file as the human-readable
   mirror in the same change;
3. run the relevant local reset/database tests;
4. regenerate `src/types/database.ts` when the exposed schema changes;
5. verify linked migration state read-only before claiming Cloud parity.

Production or linked Supabase writes always require explicit authorization.

### Styling

Use `cn()` from `@/lib/utils` to merge Tailwind classes and `lucide-react` for
interface icons. The canonical design-system entry point is
`docs/design-system/README.md`; read its `STATUS.md`, guide, agent skill and
tokens before visual work. Poppy, Cobalt, Geist and Geist Mono are the accepted
baseline. `colors_and_type.css` is the design contract, while
`src/app/globals.css` and `src/app/layout.tsx` are the runtime evidence. Treat a
divergence as explicit debt and never invent a third palette. Generated handoff
files and historical previews are not authoritative.

## Code quality rules

- **No `any`** — enforced at error level by `@typescript-eslint`
- **Type-only imports** — use `import type` for types
- **Conventional commits** — enforced by commitlint (`feat:`, `fix:`, `chore:`, etc.)
- **No hardcoded secrets** — `eslint-plugin-no-secrets` with tolerance 5.7
- Pre-commit hooks (Husky + lint-staged) run ESLint + Prettier automatically
- Add JSDoc to exported APIs or non-obvious behavior when it explains contracts,
  side effects or failure modes; do not restate obvious TypeScript signatures.

## Testing

- Vitest config: `vitest.config.ts` — jsdom environment, globals enabled, setup in `src/test/setup.ts`
- Playwright config: `playwright.config.ts` — tests in `src/test/e2e/`, auto-starts dev server on port 3000
- Path alias `@` maps to `src/` in both test configs
- **Test roadmap: `TESTING-PLAN.md`** — per-folder inventory of what needs tests, priorities (P0-P2), conventions (mock patterns, assertion rules), and phase prompts. Read it before writing or modifying tests.

## CLI and MCP preference

- Prefer an installed first-party CLI or a configured MCP for platform operations, diagnostics, and read-only inspection.
- Before declaring a CLI unavailable, verify it with `Get-Command <name> -All`, `where.exe <name>` when applicable, and its version command.
- Treat “installed”, “authenticated”, and “authorized for the current task” as separate facts. Verify each non-destructively and never print secrets.
- Prefer MCP when it provides authenticated structured access; prefer the CLI for repository scripts and local state. Respect the task’s mutation limits regardless of the interface.
- Do not install or update a CLI, plugin, dependency, or MCP server unless the user explicitly requests it.

## Change and completion boundaries

- Begin repository work with `git status`, current branch and relevant source inspection.
- Preserve unrelated user changes and ignored local material.
- Keep implementation work bounded to an approved plan or explicit request.
- Do not push, merge, deploy, modify providers or mutate Cloud resources without
  explicit authorization for that action.
- A plan, prompt, passing focused test or historical audit is not completion
  evidence for a broader feature.
- Before completion claims, run checks proportional to the changed surface and
  report exact commands, results and anything not verified.
