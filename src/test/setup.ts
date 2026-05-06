// Mock env vars used by @/env. Real app uses @t3-oss/env-nextjs at module load,
// but tests don't go through Next build — stub the values manually.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = process.env as any;
env.LOG_LEVEL = env.LOG_LEVEL ?? 'silent';
env.SITE_URL = env.SITE_URL ?? 'http://localhost:3000';
env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_test';
env.SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY ?? 'sb_secret_test';
