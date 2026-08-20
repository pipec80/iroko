# Iroko — SaaS Foundation

Base SaaS interna y reutilizable para los proyectos de pipec, construida con la
calidad y modularidad necesarias para poder convertirse más adelante en un
boilerplate comercial. Hoy no se presenta como producto instalable, soportado
o listo para clientes.

Antes de trabajar en el repositorio, lee [AGENTS.md](AGENTS.md) y
[docs/current-state.md](docs/current-state.md). El mapa completo de
documentación está en [docs/index.md](docs/index.md).

## Stack

| Capa            | Tecnología                                        |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js 16 (App Router, React 19, React Compiler) |
| Backend / Auth  | Supabase (PostgreSQL, RLS, RPCs, MFA, OAuth)      |
| Estilos         | Tailwind CSS 4 + shadcn + tokens Iroko            |
| i18n            | next-intl (en / es / pt / fr)                     |
| Estado servidor | TanStack Query 5                                  |
| Observabilidad  | Sentry, Vercel Analytics, Vercel Speed Insights   |
| Tests           | Vitest (unit) + Playwright (E2E) + pgTAP (DB)     |
| Deploy objetivo | Vercel + Supabase                                 |

## Requisitos

- Node.js 24+
- pnpm 11+
- Docker Desktop (para Supabase local)
- Cuenta Supabase (para producción)

## Setup local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno (PowerShell)
Copy-Item .env.example .env.local
# Editar .env.local con tus credenciales de Supabase local

# 3. Levantar Supabase local (requiere Docker)
pnpm supa:start

# 4. Arrancar dev server
pnpm dev
```

Abre http://localhost:3000 — el dashboard de Supabase Studio está en http://localhost:54323.

## Variables de entorno

Usa `.env.example` como plantilla y `src/env.ts` como inventario validado y
fuente de verdad. No dupliques aquí una lista que pueda quedar desactualizada.
Las credenciales locales, Cloud y de proveedores nunca se versionan.

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
├── migrations/                 # Historial ejecutable y ordenado de cambios SQL
├── schemas/                    # Espejo legible de la intención actual
├── templates/                  # Email templates
└── tests/database/             # Tests pgTAP
```

## Documentación

Versionada en el repositorio — ver [docs/index.md](docs/index.md) para el orden
de lectura, autoridad y ciclo de vida:

- `docs/current-state.md` — estado vigente, prioridades y evidencia
- `docs/architecture/` y `docs/adr/` — límites y decisiones duraderas
- `docs/audits/` — auditorías de plataforma con hallazgos y evidencia de cierre
- `docs/exec-plans/` — trabajo activo y registros de planes completados
- `docs/runbooks/` — guías operativas paso a paso
- `docs/quality/` — Definition of Done y estrategia de testing
- `docs/modules/` — guías vigentes de capacidades implementadas; cada una
  separa verificación estática de evidencia runtime/Cloud
- `docs/design-system/` — entrada al sistema canónico Poppy/Cobalt/Geist,
  estado, tokens, kits y clasificación de exportaciones históricas/generadas

`docs/estado-fases.md` y `docs/local/` son notas de desarrollo locales o
históricas (gitignored). No son autoridad y no existen en un checkout limpio.

## Estado y alcance

Los planes 010 y 011 contienen remediaciones P0 activas de aislamiento tenant
y billing. Los planes 012 y 013 cubren hardening y preparación comercial. Una
capacidad configurada o presente en código no implica certificación en
producción; consulta siempre [el estado actual](docs/current-state.md).
