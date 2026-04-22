# Estructura del Proyecto y Organización (Next.js 16)

Este documento define la arquitectura de carpetas y archivos para el SaaS Boilerplate, basada en las convenciones oficiales de Next.js 16.2.4 y adaptada para escalabilidad profesional.

## Decisión de Arquitectura: "Feature-Based Split"

Hemos adoptado la estrategia de **Dividir por Funcionalidad**. A diferencia de una estructura plana, aquí los componentes, hooks y utilidades específicos de una ruta viven dentro de la carpeta de esa ruta.

### Estructura de Carpetas Principal

- `src/app/`: Contiene exclusivamente la lógica de routing y layouts.
- `src/components/`: Componentes UI globales y reutilizables (ej: Botones, Inputs de shadcn).
- `src/lib/`: Utilidades core, configuraciones de clientes (Supabase, QueryClient).
- `src/env.ts`: Validación estricta de variables de entorno (T3 Env).
- `src/proxy.ts`: BFF (Backend-for-Frontend) que maneja Auth, i18n y seguridad.

## Soporte Multi-idioma (i18n)

Se ha decidido implementar **`next-intl`** desde el inicio. Esto implica que la estructura de `app/` es dinámica:

```text
src/app/
└── [locale]/
    ├── layout.tsx (Root Layout dinámico)
    ├── page.tsx (Home Page traducida)
    └── (dashboard)/
        └── _components/ (Componentes privados del dashboard)
```

## Convenciones de Archivos Especiales

- **`proxy.ts`**: Sustituye al antiguo `middleware.ts`. Corre en el runtime de Node.js.
- **`_folder/`**: Carpetas privadas que Next.js ignora para el routing. Úsalas para organizar lógica interna de una ruta.
- **`(group)/`**: Grupos de rutas que no afectan la URL (ej: `(auth)`, `(dashboard)`). Úsalos para separar layouts sin cambiar la ruta pública.

## Reglas de Colocación (Colocation)

1. **Privacidad**: Si un componente solo se usa en `/dashboard`, colócalo en `src/app/[locale]/(dashboard)/_components/`.
2. **Reutilización**: Si un componente se usa en más de una ruta principal, muévelo a `src/components/ui/`.
3. **Lógica de Datos**: Las queries de TanStack Query deben estar en archivos `.ts` separados (ej: `hooks/use-users.ts`) para mantener los componentes limpios.

---

_Última actualización: 2026-04-22_
