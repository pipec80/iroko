# Deployment & Output Tracing

Next.js 16 uses Output File Tracing to determine exactly which files are needed for a production deployment, drastically reducing the size of Docker images and deployment artifacts.

## Standalone Output

Enabling `output: 'standalone'` creates a folder at `.next/standalone` which contains everything needed to run the application without `node_modules`.

```ts
// next.config.ts
const nextConfig = {
  output: "standalone",
};
```

### Key Benefits

1.  **Docker Optimization**: You only need to copy the `.next/standalone` folder and its internal `node_modules` into your Docker image.
2.  **No `next start`**: A minimal `server.js` is generated. You run the app using `node .next/standalone/server.js`.
3.  **Port/Hostname**: Can be configured via environment variables (`PORT=8080`, `HOSTNAME=0.0.0.0`).

## File Tracing (Includes/Excludes)

In complex scenarios (e.g., monorepos or native assets), you might need to manually include or exclude files:

```ts
// next.config.ts
const nextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./src/i18n/locales/**/*.json"],
  },
  outputFileTracingExcludes: {
    "/api/*": ["./temp/**/*"],
  },
};
```

## Static Assets

The `standalone` server does **not** include `public/` or `.next/static/` by default. These should be served by a CDN.

**Manual Copy for Local/Docker Testing:**

```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```
