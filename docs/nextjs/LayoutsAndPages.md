# Layouts y Páginas (Next.js 16)

Este documento resume las mejores prácticas para la creación de interfaces compartidas y páginas individuales en el SaaS Boilerplate.

## Conceptos Fundamentales

### 1. Páginas (`page.tsx`)

Una página es la UI única para una ruta específica.

- **Buenas Prácticas**: Mantén las páginas como **Server Components** por defecto para mejorar el rendimiento y el SEO.
- **Next.js 16 Tip**: Las `params` y `searchParams` son ahora **Promises**. Debes usar `await` para acceder a sus valores.

```tsx
export default async function Page(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  // ...
}
```

### 2. Layouts (`layout.tsx`)

UI compartida entre múltiples páginas. Los layouts preservan el estado y no se re-renderizan al navegar entre rutas hermanas.

- **Root Layout (Requerido)**: Ubicado en `app/[locale]/layout.tsx`. Debe contener las etiquetas `<html>` y `<body>`.
- **Layouts Anidados**: Puedes crear layouts específicos para secciones (ej: `(dashboard)/layout.tsx`) que envolverán a las páginas de esa sección.

## Navegación y Enlaces

- **Componente `<Link>`**: Usa siempre `next/link` para navegación interna. Activa el **prefetching** automático, lo que hace que la app se sienta instantánea.
- **i18n Tip**: Al usar `next-intl`, utilizaremos un componente `Link` personalizado (o el de `next-intl`) que preserve el prefijo del idioma (`/es`, `/en`) automáticamente.

## Manejo de Parámetros Dinámicos

- **Dynamic Routes**: Carpetas con corchetes `[slug]`.
- **Search Params**: Úsalos para filtrado, paginación o estados que deban ser compartibles vía URL.
  - En **Server Components**: Usa la prop `searchParams`.
  - En **Client Components**: Usa el hook `useSearchParams()`.

## Decisión de Organización

Para este Boilerplate, utilizaremos **Grupos de Rutas** (`(marketing)`, `(auth)`, `(dashboard)`) para separar los layouts principales de la aplicación sin afectar la estructura de la URL, permitiendo una organización limpia y modular.

---

_Última actualización: 2026-04-22_
