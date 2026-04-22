# TypeScript & Typed Routes

Next.js 16 makes TypeScript a first-class citizen with stable features that ensure type safety across the entire application.

## Statically Typed Routes

`typedRoutes` is now stable. It generates types for all routes in your application, preventing broken links.

```ts
const nextConfig = {
  typedRoutes: true,
};
```

This allows you to get autocompletion and type checking when using `<Link>` or `router.push()`.

## 2. Route-Aware Type Helpers

Next.js 16 provides global helpers that are automatically generated and available without imports:

- **`PageProps`**: Types for page parameters and search params.
- **`LayoutProps`**: Types for layout children and params.
- **`RouteContext`**: Types for route handlers.

## 3. End-to-End Type Safety

With Server Components, data fetching is no longer bound by serialization. You can fetch and pass complex objects:

- `Date`, `Map`, `Set` can be passed from Server Components to the client without manual conversion.
- The boundary between server and client is more transparent, reducing the need for manual boilerplate typing.

## 4. Strict Build Checks

For an enterprise SaaS, we enforce strict type checking during builds.

```ts
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Default: fail build on errors
  },
};
```

**Recommendation**: Never set `ignoreBuildErrors: true` in production unless it's a critical emergency, as it bypasses the safety net that prevents runtime crashes.

## Transpile Packages

If you use local packages (monorepo) or dependencies that need transpilation (like some ESM-only or modern JS libs), use `transpilePackages`:

```ts
const nextConfig = {
  transpilePackages: ["@acme/ui", "lucide-react"],
};
```
