import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { freemem } from 'node:os';
import { readFileSync } from 'node:fs';
import { readOfferedProjects, runLocalValidation } from './run-plan-0124-local.mjs';

export const expectedP1Cases = {
  'analytics.spec.ts': 8,
  'identity-cache.spec.ts': 1,
  'active-account.spec.ts': 2,
  'impersonation.spec.ts': 4,
  'password-settings.spec.ts': 1,
  'document-editor.spec.ts': 4,
  'vercel-analytics-consent.spec.ts': 1,
  'admin-translations.spec.ts': 1,
};

/** Every planned scenario in each selected file must pass exactly once, without skips. */
export function assertP1Acceptance(stats, cases, specs, offeredProjects = true) {
  if (typeof offeredProjects !== 'boolean') throw new Error('Invalid offered configuration');
  if (!offeredProjects && specs.includes('document-editor.spec.ts')) {
    throw new Error('Editor acceptance is deferred while Projects is not offered');
  }
  const expectedByFile = {
    ...expectedP1Cases,
    'analytics.spec.ts': offeredProjects ? 8 : 7,
    'active-account.spec.ts': offeredProjects ? 2 : 1,
  };
  const expected = specs.reduce((total, spec) => total + expectedByFile[spec], 0);
  if (
    !Number.isInteger(expected) ||
    stats.expected !== expected ||
    cases.length !== expected ||
    stats.skipped ||
    stats.unexpected ||
    stats.flaky
  ) {
    throw new Error('P1 local acceptance requires every planned case without skips or retries');
  }
  const counts = new Map();
  const identities = new Set();
  for (const entry of cases) {
    const file = entry.file.replaceAll('\\', '/').split('/').at(-1);
    const identity = `${file}:${entry.title}`;
    if (
      !specs.includes(file) ||
      (!offeredProjects && entry.title.includes('@projects-enabled')) ||
      identities.has(identity) ||
      entry.statuses.length !== 1 ||
      entry.statuses[0] !== 'passed'
    ) {
      throw new Error('Invalid P1 scenario coverage');
    }
    counts.set(file, (counts.get(file) ?? 0) + 1);
    identities.add(identity);
  }
  if (specs.some((file) => counts.get(file) !== expectedByFile[file]))
    throw new Error('Incomplete P1 spec coverage');
}

/** Report fixed stages without forwarding server logs; Ctrl+C waits for owned cleanup. */
export async function withPlan017Lifecycle(run, { events = process, write = console.log } = {}) {
  const controller = new AbortController();
  const started = Date.now();
  let stage = 'starting';
  let browserStarted = false;
  let cancellationRequested = false;
  const report = () =>
    write(
      `[017] ${stage}; elapsed=${Math.round((Date.now() - started) / 1000)}s; runnerRSS=${Math.round(process.memoryUsage().rss / 1048576)}MB; freeRAM=${Math.round(freemem() / 1048576)}MB`,
    );
  const onProgress = (next) => {
    if (next === 'running-browser') browserStarted = true;
    stage = next;
    report();
  };
  const cancel = () => {
    if (cancellationRequested) return;
    cancellationRequested = true;
    if (browserStarted) {
      write(
        '[017] cancellation-deferred: waiting for tests and fixture cleanup; do not close terminal',
      );
      return;
    }
    onProgress('cancelling');
    controller.abort(new Error('Local validation cancelled; owned cleanup required'));
  };
  events.on('SIGINT', cancel);
  events.on('SIGTERM', cancel);
  const heartbeat = setInterval(report, 15_000);
  heartbeat.unref();
  report();
  try {
    const result = await run({ signal: controller.signal, onProgress });
    if (cancellationRequested) throw new Error('Local validation cancelled after fixture cleanup');
    return result;
  } finally {
    clearInterval(heartbeat);
    events.removeListener('SIGINT', cancel);
    events.removeListener('SIGTERM', cancel);
  }
}

export async function runPlan017(specs) {
  if (
    !specs.length ||
    new Set(specs).size !== specs.length ||
    specs.some((spec) => !Object.hasOwn(expectedP1Cases, spec))
  ) {
    throw new Error('Specify unique authorized 017 local spec basenames');
  }
  const offeredProjects = readOfferedProjects(
    readFileSync(resolve('src/config/app.config.ts'), 'utf8'),
  );
  if (!offeredProjects && specs.includes('document-editor.spec.ts')) {
    throw new Error('Editor acceptance is deferred while Projects is not offered');
  }
  await withPlan017Lifecycle((lifecycle) =>
    runLocalValidation({
      ...lifecycle,
      mode: '--e2e',
      compiler: 'webpack',
      runtime: 'development',
      specs,
      acceptance: (stats, cases, configuredProjects) =>
        assertP1Acceptance(stats, cases, specs, configuredProjects),
      evidenceDirectory: '.superpowers/sdd/017-freeze-remediation',
    }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runPlan017(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
