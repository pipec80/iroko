# Optimización de Imágenes y Fuentes (Next.js 16)

## 1. Imágenes (`next/image`)

El componente `<Image>` optimiza automáticamente el tamaño, formato (WebP) y previene el **Cumulative Layout Shift (CLS)**.

### Imágenes Locales

- Almacenadas en `public/` o importadas estáticamente.
- Next.js detecta automáticamente `width` y `height`.

### Imágenes Remotas

- **Configuración Requerida**: Debes definir `remotePatterns` en `next.config.ts` por seguridad.
- **Obligatorio**: Pasar `width` y `height` manualmente (o usar `fill`).

```ts
// next.config.ts
images: {
  remotePatterns: [{ hostname: "example.com" }];
}
```

## 2. Fuentes (`next/font`)

Optimización automática y auto-alojamiento (self-hosting).

### Google Fonts (`next/font/google`)

- Next.js descarga la fuente en tiempo de build.
- **Privacidad**: El navegador del usuario no envía peticiones a Google.
- **Recomendación**: Usa fuentes variables (ej: `Geist`) para mayor flexibilidad.

### Fuentes Locales (`next/font/local`)

- Se definen apuntando al archivo `.woff2` local.
- Se aplican mediante `className` en el layout o componente.

```tsx
const geist = Geist({ subsets: ['latin'] });
<html className={geist.className}>
```

---

_Última actualización: 2026-04-22_
