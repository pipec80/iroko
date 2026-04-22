# Configuración Avanzada: next.config.ts (Next.js 16)

El archivo `next.config.ts` es el centro de control de la aplicación. En Next.js 16, aprovechamos el tipado fuerte y nuevas funcionalidades experimentales.

## 1. Estructura Base (TypeScript)

Usamos la interfaz `NextConfig` para tener autocompletado y validación de tipos.

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* opciones aquí */
};

export default nextConfig;
```

## 2. Configuración por Fases

Podemos ajustar la configuración dependiendo de si estamos en desarrollo o construcción.

```ts
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default (phase: string) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      /* solo dev */
    };
  }
  return {
    /* prod */
  };
};
```

## 3. Flags Críticos para este Proyecto

Estas son las opciones que hemos habilitado o planeamos habilitar:

- **`cacheComponents: true`**: Habilita el nuevo modelo de caché y PPR (Partial Prerendering). **[YA ACTIVADO]**.
  - _Impacto_: Preserva el estado de la UI (inputs, scroll) al navegar hacia atrás/adelante usando `<Activity>`.
- **`cacheLife`**: Permite definir perfiles de caché personalizados (ej. `blog`, `api`) con tiempos específicos de `stale`, `revalidate` y `expire`.
- **`typedRoutes: true`**: Genera tipos para nuestros links. **[ESTABLE EN V16]**.
- **`turbopackFileSystemCache`**: Habilita la persistencia de caché para acelerar reconstrucciones. **[ACTIVADO]**.
- **`typescript.ignoreBuildErrors: false`**: Garantiza que no se despliegue código con errores de tipo. **[ESTRICTO]**.

## 4. Seguridad y Despliegue

- **`poweredByHeader: false`**: Recomendado para seguridad. **[ACTIVADO]**.
- **`output: 'standalone'`**: Optimización para Docker. **[ACTIVADO]**.
- **`trailingSlash: false`**: Consistencia en las URLs para SEO. **[ACTIVADO]**.
- **`images.remotePatterns`**: Permitir CDN de Supabase. **[ACTIVADO]**.
- **`headers`**: Cabeceras de seguridad implementadas. **[ACTIVADO]**.

## 5. Referencias Detalladas

Para una guía profunda sobre cada área implementada, consulta los documentos específicos:

- [Turbopack y Caching](./Turbopack.md)
- [TypeScript y Typed Routes](./TypeScript_BestPractices.md)
- [React Compiler e Infraestructura](./ReactCompiler.md)
- [Redirecciones y Server Actions](./Redirects.md)
- [Optimización de Imágenes y Loaders](./Images.md)
- [Estrategia de Despliegue y Standalone](./Deployment_Output.md)
- [Caché y PPR (Partial Prerendering)](./Caching.md)

---

_Última actualización: 2026-04-22_
