# Contributing to Iroko

This is a proprietary project. External contributions are by invitation only.

## Setup

```bash
# 1. Clonar el repo
git clone <repo-url>
cd saasboilerplate

# 2. Instalar dependencias
pnpm install

# 3. Variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 4. Levantar Supabase local
pnpm supa:start

# 5. Dev server
pnpm dev
```

## Workflow

```
main
 └── fix/nombre-del-fix
 └── feat/nombre-del-feature
 └── refactor/nombre-del-refactor
```

1. Crea un branch desde `main` con el prefijo correcto
2. Haz commits usando [Conventional Commits](https://www.conventionalcommits.org/)
3. Abre un Pull Request — el template te guía con el checklist
4. El CI debe estar verde antes del merge

## Commits

```
feat: add stripe webhook handler
fix: resolve session refresh race condition
chore: update dependencies
refactor: extract auth logic to shared module
test: add edge cases for cart total
docs: document RPC signatures
```

Breaking changes: añadir `!` → `feat!: redesign auth API`

## Code standards

- **TypeScript strict** — `any` prohibido, usar `unknown` + narrowing
- **No `console.log`** — usar `logger` de `src/lib/logger.ts`
- **No `middleware.ts`** — toda la lógica de edge va en `src/proxy.ts`
- **Nuevas env vars** — declarar en `src/env.ts` con validación Zod
- **Nuevas mutaciones** — validar con Zod antes de tocar Supabase
- **Nuevas tablas** — RLS obligatorio + tests pgTAP en `supabase/tests/`

## Tests

```bash
pnpm test              # unit tests
pnpm test:coverage     # coverage report
pnpm supa:test         # database tests (pgTAP)
pnpm test:e2e          # E2E (requiere dev server)
```

## Seguridad

Si encuentras una vulnerabilidad, **no abras un issue público**.
Revisa [SECURITY.md](SECURITY.md) para el proceso de reporte responsable.
