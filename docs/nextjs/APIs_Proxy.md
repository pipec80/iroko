# Route Handlers y Proxy (Next.js 16)

## 1. Route Handlers (`route.ts`)

Son el equivalente a las API Routes. Permiten crear handlers personalizados usando las APIs de `Request` y `Response`.

- **Ubicación**: Archivos `route.ts`. No pueden coexistir con un `page.tsx` en el mismo nivel.
- **Caché**: Con **Cache Components** habilitado, los `GET` pueden usar la directiva `"use cache"` (extraída a una función helper) para persistir resultados.

## 2. Proxy (Antes Middleware)

En Next.js 16, Middleware se renombra a **Proxy** para reflejar mejor su propósito: código que corre antes de completar la petición.

- **Archivo**: `src/proxy.ts`.
- **Casos de Uso**: Redirecciones programáticas, reescritura de URLs y modificación de headers globales.
- **Restricción**: No está diseñado para fetching de datos lento o lógica de autenticación compleja (mejor usar Server Components para eso).

## 3. Ejemplo de Proxy

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // lógica de redirección o headers
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

_Última actualización: 2026-04-22_
