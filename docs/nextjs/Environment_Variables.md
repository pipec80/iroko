# Environment Variables in Next.js 16

Next.js 16 introduces enhanced type safety and IntelliSense for environment variables.

## 1. Typed Environment Variables

We have enabled `experimental.typedEnv` in `next.config.ts`.

```ts
const nextConfig = {
  experimental: {
    typedEnv: true,
  },
};
```

### Benefits

- **IntelliSense**: Your IDE will provide autocompletion for `process.env.VARIABLE_NAME`.
- **Validation**: Next.js generates a `.d.ts` file in `.next/types` based on your `.env` files.
- **Production Safety**: To include production variables in dev types, run `NODE_ENV=production next dev`.

## 2. Type-Safe Environment with T3 Env

While Next.js provides basic typing, we also use `@t3-oss/env-nextjs` and `zod` for runtime validation and strictly typed access in `src/env.ts`.

### Usage Pattern

```ts
import { env } from "@/env";

// Strictly typed and validated at runtime
const apiKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

## 3. Best Practices

- **Never commit `.env` or `.env.local`**: Use `.env.example` as a template.
- **Prefix public variables**: Only variables prefixed with `NEXT_PUBLIC_` are accessible on the client side.
- **Validation on Build**: T3 Env will fail the build if required environment variables are missing, preventing runtime crashes in production.
