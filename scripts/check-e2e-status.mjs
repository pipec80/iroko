import { pathToFileURL } from 'node:url';

/** Accept skipped jobs only for an explicitly exempt run. */
export function acceptE2eResults(results, allowSkipped) {
  return (
    results.length === 2 &&
    results.every((result) => result === 'success' || (allowSkipped && result === 'skipped'))
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const allowed = acceptE2eResults(
    [process.env.E2E_RESULT, process.env.WEBKIT_RESULT],
    process.env.ALLOW_SKIPPED === 'true',
  );
  if (!allowed) {
    console.error('E2E status gate failed');
    process.exitCode = 1;
  } else {
    console.log('E2E status gate passed');
  }
}
