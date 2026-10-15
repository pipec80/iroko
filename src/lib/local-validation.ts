const hostingMarkers = ['VERCEL', 'VERCEL_ENV', 'NEXT_PUBLIC_VERCEL_ENV', 'NETLIFY', 'CF_PAGES'];

function isLoopbackUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

/** Rejects Cloud targets before disabling observability for isolated local validation. */
export function isLocalValidation(input: Record<string, string | undefined>): boolean {
  const flag = input.LOCAL_VALIDATION;
  if (flag !== undefined && flag !== 'true')
    throw new Error('LOCAL_VALIDATION must be true or absent.');
  if (
    input.NEXT_PUBLIC_LOCAL_VALIDATION !== undefined &&
    input.NEXT_PUBLIC_LOCAL_VALIDATION !== (flag ?? 'false')
  ) {
    throw new Error('The browser validation flag must be derived from LOCAL_VALIDATION.');
  }
  if (flag !== 'true') return false;
  if (hostingMarkers.some((marker) => input[marker] !== undefined && input[marker] !== '')) {
    throw new Error('Local validation is forbidden on hosted deployments.');
  }
  if (!isLoopbackUrl(input.SITE_URL) || !isLoopbackUrl(input.NEXT_PUBLIC_SUPABASE_URL)) {
    throw new Error('Local validation requires explicit HTTP loopback site and Supabase URLs.');
  }
  return true;
}
