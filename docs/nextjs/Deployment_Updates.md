# Despliegue y Actualizaciones (Next.js 16)

## 1. Opciones de Despliegue

- **Node.js Server**: Recomendado para infraestructura propia.
- **Docker**: Usar `output: "standalone"` en `next.config.ts` para imágenes mínimas y optimizadas.
- **Static Export**: Para sitios sin servidor (no soporta Server Actions ni APIs de tiempo de ejecución).

## 2. Adaptores Verificados

Next.js 16 introduce la API de **Adaptores**. Los verificados (Vercel, Bun) pasan una suite de tests de compatibilidad oficial.

## 3. Comando de Actualización

- `pnpm next upgrade`: Comando oficial para mantenerse al día con parches y versiones menores.

## 4. Funcionalidades en Canary (Próximamente estables)

- **Interrupciones de Auth**: Funciones `forbidden()` y `unauthorized()` que disparan archivos `forbidden.tsx` y `unauthorized.tsx` respectivamente. Muy útil para manejo granular de permisos.

---

_Última actualización: 2026-04-22_
