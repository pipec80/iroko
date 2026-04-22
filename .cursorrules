# Next.js 16/React 19 Architecture Rules
# ======================================

1. **NO `middleware.ts` ALLOWED:**
   As of Next.js 16+, the standard edge router interceptor must NEVER be named `middleware.ts`. It has been formally deprecated. You MUST write interception logic inside `src/proxy.ts` (or `proxy.ts`). If you generate a `middleware.ts` it will crash the Turbopack dev server and compilation due to file convention errors.

2. **Proxy Mutation Rule:**
   Since `proxy.ts` often wraps multiple libraries (like `next-intl/middleware`, Supabase Auth, Nonce generation), you must always extract the downstream response from the inner middleware (`const response = intlMiddleware()`) and attach your headers or cookies (`response.cookies.set(...)`) directly to that returned Response before finally returning it.

3. **Strict Type Generation:**
   Always use `.schema('public')` or equivalent schema chaining when working with Supabase. Expect `never` type bounds if you query structures without explicit schema references in some environments.

4. **KISS & YAGNI First:**
   Do not add additional packages or heavy test wrappers to test single endpoints unless explicitly requested. Rely on pure functions or manual E2E where practical.

5. **React Compiler Optimization:**
   Rely on the built-in React Compiler for memoization. Do not use `useMemo` or `useCallback` unless specifically debugging performance or working with external libraries that require stable references for non-primitive values.
