# Guía de Instalación y Mejores Prácticas (Next.js 16.2.4)

Esta guía documenta la base instalada y las mejores prácticas extraídas de la documentación oficial y la experiencia en **PAX3**.

## Requisitos del Sistema

- **Node.js**: 20.9 o superior (Actual: v22.18.0).
- **Package Manager**: pnpm (v10.32.1).

## Configuración Inicial (create-next-app)

El proyecto fue inicializado con los siguientes flags:

- `--typescript`: Tipado estricto.
- `--tailwind`: Tailwind CSS 4 (Configuración vía CSS variable).
- `--eslint`: ESLint 9+ con `eslint.config.mjs`.
- `--app`: App Router (Server-first architecture).
- `--src-dir`: Código fuente en carpeta `src/`.
- `--import-alias "@/*"`: Alias de rutas absoluto.
- `--agents-md`: Instrucciones nativas para IAs.

## Bloque 1: Calidad de Código (Instalado)

Se han instalado herramientas para garantizar que el código cumpla con los estándares profesionales:

- **Husky**: Hooks de Git para pre-commit y commit-msg.
- **Lint-staged**: Optimización de procesos en archivos modificados.
- **Commitlint**: Mensajes de commit bajo el estándar _Conventional Commits_.
- **Prettier**: Formateo automático consistente.
- **ESLint Plugins**: Incluyendo `no-secrets` para seguridad.
- **Knip**: Limpieza de código muerto.

## Reglas de Oro en Next.js 16

1.  **Server Components por defecto**: Minimizar el uso de `"use client"`.
2.  **Linting en Build**: Recordar que `next build` ya no corre el linter. Se debe ejecutar `pnpm lint` manualmente o vía CI.
3.  **Turbopack**: Usar el motor de desarrollo para máxima velocidad.
4.  **Absolute Imports**: Usar siempre el prefijo `@/` para evitar rutas relativas complejas.

---

_Última actualización: 2026-04-22_
