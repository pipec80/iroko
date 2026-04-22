# Enlaces y Navegación (Next.js 16)

Este documento detalla cómo optimizar la experiencia de navegación en el SaaS Boilerplate.

## Estrategias de Optimización

### 1. Prefetching Automático

Next.js precarga las rutas en segundo plano cuando un componente `<Link>` entra en el viewport del usuario.

- **Rutas Estáticas**: Se precarga la ruta completa.
- **Rutas Dinámicas**: Se precarga parcialmente si existe un archivo `loading.tsx`.

### 2. Streaming y `loading.tsx`

Para evitar que el usuario sienta que la app no responde en rutas dinámicas:

- **Buena Práctica**: Crear siempre un archivo `loading.tsx` en las rutas principales o dinámicas para habilitar el **Streaming**.
- Esto permite que el usuario vea un "skeleton" instantáneamente mientras los datos se terminan de cargar en el servidor.

### 3. Feedback en Redes Lentas (`useLinkStatus`)

Next.js 16 introduce el hook `useLinkStatus` para Client Components. Permite mostrar un indicador de carga (spinner o barra de progreso) si la navegación tarda más de lo esperado.

```tsx
"use client";
import { useLinkStatus } from "next/link";

export function NavLink({ href, children }) {
  const { pending } = useLinkStatus();
  return (
    <Link href={href} className={pending ? "opacity-50" : ""}>
      {children}
    </Link>
  );
}
```

## Navegación por Código

- **`useRouter`**: Hook para navegación programática (solo en Client Components).
- **History API**: Next.js 16 sincroniza `window.history.pushState` y `replaceState` con el router, permitiendo actualizar la URL sin recargar la página.

---

_Última actualización: 2026-04-22_
