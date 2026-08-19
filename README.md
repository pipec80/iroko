# Iroko — SaaS Boilerplate

Base de producción para micro-SaaS. Auth completa, multi-tenancy, i18n, observabilidad y CI/CD listo para desplegar.

## Stack

| Capa            | Tecnología                                        |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js 16 (App Router, React 19, React Compiler) |
| Backend / Auth  | Supabase (PostgreSQL, RLS, RPCs, MFA, OAuth)      |
| Estilos         | Tailwind CSS 4 + Material Design 3 tokens         |
| i18n            | next-intl (en / es / pt / fr)                     |
| Estado servidor | TanStack Query 5                                  |
| Observabilidad  | Sentry, Vercel Analytics, Vercel Speed Insights   |
| Tests           | Vitest (unit) + Playwright (E2E) + pgTAP (DB)     |
| Deploy          | Vercel (pipec80-labs/iroko)                       |

## Requisitos

- Node.js 24+
- pnpm 11+
- Docker Desktop (para Supabase local)
- Cuenta Supabase (para producción)

## Setup local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase local

# 3. Levantar Supabase local (requiere Docker)
pnpm supa:start

# 4. Arrancar dev server
pnpm dev
```

Abre http://localhost:3000 — el dashboard de Supabase Studio está en http://localhost:54323.

## Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_SECRET_KEY=<service-role-key>

# Site
SITE_URL=http://localhost:3000

# Sentry (opcional en dev)
NEXT_PUBLIC_SENTRY_DSN=<dsn>
SENTRY_AUTH_TOKEN=<auth-token>

# OAuth Google
GOOGLE_CLIENT_ID=<client-id>
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<client-secret>
```

## Scripts

```bash
pnpm dev              # Dev server con Turbopack
pnpm build            # Build de producción
pnpm typecheck        # TypeScript sin emit
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm test             # Tests unitarios (Vitest)
pnpm test:coverage    # Tests con reporte de cobertura
pnpm test:e2e         # Tests E2E (Playwright)

pnpm supa:start       # Iniciar Supabase local
pnpm supa:stop        # Detener Supabase local
pnpm supa:test        # Tests de base de datos (pgTAP)
pnpm supa:lint        # Lint de esquema SQL
pnpm supa:gen:types   # Regenerar src/types/database.ts
```

## Estructura

```
src/
├── app/
│   ├── layout.tsx              # Root layout (metadata, CSS global)
│   └── [locale]/               # Rutas con prefijo de idioma
│       ├── layout.tsx          # html/body + fonts + providers
│       ├── (public)/           # Landing, pricing, product
│       ├── (auth)/             # Login, signup, forgot, reset
│       ├── auth/               # Callbacks OAuth y OTP
│       └── dashboard/          # Zona protegida (sidebar + topbar)
├── components/
│   ├── ui/                     # Primitivos (shadcn/radix)
│   ├── layout/                 # Sidebar, topbar, navbar
│   └── dashboard/              # Componentes por módulo
├── lib/
│   ├── supabase/               # Clientes server/client/admin
│   ├── validation/             # Schemas Zod
│   └── auth/                   # safe-redirect
└── types/
    └── database.ts             # Tipos generados de Supabase
supabase/
├── migrations/                 # 38+ migraciones SQL
├── schemas/                    # Declarative schema (source of truth)
├── templates/                  # Email templates
└── tests/database/             # Tests pgTAP
```

## Documentación

Versionada en el repo — ver `docs/index.md` para el índice completo:

- `docs/audits/` — auditorías de plataforma con hallazgos y evidencia de cierre
- `docs/exec-plans/` — planes de estabilización activos y completados
- `docs/runbooks/` — guías operativas paso a paso
- `docs/quality/` — Definition of Done y estrategia de testing
- `docs/design-system/` — patrón HTML/CSS de referencia para pantallas nuevas

`docs/estado-fases.md`, `docs/modules/` y `docs/local/` son notas de desarrollo
privadas del mantenedor original (gitignored) — no existen en un checkout
limpio de este boilerplate.
