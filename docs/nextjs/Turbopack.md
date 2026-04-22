# Turbopack in Next.js 16

Turbopack is an incremental bundler optimized for JavaScript and TypeScript, written in Rust. In Next.js 16, it becomes even more integrated with stable features and improved caching.

## Top-level Configuration

The `turbopack` option is now a top-level configuration (previously `experimental.turbo`).

```ts
const nextConfig = {
  turbopack: {
    resolveAlias: {
      underscore: "lodash",
    },
    // rules for custom loaders
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};
```

## Persistent Caching

We have enabled FileSystem Caching to speed up builds and development sessions:

```ts
const nextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
};
```

- **Dev**: Restores data between `next dev` sessions.
- **Build**: Experimental support to reduce work in `next build`.

## Suppressing Issues

You can hide specific warnings using `ignoreIssue`:

```ts
const nextConfig = {
  turbopack: {
    ignoreIssue: [{ path: "**/vendor/**", title: "Module not found" }],
  },
};
```

## Important Differences from Webpack

- **Built-in Support**: No need for `css-loader` or `babel-loader` for standard features.
- **Rules**: Matching is done via glob patterns (e.g., `*.svg`).
- **Module Types**: You can set `type: 'asset'`, `type: 'raw'`, etc., directly in rules.
