# Iroko — SaaS Foundation

Dirección del MVP,2026-10-28: [base SaaS replicable y aceptación acotada](docs/adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Primero demostrar configuración, marca, extensión y actualización del núcleo;
después una vertical cliente/Robot. No hay aceptación nueva de producto por
actualizar esta documentación. Estado y siguiente trabajo en [current-state](docs/current-state.md).

Base SaaS interna y reutilizable para los proyectos de pipec, construida con la
calidad y modularidad necesarias para poder convertirse más adelante en un
boilerplate comercial. Hoy no se presenta como producto instalable, soportado
o listo para clientes.

La promesa que guía el cierre es: **«Tengo una base que ya resuelve acceso,
cuentas, permisos y servicios comunes. Podemos dedicar el desarrollo a tu
operación y adaptar la experiencia a lo que necesitas.»** Su uso como afirmación
comercial depende de la evidencia del alcance ofrecido. La
[estrategia de producto](docs/architecture/product-strategy.md) define los
límites, las configuraciones de referencia y cómo demostrar reutilización.

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
| Observabilidad  | Sentry, Pino, PostHog y métricas de Vercel        |
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
- `docs/exec-plans/` — ciclo de vida de planes activos, diferidos y completados
- `docs/runbooks/` — guías operativas paso a paso
- `docs/quality/` — Definition of Done y estrategia de testing
- `docs/modules/` — guías vigentes de capacidades implementadas; cada una
  separa verificación estática de evidencia runtime/Cloud
- `docs/design-system/` — entrada al sistema canónico Poppy/Cobalt/Geist,
  estado, tokens, kits y clasificación de exportaciones históricas/generadas

`docs/local/` conserva notas de trabajo e historia local ignorada. No es
autoridad y no existe en un checkout limpio. El historial versionado y seguro
de publicar está en [docs/history/](docs/history/README.md).

## Estado y alcance

El [roadmap de freeze](ROADMAP.md) contiene el único orden vigente. Plan 011
tiene el alcance requerido por este freeze satisfecho y conserva sus escenarios
restantes como trabajo diferido; Plan 013 también queda diferido hasta decidir
vender. Los Planes 012, 014, 015, 016 y 017 forman el trabajo activo. Consulta el
[índice de planes](docs/exec-plans/README.md) para su ciclo de vida y
[el estado actual](docs/current-state.md) para evidencia verificada.

Una capacidad configurada o presente en código no implica certificación en
producción. El setup
local de arriba no sustituye todavía el ensayo independiente de Plan 015.
