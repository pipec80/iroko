# Server y Client Components (Next.js 16)

Este documento define cuándo y cómo utilizar los dos tipos de componentes en la arquitectura del proyecto.

## Regla de Oro

**Por defecto, todos los componentes son Server Components.** Solo utiliza `"use client"` cuando sea estrictamente necesario.

| Escenario                                | Server Component | Client Component |
| :--------------------------------------- | :--------------: | :--------------: |
| Obtención de datos (Data Fetching)       |        ✅        |        ❌        |
| Acceso a Base de Datos / Secretos        |        ✅        |        ❌        |
| Interactividad (`useState`, `useEffect`) |        ❌        |        ✅        |
| Browser APIs (`window`, `localStorage`)  |        ❌        |        ✅        |
| Hooks Personalizados                     |        ❌        |        ✅        |

## Composición de Componentes

Para mantener el tamaño del bundle de JavaScript al mínimo:

1. **Mueve el estado hacia abajo**: En lugar de marcar todo un layout como cliente, crea componentes interactivos pequeños (ej: un botón `LikeButton.tsx`) y manten el resto como servidor.
2. **Intercalado (Interleaving)**: Puedes pasar Server Components como hijos (`children`) a un Client Component. El Server Component se renderizará en el servidor y el Client Component lo recibirá como UI ya procesada.

## Seguridad: "Environment Poisoning"

Para evitar que código del servidor (con claves API o secretos) se filtre accidentalmente al cliente, utilizamos el paquete `server-only`.

```typescript
// En archivos que contienen lógica sensible o de base de datos
import 'server-only'

export async function getSensitiveData() { ... }
```

Si este archivo se intenta importar en un componente con `"use client"`, el compilador generará un error de build.

## Context Providers

Los Providers (como el de `next-intl` o `TanStack Query`) deben ser Client Components.

- **Buena Práctica**: Envuélvelos lo más profundo posible en el árbol para optimizar las partes estáticas de tus Server Components.

---

_Última actualización: 2026-04-22_
