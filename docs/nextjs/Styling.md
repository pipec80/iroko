# Estilos y CSS (Next.js 16)

Next.js 16 soporta múltiples métodos de estilización. Nuestra elección principal es **Tailwind CSS**.

## 1. Tailwind CSS

- **Configuración**: Usamos `@tailwindcss/postcss`.
- **Importación**: `@import "tailwindcss";` en el archivo CSS global.
- **Ventaja**: Clases de utilidad que garantizan consistencia y rendimiento.

## 2. CSS Modules

- **Uso**: Para estilos personalizados que no caben en Tailwind.
- **Extensión**: `.module.css`.
- **Efecto**: Scoping local automático (evita colisiones de nombres).

## 3. Orden de CSS

El orden de las clases en el bundle final depende del **orden de importación** en los archivos JS/TS.

- **Recomendación**: Importa el CSS global (`globals.css`) en el Root Layout antes de cualquier componente.

## 4. Desarrollo vs Producción

- **Dev**: Fast Refresh aplica los cambios al instante.
- **Prod**: Next.js concatena y minifica el CSS, cargando solo lo necesario para cada ruta.

---

_Última actualización: 2026-04-22_
