# React Compiler (Next.js 16)

The React Compiler is a revolutionary tool that automatically optimizes component rendering, eliminating the need for manual memoization with `useMemo` and `useCallback`.

## Setup

Next.js includes native support for the compiler. To enable it:

1.  **Install the plugin**:

    ```bash
    npm install -D babel-plugin-react-compiler
    ```

2.  **Enable in `next.config.ts`**:
    ```ts
    const nextConfig = {
      reactCompiler: true,
    };
    ```

## How it Works

Next.js uses a custom SWC optimization to apply the compiler only to relevant files (those with JSX or Hooks). This keeps build times fast while providing the benefits of automatic memoization.

## Opt-in / Opt-out Mode

If you prefer to control which components are compiled, you can use the `annotation` mode:

```ts
const nextConfig = {
  reactCompiler: {
    compilationMode: "annotation",
  },
};
```

Then, use directives in your components:

- `"use memo"`: Opt-in to compilation.
- `"use no memo"`: Opt-out from compilation.

```tsx
export default function Page() {
  "use memo";
  // ...
}
```

## Benefits for SaaS

- **Cleaner Code**: No more `useMemo` / `useCallback` boilerplate.
- **Consistent Performance**: Prevents accidental re-renders across the entire application dashboard.
