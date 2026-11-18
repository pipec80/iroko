import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const backend = 'https://rgrxlygtmvavqzkjyywg.supabase.co';

/** Delete only a recent fixture whose identity and originating Actions run match. */
export async function cleanupOwnedFixture(admin, { id, runId }) {
  if (!/^[a-f0-9-]{36}$/.test(id ?? '') || !/^\d+$/.test(runId ?? '')) {
    throw new Error('fixture_input');
  }
  const found = await admin.auth.admin.getUserById(id);
  if (found.error?.status === 404 && found.error?.code === 'user_not_found') return;
  if (found.error || !found.data.user) throw new Error('fixture_lookup');
  const user = found.data.user;
  const age = Date.now() - Date.parse(user.created_at);
  if (
    user.id !== id ||
    !/^access-account-[a-f0-9-]{36}@example\.test$/.test(user.email ?? '') ||
    user.user_metadata?.given_name !== 'AccessAcceptance' ||
    user.user_metadata?.family_name !== runId ||
    !Number.isFinite(age) ||
    age < -300_000 ||
    age > 48 * 3600_000
  )
    throw new Error('fixture_ownership');
  if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('fixture_delete');
}

/** Attempt every owned target even if another target cannot be verified. */
export async function cleanupOwnedFixtures(admin, targets) {
  let failed = false;
  for (const target of targets) {
    try {
      await cleanupOwnedFixture(admin, target);
      process.stdout.write(`ACCESS_ACCOUNT_AUTH_CLEANUP=${target.id}\n`);
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error('fixture_cleanup_incomplete');
}

async function main() {
  const targets = [];
  const previousId = process.env.ACCESS_ACCOUNT_PREVIOUS_FIXTURE_ID;
  const previousRun = process.env.ACCESS_ACCOUNT_PREVIOUS_RUN_ID;
  if (previousId || previousRun) targets.push({ id: previousId, runId: previousRun });
  const file = process.env.ACCESS_ACCOUNT_FIXTURE_FILE;
  if (file && existsSync(file)) targets.push(JSON.parse(readFileSync(file, 'utf8')));
  if (!targets.length) {
    if (process.env.ACCESS_ACCOUNT_CLEANUP_REQUIRED === 'true') throw new Error('fixture_input');
    return;
  }
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') !== backend ||
    !process.env.SUPABASE_SECRET_KEY
  )
    throw new Error('fixture_target');
  const admin = createClient(backend, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(20_000) }),
    },
  });
  await cleanupOwnedFixtures(admin, targets);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('access_account_fixture_cleanup_failed');
    process.exitCode = 1;
  });
}
