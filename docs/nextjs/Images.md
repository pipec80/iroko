# Image Optimization & Custom Loaders

Next.js 16 provides a powerful Image Optimization API. For a SaaS, leveraging a cloud provider (like Supabase Storage) to optimize images is often more efficient than using the built-in server-side optimization.

## Custom Loaders

If you use a cloud provider, you can configure a `loaderFile` in `next.config.ts`:

```ts
// next.config.ts
const nextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};
```

### Supabase Loader Example

The loader file must be a Client Component (`'use client'`) because it is serialized to the browser.

```ts
// src/lib/image-loader.ts
"use client";

export default function supabaseLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const url = new URL(src);
  url.searchParams.set("width", width.toString());
  url.searchParams.set("quality", (quality || 75).toString());
  return url.href;
}
```

## Remote Patterns (Standard Approach)

If you don't use a custom loader, you must define `remotePatterns` to allow external images:

```ts
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
```

## Important Considerations

- **Serialization**: Custom loaders require `Client Components`.
- **Formats**: Next.js automatically detects browser support for modern formats like WebP or AVIF if the loader/provider supports it.
- **SaaS Benefit**: Using a CDN/Cloud loader reduces the CPU load on your Next.js server, allowing for better scalability.
