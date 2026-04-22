# SEO y Metadatos (Next.js 16)

Next.js 16 proporciona APIs robustas para gestionar el SEO y la compartibilidad social de la aplicación.

## 1. Metadatos Estáticos vs Dinámicos

- **Estáticos**: Exporta un objeto `Metadata` desde un `layout.tsx` o `page.tsx`.
- **Dinámicos**: Usa la función `generateMetadata`. **Importante**: En Next.js 16, `params` y `searchParams` son promesas, por lo que debes hacerles `await`.

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // fetch data...
  return { title: "..." };
}
```

## 2. Streaming de Metadatos

- Next.js transmite los metadatos por streaming por separado. Esto permite que el contenido visual aparezca antes de que los metadatos se resuelvan totalmente.
- **Bots**: Para bots (Twitter, Slack), el streaming se deshabilita automáticamente para que reciban los tags en el `<head>` inicial.

## 3. Imágenes Open Graph (OG)

- **Estáticas**: Simplemente coloca un archivo `opengraph-image.jpg` en la carpeta de la ruta.
- **Dinámicas**: Crea un archivo `opengraph-image.tsx` que use el constructor **`ImageResponse`** de `next/og`. Permite generar imágenes usando JSX y CSS (Flexbox).

## 4. Convenciones de Archivos

- `favicon.ico`: En la raíz de `app/`.
- `robots.txt`: Archivo especial que puede ser estático o generado por código.
- `sitemap.xml`: Idem, esencial para SEO.

---

_Última actualización: 2026-04-22_
