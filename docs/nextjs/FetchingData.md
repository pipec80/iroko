# Obtención de Datos (Fetching Data) en Next.js 16

Este documento describe cómo manejar la carga de datos de manera eficiente y segura en el proyecto.

## 1. Data Fetching en Server Components (Recomendado)

Los Server Components permiten obtener datos directamente en el servidor, cerca de la base de datos (Supabase en nuestro caso).

### Con `fetch` (Memoizado)

Next.js extiende la API nativa de `fetch` para memorizar automáticamente peticiones idénticas en el mismo árbol de componentes.

- **Buena Práctica**: No pases datos por props entre Server Components; vuelve a pedir los mismos datos donde los necesites. Next.js evitará duplicar la petición de red.

### Con Supabase / ORM

Al ser código de servidor, puedes usar directamente el cliente de Supabase.

- **Seguridad**: Asegúrate de que las peticiones estén autorizadas. Usa `server-only` para proteger estos servicios.

## 2. Streaming y Suspensión

Para evitar que una petición lenta bloquee toda la página:

- **Granularidad**: Usa `<Suspense>` para envolver componentes específicos que tardan en cargar.
- **Feedback**: Define un `fallback` (Skeleton UI) significativo.

## 3. Caching y Memoización (`React.cache`)

Para peticiones que **no** usan `fetch` (ej: llamadas directas a Supabase), envuelve la función en `cache` de React para evitar múltiples consultas a la DB en un mismo request.

```typescript
import { cache } from "react";
export const getUser = cache(async (id: string) => {
  return await supabase.from("profiles").select().eq("id", id).single();
});
```

## 4. Next.js 16: APIs Asíncronas

**IMPORTANTE**: En Next.js 16, las APIs que acceden a datos de la petición son **Promises** y deben ser esperadas con `await`.

- `cookies()`
- `headers()`
- `params`
- `searchParams`

---

_Última actualización: 2026-04-22_
