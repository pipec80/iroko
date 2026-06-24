// Vitest shim for the `server-only` package.
// In tests there is no Next.js build layer to enforce server boundaries,
// so we replace the package with a no-op to allow importing server modules.
export {};
