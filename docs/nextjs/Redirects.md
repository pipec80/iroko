# Redirects & Routing Rules

Redirects allow you to send incoming requests to a different destination path. This is essential for SEO and handling legacy URLs.

## Configuration

Redirects are defined in `next.config.ts`:

```ts
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/old-path",
        destination: "/new-path",
        permanent: true, // Status code 308
      },
    ];
  },
};
```

### Path Matching

- **Params**: `/blog/:slug` -> `/news/:slug`
- **Wildcards**: `/blog/:path*` -> `/news/:path*`
- **Regex**: `/post/:id(\\d+)` matches only numbers.

## Header & Cookie Matching

You can apply redirects only if certain conditions are met (e.g., auth cookies):

```ts
{
  source: '/dashboard',
  has: [
    { type: 'cookie', key: 'authorized', value: 'true' },
  ],
  destination: '/welcome',
  permanent: false,
}
```

## i18n Considerations

When using the App Router with Internationalization, redirects must be handled with care. For dynamic locale-based redirects, we prefer using the **Proxy Pattern** or **Middleware** instead of hardcoded `next.config.ts` redirects.

## Server Actions Configuration

For security, we've tuned Server Actions:

- **`bodySizeLimit: '2mb'`**: Prevents large payload attacks.
- **`allowedOrigins`**: (Optional) For secure calls from multiple domains.
