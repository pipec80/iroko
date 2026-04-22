# Caching y Partial Prerendering (Next.js 16)

Next.js 16 introduce un modelo de caché simplificado y potente basado en **Cache Components**.

## 1. Habilitación

Se activa en `next.config.ts`:

```ts
const nextConfig = {
  cacheComponents: true,
};
```

## 2. Directiva `"use cache"`

Permite cachear el valor de retorno de funciones asíncronas y componentes.

- **Nivel de Datos**: Cachea funciones que consultan la BD (ej: `getProducts`).
- **Nivel de UI**: Cachea componentes enteros o páginas.
- **Keys**: Los argumentos de la función se convierten automáticamente en parte de la llave de caché.

## 3. Partial Prerendering (PPR)

Es el comportamiento por defecto con Cache Components.

- Genera un **"shell" estático** (HTML inicial rápido).
- El contenido dinámico (que usa `cookies()`, `headers()`, etc.) se transmite por streaming mediante **`<Suspense>`**.

## 4. APIs de Tiempo de Ejecución

El acceso a `cookies()`, `headers()`, `searchParams` y `params` bloquea el prerendering estático.

- **Regla de Oro**: Envuelve siempre estos componentes en `<Suspense>` para evitar errores de "Uncached data accessed outside of Suspense".

## 5. Operaciones No Deterministas

Para funciones como `Math.random()` o `crypto.randomUUID()` que deben ser diferentes por cada petición:

- Usa `await connection()` para forzar la ejecución en tiempo de solicitud.
- Envuelve el componente en `<Suspense>`.

---

_Última actualización: 2026-04-22_
