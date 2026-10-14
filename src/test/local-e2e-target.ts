type TargetEnv = Record<string, string | undefined>;

/** Rejects remote endpoints before authenticated acceptance can mutate data. */
export function requireLoopbackUrl(value: string | undefined): string {
  if (!value) throw new Error('An explicit loopback URL is required');
  const url = new URL(value);
  if (url.pathname !== '/' || url.search || url.hash || value.trim() !== value) {
    throw new Error('Acceptance endpoints must be explicit origins');
  }
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error('Acceptance requires an HTTP loopback URL without credentials');
  }
  return url.origin;
}

/** The explicit project and container pair cannot fall back to a developer database. */
export function resolveDbTarget(env: TargetEnv, defaultProject: string) {
  const isolated = env.LOCAL_VALIDATION === 'true';
  const project = env.E2E_SUPABASE_PROJECT_ID ?? (isolated ? '' : defaultProject);
  const container = env.E2E_SUPABASE_DB_CONTAINER ?? (isolated ? '' : `supabase_db_${project}`);
  if (!project || !/^[a-zA-Z0-9_-]+$/.test(project) || container !== `supabase_db_${project}`) {
    throw new Error('An exact Supabase project/container pair is required');
  }
  if (isolated) {
    const api = requireLoopbackUrl(env.E2E_SUPABASE_URL);
    if (api !== requireLoopbackUrl(env.NEXT_PUBLIC_SUPABASE_URL)) {
      throw new Error('Application and fixture Supabase URLs must match');
    }
  }
  return { project, container };
}

/** Docker must attest both the project label and a running container before SQL. */
export function validateDbContainerState(state: string, project: string): void {
  if (state.trim() !== `true|${project}`) {
    throw new Error('Supabase container identity or running state does not match');
  }
}
