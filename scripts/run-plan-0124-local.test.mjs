import assert from 'node:assert/strict';
import test from 'node:test';

test('isolated acceptance rejects partial, duplicated, skipped and flaky coverage', async () => {
  const { assertCompleteE2eAcceptance } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof assertCompleteE2eAcceptance, 'function');
  const cases = Object.entries({
    'csp.spec.ts': 10,
    'analytics.spec.ts': 7,
    'impersonation.spec.ts': 4,
    'sentry-tunnel.spec.ts': 1,
  }).flatMap(([file, count]) =>
    Array.from({ length: count }, (_, index) => ({
      file,
      title: `${file} case ${index}`,
      statuses: ['passed'],
    })),
  );
  const stats = { expected: 22, skipped: 0, unexpected: 0, flaky: 0 };
  assert.doesNotThrow(() => assertCompleteE2eAcceptance(stats, cases));
  assert.throws(() => assertCompleteE2eAcceptance({ ...stats, expected: 1 }, cases.slice(-1)));
  assert.throws(() => assertCompleteE2eAcceptance(stats, [...cases.slice(1), cases.at(-1)]));
  for (const field of ['skipped', 'unexpected', 'flaky'])
    assert.throws(() => assertCompleteE2eAcceptance({ ...stats, [field]: 1 }, cases));
  assert.throws(() =>
    assertCompleteE2eAcceptance(
      stats,
      cases.map((entry, index) => (index ? entry : { ...entry, statuses: ['skipped'] })),
    ),
  );
});

test('offered core acceptance excludes the complete Projects funnel before execution', async () => {
  const { assertCompleteE2eAcceptance } = await import('./run-plan-0124-local.mjs');
  const cases = Object.entries({
    'csp.spec.ts': 10,
    'analytics.spec.ts': 6,
    'impersonation.spec.ts': 4,
    'sentry-tunnel.spec.ts': 1,
  }).flatMap(([file, count]) =>
    Array.from({ length: count }, (_, index) => ({
      file,
      title: `${file} case ${index}`,
      statuses: ['passed'],
    })),
  );
  const stats = { expected: 21, skipped: 0, unexpected: 0, flaky: 0 };
  assert.doesNotThrow(() => assertCompleteE2eAcceptance(stats, cases, false));
  assert.throws(() => assertCompleteE2eAcceptance(stats, cases, true));
  assert.throws(() => assertCompleteE2eAcceptance(stats, cases, null));
  assert.throws(() =>
    assertCompleteE2eAcceptance(
      stats,
      cases.map((entry, index) =>
        index === 10 ? { ...entry, title: 'funnel @projects-enabled' } : entry,
      ),
      false,
    ),
  );
  for (const field of ['skipped', 'unexpected', 'flaky'])
    assert.throws(() => assertCompleteE2eAcceptance({ ...stats, [field]: 1 }, cases, false));
  assert.throws(() =>
    assertCompleteE2eAcceptance(
      stats,
      cases.map((entry, index) =>
        index === 10 ? { ...entry, title: 'synthetic Auth URL data @confined-017' } : entry,
      ),
      false,
    ),
  );
});

test('Projects selection reads the application literal without executing configuration', async () => {
  const { readOfferedProjects } = await import('./run-plan-0124-local.mjs');
  assert.equal(
    readOfferedProjects(
      "throw Error('never execute'); export const appConfig = { features: { projects: false } };",
    ),
    false,
  );
  assert.equal(
    readOfferedProjects('export const appConfig: AppConfig = { features: { projects: true } };'),
    true,
  );
  for (const source of [
    'export const other = { features: { projects: false } };',
    'export const appConfig = { features: { projects: compute() } };',
    'export const appConfig = { features: { projects: "false" } };',
    '// projects: false\nexport const appConfig = { features: {} };',
  ])
    assert.throws(() => readOfferedProjects(source));
});

test('generated confined config keeps CSP/egress guards and excludes deferred Projects before discovery', async () => {
  const { writeE2eHarness, requiredE2eSpecs } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const scratch = mkdtempSync(resolve(tmpdir(), 'plan0124-scope-'));
  try {
    const directory = resolve(scratch, 'src/test/e2e');
    mkdirSync(directory, { recursive: true });
    for (const name of requiredE2eSpecs)
      writeFileSync(resolve(directory, name), "import { test } from '@playwright/test';");
    const config = writeE2eHarness(
      scratch,
      'http://127.0.0.1:3000',
      resolve(scratch, 'egress.log'),
      requiredE2eSpecs,
      'production',
      false,
      false,
    );
    const source = readFileSync(config, 'utf8');
    assert.ok(source.includes('|@projects-enabled|@confined-017/'));
    assert.ok(source.includes('**/document-editor.spec.ts'));
    assert.ok(source.includes('forbidOnly:true'));
    assert.ok(source.includes('retries:0'));
    assert.ok(source.includes("serviceWorkers:'block'"));
    assert.equal(source.includes('testIgnore:["**/csp.spec.ts"'), false);
    const bounded = writeE2eHarness(
      scratch,
      'http://127.0.0.1:3000',
      resolve(scratch, 'egress.log'),
      requiredE2eSpecs,
      'development',
      true,
      false,
    );
    const boundedSource = readFileSync(bounded, 'utf8');
    assert.equal(boundedSource.includes('|@confined-017/'), false);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('generated isolated suite rejects an actual test.only during discovery', async () => {
  const { writeE2eHarness, requiredE2eSpecs } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const { createRequire } = await import('node:module');
  const { resolve } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const require = createRequire(import.meta.url);
  const scratch = mkdtempSync(resolve(tmpdir(), 'plan0124-focused-'));
  try {
    const folder = resolve(scratch, 'src/test/e2e');
    mkdirSync(folder, { recursive: true });
    for (const name of requiredE2eSpecs)
      writeFileSync(
        resolve(folder, name),
        name === 'csp.spec.ts' ?
          "import {test} from '@playwright/test'; test.only('focused fixture',()=>{});"
        : "import {test} from '@playwright/test';",
      );
    symlinkSync(
      resolve('node_modules'),
      resolve(scratch, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const config = writeE2eHarness(
      scratch,
      'http://127.0.0.1:3000',
      resolve(scratch, 'egress.log'),
    );
    let rejection;
    try {
      execFileSync(
        process.execPath,
        [require.resolve('@playwright/test/cli'), 'test', '--config', config, '--list'],
        { cwd: scratch, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 },
      );
    } catch (error) {
      rejection = error;
    }
    assert(rejection, 'test.only must fail discovery rather than shrink acceptance');
    assert.match(String(rejection.stdout) + String(rejection.stderr), /test\.only/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
import {
  parseMode,
  assertLocalParent,
  isLoopback,
  safeSourcePath,
  makeLocalEnv,
} from './run-plan-0124-local.mjs';

test('all external rewrite destinations are confined to the sink without changing match conditions', async () => {
  const { localizeExternalRewrites } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof localizeExternalRewrites, 'function');
  const entries = [
    {
      source: '/ingest/static/:path*',
      destination: 'https://us-assets.i.posthog.com/static/:path*',
    },
    { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    {
      source: '/sentry-tunnel',
      destination: 'https://o:organization.ingest.sentry.io/api/:project/envelope/',
      has: [{ type: 'query', key: 'o', value: '(?<organization>\\d+)' }],
      locale: false,
    },
    { source: '/internal', destination: '/es/internal' },
  ];
  const result = localizeExternalRewrites(entries, 'http://127.0.0.1:43210');
  assert.deepEqual(
    result.map((entry) => entry.destination),
    [
      'http://127.0.0.1:43210/static/:path*',
      'http://127.0.0.1:43210/:path*',
      'http://127.0.0.1:43210/api/:project/envelope/',
      '/es/internal',
    ],
  );
  assert.deepEqual(result[2].has, entries[2].has);
  assert.equal(result[2].locale, false);
  assert.equal(result[3], entries[3]);
  assert.equal(entries[0].destination, 'https://us-assets.i.posthog.com/static/:path*');
});

test('rewrite isolation covers every phase and rejects nonlocal or decorated sinks', async () => {
  const { localizeExternalRewrites } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof localizeExternalRewrites, 'function');
  const entry = { source: '/ingest/:path*', destination: '//remote.example/:path*?test=true' };
  const grouped = { beforeFiles: [entry], afterFiles: [entry], fallback: [entry] };
  const result = localizeExternalRewrites(grouped, 'http://localhost:43210');
  for (const phase of ['beforeFiles', 'afterFiles', 'fallback'])
    assert.equal(result[phase][0].destination, 'http://localhost:43210/:path*?test=true');
  for (const sink of [
    'https://remote.example',
    'http://localhost.evil:1234',
    'http://user:password@localhost:1234',
    'http://localhost:1234/path',
    'http://localhost:1234?token=private',
  ])
    assert.throws(() => localizeExternalRewrites(grouped, sink));
});

test('Auth origin must belong to the running official local container', async () => {
  const { parseAuthAttestation } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof parseAuthAttestation, 'function');
  assert.equal(
    parseAuthAttestation('true|saas-boilerplate|http://localhost:3000'),
    'http://localhost:3000',
  );
  for (const value of [
    'false|saas-boilerplate|http://localhost:3000',
    'true|other-project|http://localhost:3000',
    'true|saas-boilerplate|https://remote.example',
    'true|saas-boilerplate|http://localhost.evil:3000',
    'true|saas-boilerplate|http://localhost:4000',
    'true|saas-boilerplate|http://localhost:3000/path',
    'true|saas-boilerplate|http://user:password@localhost:3000',
    'true|saas-boilerplate|http://localhost:3000?token=private',
    'true|saas-boilerplate|',
  ])
    assert.throws(() => parseAuthAttestation(value));
});

test('application redirects preserve the attested Auth origin and its host-only cookies', () => {
  const status = {
    API_URL: 'http://127.0.0.1:54321',
    ANON_KEY: 'local-anon',
    SERVICE_ROLE_KEY: 'local-service',
    INBUCKET_URL: 'http://127.0.0.1:54324',
    AUTH_SITE_URL: 'http://localhost:3000',
  };
  assert.equal(makeLocalEnv(status, {}).SITE_URL, status.AUTH_SITE_URL);
  assert.throws(() => makeLocalEnv({ ...status, AUTH_SITE_URL: undefined }, {}));
});

test(
  'Windows browser cleanup can kill only its live owned child without a shell',
  { skip: process.platform !== 'win32' },
  async () => {
    const { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } =
      await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { resolve } = await import('node:path');
    const { execFileSync } = await import('node:child_process');
    const { networkGuard, guardNodeOptions } = await import('./run-plan-0124-local.mjs');
    const directory = mkdtempSync(resolve(tmpdir(), 'plan0124-browser-cleanup-'));
    const log = resolve(directory, 'egress.log');
    const guard = resolve(directory, 'guard.cjs');
    writeFileSync(guard, networkGuard);
    const code = `
    const assert = require('node:assert/strict');
    const cp = require('node:child_process');
    const fs = require('node:fs');
    (async () => {
      const child = cp.spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {stdio:'ignore'});
      const closed = new Promise(resolve => child.once('close', resolve));
      const command = 'taskkill /pid ' + child.pid + ' /T /F';
      try {
        assert.throws(() => cp.spawnSync('taskkill /pid ' + process.pid + ' /T /F', {shell:true}));
        assert.throws(() => cp.spawnSync(command + ' & echo forbidden', {shell:true}));
        assert.throws(() => cp.spawnSync('cmd.exe', ['/c', 'echo forbidden']));
        assert.throws(() => cp.spawnSync(command, {shell:true,env:process.env}));
        process.env.PLAN0124_FIXTURE_WORKER = 'false';
        assert.throws(() => cp.spawnSync(command, {shell:true}));
        process.env.PLAN0124_FIXTURE_WORKER = 'true';
        const result = cp.spawnSync(command, {shell:true});
        assert.equal(result.status, 0);
        assert.equal(fs.readFileSync(process.env.PLAN0124_EGRESS_LOG, 'utf8'), 'child-process\\n'.repeat(5));
        await closed;
        assert.throws(() => cp.spawnSync(command, {shell:true}));
      } finally { child.kill(); }
    })().catch(error=>{console.error(error.message);process.exitCode=1;});
  `;
    try {
      execFileSync(process.execPath, ['-e', code], {
        env: {
          ...process.env,
          NODE_OPTIONS: guardNodeOptions(guard),
          PLAN0124_EGRESS_LOG: log,
          PLAN0124_FIXTURE_WORKER: 'true',
          PLAN0124_BROWSER_EXECUTABLE: process.execPath,
          PLAN0124_TASKKILL_EXECUTABLE: resolve(process.env.SystemRoot, 'System32/taskkill.exe'),
        },
        stdio: 'pipe',
        timeout: 30_000,
      });
      assert.equal(existsSync(log), true);
      assert.equal(readFileSync(log, 'utf8'), 'child-process\n'.repeat(6));
      assert.ok(readFileSync(log + '.allowed', 'utf8').includes('owned-chromium-cleanup\n'));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test('build acceptance rejects even a loopback request to the synthetic Sentry sink', async () => {
  const { assertNoBuildSinkRequests } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof assertNoBuildSinkRequests, 'function');
  assert.doesNotThrow(() => assertNoBuildSinkRequests(0));
  assert.throws(() => assertNoBuildSinkRequests(1), /build.*sink/i);
});

test('post-process cleanup retries only bounded transient Windows failures', async () => {
  const { cleanupAfterProcessesClose } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof cleanupAfterProcessesClose, 'function');
  let attempts = 0;
  const delays = [];
  const retries = [];
  await cleanupAfterProcessesClose('build-fixture', 'base', {
    remove: () => {
      attempts++;
      if (attempts < 3) throw Object.assign(new Error('locked'), { code: 'EPERM' });
    },
    pause: async (ms) => {
      delays.push(ms);
    },
    onRetry: (event) => retries.push(event),
  });
  assert.equal(attempts, 3);
  assert.equal(delays.length, 2);
  assert.deepEqual(
    retries.map((event) => event.code),
    ['EPERM', 'EPERM'],
  );
});

test('cleanup preserves permanent and exhausted errors rather than reporting success', async () => {
  const { cleanupAfterProcessesClose } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof cleanupAfterProcessesClose, 'function');
  const permanent = Object.assign(new Error('unsafe'), { code: 'EACCES' });
  await assert.rejects(
    () =>
      cleanupAfterProcessesClose('build-fixture', 'base', {
        remove: () => {
          throw permanent;
        },
        pause: async () => {
          throw new Error('unexpected retry');
        },
      }),
    (error) => error === permanent,
  );
  const transient = Object.assign(new Error('locked'), { code: 'EBUSY' });
  let attempts = 0;
  await assert.rejects(
    () =>
      cleanupAfterProcessesClose('build-fixture', 'base', {
        remove: () => {
          attempts++;
          throw transient;
        },
        pause: async () => {},
      }),
    (error) => error === transient,
  );
  assert.equal(attempts, 4);
});

test('Docker credentials and context cannot select a remote daemon', async () => {
  const { localDockerEnv } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof localDockerEnv, 'function');
  const parent = {
    DOCKER_HOST: 'tcp://remote.invalid:2376',
    DOCKER_CONTEXT: 'remote',
    DOCKER_TLS_VERIFY: '1',
    DOCKER_CERT_PATH: 'private-path',
    PATH: 'local-path',
  };
  const windows = localDockerEnv(parent, 'win32');
  assert.equal(windows.DOCKER_HOST, 'npipe:////./pipe/docker_engine');
  for (const key of ['DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'])
    assert.equal(windows[key], undefined);
  assert.equal(parent.DOCKER_CONTEXT, 'remote');
  assert.equal(localDockerEnv(parent, 'linux').DOCKER_HOST, 'unix:///var/run/docker.sock');
});

test('the auth-allowlisted application port must be free and never reuses a server', async () => {
  const { assertAppPortAvailable } = await import('./run-plan-0124-local.mjs');
  assert.equal(typeof assertAppPortAvailable, 'function');
  const { createServer } = await import('node:net');
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    await assert.rejects(() => assertAppPortAvailable(port), /port.*occupied/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  await assertAppPortAvailable(port);
});

test('fixture Docker allowlist preserves SQL fixtures but denies secret and transport consumers', async () => {
  const { classifyDockerCommand } = await import('./run-plan-0124-local.mjs');
  const prefix = [
    'exec',
    'supabase_db_saas-boilerplate',
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
  ];
  assert.equal(classifyDockerCommand([...prefix, 'SELECT count(*) FROM public.profiles']), 'psql');
  for (const sql of [
    'SELECT decrypted_secret FROM vault.decrypted_secrets',
    "SELECT net.http_get('https://remote.invalid')",
    "COPY auth.users TO PROGRAM 'bad'",
    "SELECT pg_read_file('private')",
  ])
    assert.equal(classifyDockerCommand([...prefix, sql]), null);
  assert.equal(classifyDockerCommand(['exec', 'unrelated-project', 'psql']), null);
});

test('generated E2E config and automatic fixture compile without importing the private config', async () => {
  const { writeE2eHarness, requiredE2eSpecs, assertScratchPath } =
    await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const ts = await import('typescript');
  const scratch = mkdtempSync(resolve(tmpdir(), 'plan0124-harness-'));
  try {
    const tests = resolve(scratch, 'src/test/e2e');
    mkdirSync(tests, { recursive: true });
    for (const name of requiredE2eSpecs)
      writeFileSync(resolve(tests, name), "import {test} from '@playwright/test';\n");
    writeFileSync(
      resolve(scratch, 'playwright.config.ts'),
      "throw new Error('PRIVATE CONFIG MUST NOT LOAD');",
    );
    const config = writeE2eHarness(
      scratch,
      'http://127.0.0.1:3000',
      resolve(scratch, 'egress.log'),
    );
    assert.ok(
      readFileSync(config, 'utf8').includes(
        'executablePath:process.env.PLAN0124_BROWSER_EXECUTABLE',
      ),
    );
    for (const path of [config, resolve(scratch, 'src/test/plan0124-base.ts')]) {
      const source = readFileSync(path, 'utf8');
      const result = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        reportDiagnostics: true,
      });
      assert.deepEqual(result.diagnostics, []);
      assert.equal(source.includes('.env.local'), false);
    }
    const fixture = readFileSync(resolve(scratch, 'src/test/plan0124-base.ts'), 'utf8');
    assert.ok(fixture.includes("'browser\\n'"));
    assert.ok(fixture.includes('guardBrowserContexts(browser,context'));
    assert.ok(
      readFileSync(resolve(scratch, 'scripts/plan0124-browser-guard.mjs'), 'utf8').includes(
        "target.route('**/*'",
      ),
    );
  } finally {
    assertScratchPath(scratch, tmpdir(), 'plan0124-harness-');
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('only one supported mode is accepted', () => {
  assert.equal(parseMode(['--build']), '--build');
  assert.equal(parseMode(['--e2e']), '--e2e');
  for (const args of [[], ['--remote'], ['--build', '--e2e']]) assert.throws(() => parseMode(args));
});
test('hosting and custom targets are rejected even when false-like', () => {
  for (const key of ['VERCEL', 'VERCEL_ENV', 'GITHUB_ACTIONS', 'CI', 'PLAYWRIGHT_BASE_URL'])
    assert.throws(() => assertLocalParent({ [key]: 'false' }));
  assert.throws(() => assertLocalParent({ SITE_URL: 'https://example.com' }));
  assert.doesNotThrow(() => assertLocalParent({ SITE_URL: 'http://localhost:3000' }));
});
test('loopback validation rejects deceptive hostnames and remote addresses', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', '[::1]'])
    assert.equal(isLoopback(host), true);
  for (const host of ['localhost.evil.test', '127.0.0.1.evil', '0.0.0.0', '192.168.1.1'])
    assert.equal(isLoopback(host), false);
});
test('copy excludes private material, traversal and symlink paths', () => {
  for (const path of [
    '.env',
    '.env.local',
    '.env.example',
    '.git/config',
    '.codex/a',
    'secrets/key.pem',
    '../escape',
    'a/../../escape',
    'a.key',
    'private.txt',
  ])
    assert.equal(safeSourcePath(path), false, path);
  assert.equal(safeSourcePath('src/env.ts'), true);
});
test('local credentials stay in env and untrusted inherited secrets are absent', () => {
  const env = makeLocalEnv(
    {
      API_URL: 'http://127.0.0.1:54321',
      ANON_KEY: 'local-anon',
      SERVICE_ROLE_KEY: 'local-service',
      INBUCKET_URL: 'http://127.0.0.1:54324',
      AUTH_SITE_URL: 'http://localhost:3000',
    },
    { PATH: 'tools', SENTRY_AUTH_TOKEN: 'cloud-secret' },
  );
  assert.equal(env.SUPABASE_SECRET_KEY, 'local-service');
  assert.equal(env.SENTRY_AUTH_TOKEN, 'plan-0124-synthetic-no-upload');
  assert.equal(env.LOCAL_VALIDATION, undefined);
  assert.throws(() => makeLocalEnv({ API_URL: 'https://hosted.supabase.co' }, {}));
});

test('network guard blocks remote fetch and native executables, records no secrets', async () => {
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const { networkGuard } = await import('./run-plan-0124-local.mjs');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan0124-guard-test-'));
  try {
    const guard = resolve(directory, 'guard.cjs');
    const log = resolve(directory, 'egress.log');
    writeFileSync(guard, networkGuard);
    for (const code of [
      "fetch('https://example.com/private?secret=do-not-record').catch(()=>{})",
      "require('node:child_process').spawn('curl',['https://example.com'])",
    ]) {
      try {
        execFileSync(process.execPath, ['--require', guard, '-e', code], {
          env: { ...process.env, PLAN0124_EGRESS_LOG: log },
          stdio: 'pipe',
        });
      } catch {
        /* Expected blocked child */
      }
    }
    assert.equal(readFileSync(log, 'utf8'), 'fetch\nchild-process\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('scratch cleanup rejects parent, nested and outside targets before removal', async () => {
  const { assertScratchPath, failureClass } = await import('./run-plan-0124-local.mjs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  assert.doesNotThrow(() => assertScratchPath(resolve(tmpdir(), 'iroko-plan0124-safe')));
  for (const path of [
    tmpdir(),
    resolve(tmpdir(), 'other'),
    resolve(tmpdir(), 'iroko-plan0124-safe', 'nested'),
    resolve(tmpdir(), '..', 'iroko-plan0124-safe'),
  ])
    assert.throws(() => assertScratchPath(path));
  assert.equal(
    failureClass('symlink outside filesystem root secret=do-not-print'),
    'SYMLINK_OUTSIDE_ROOT',
  );
  assert.equal(failureClass('unrecognized raw secret'), 'UNCLASSIFIED');
});

test('failure diagnostics remove env secrets URLs paths and unrelated output', async () => {
  const { safeBuildDiagnostic } = await import('./run-plan-0124-local.mjs');
  const output =
    'unrelated secret context\nError token=secret-token-value https://remote.test/key C:\\Users\\person\\private.txt\nCannot find module "/Users/name/private/file"';
  const safe = safeBuildDiagnostic(output, { TOKEN: 'secret-token-value' });
  assert.ok(!safe.includes('secret-token-value'));
  assert.ok(!safe.includes('remote.test'));
  assert.ok(!safe.includes('person'));
  assert.ok(!safe.includes('/Users/name'));
  assert.ok(!safe.includes('unrelated'));
  assert.ok(safe.includes('Error token=[redacted]'));
});

test('Windows guard preload path survives NODE_OPTIONS parsing in owned child', async () => {
  const { guardNodeOptions } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan0124-path-test-'));
  try {
    const guard = resolve(directory, 'guard with spaces.cjs');
    writeFileSync(guard, 'globalThis.plan0124GuardLoaded = true;');
    const output = execFileSync(
      process.execPath,
      ['-e', 'process.stdout.write(String(globalThis.plan0124GuardLoaded))'],
      {
        env: { ...process.env, NODE_OPTIONS: guardNodeOptions(guard) },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    assert.equal(output, 'true');
    assert.equal(
      guardNodeOptions('C:\\Users\\safe\\guard.cjs'),
      '--require="C:/Users/safe/guard.cjs"',
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('bounded task scratch cleanup allows only exact build directory', async () => {
  const { assertScratchPath } = await import('./run-plan-0124-local.mjs');
  const { resolve } = await import('node:path');
  const base = resolve(process.cwd(), '.superpowers/sdd/012-4-csp-and-secrets');
  assert.doesNotThrow(() => assertScratchPath(resolve(base, 'build-Ab123'), base, 'build-'));
  for (const target of [
    base,
    resolve(base, 'build-'),
    resolve(base, 'build-Ab123', 'nested'),
    resolve(base, '..', 'build-Ab123'),
  ])
    assert.throws(() => assertScratchPath(target, base, 'build-'));
});

test('empty Git boundary prevents installed Tailwind from scanning ignored dependency sources', async () => {
  const { createRequire } = await import('node:module');
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { resolve, join, dirname, basename } = await import('node:path');
  const require = createRequire(import.meta.url);
  const postcssRequire = createRequire(require.resolve('@tailwindcss/postcss'));
  const { Scanner } = postcssRequire('@tailwindcss/oxide');
  const taskRoot = resolve(process.cwd(), '.superpowers/sdd/012-4-csp-and-secrets');
  mkdirSync(taskRoot, { recursive: true });
  const base = mkdtempSync(join(taskRoot, 'scanner-probe-'));
  try {
    mkdirSync(join(base, 'node_modules'));
    mkdirSync(join(base, 'src'));
    writeFileSync(join(base, '.gitignore'), '/node_modules\n');
    writeFileSync(join(base, 'src/app.tsx'), 'text-blue-500');
    writeFileSync(join(base, 'node_modules/ignored.js'), 'text-red-500');
    const before = new Scanner({ sources: [{ base, pattern: '**/*', negated: false }] });
    before.scan();
    assert.equal(
      before.files.some((file) => file.includes('node_modules')),
      true,
    );
    mkdirSync(join(base, '.git'));
    const after = new Scanner({ sources: [{ base, pattern: '**/*', negated: false }] });
    after.scan();
    assert.equal(
      after.files.some((file) => file.includes('node_modules')),
      false,
    );
    assert.ok(after.files.some((file) => file.endsWith('app.tsx')));
  } finally {
    if (dirname(base) !== taskRoot || !/^scanner-probe-[a-zA-Z0-9]+$/.test(basename(base)))
      throw new Error('Unsafe scanner fixture cleanup');
    rmSync(base, { recursive: true, force: true });
  }
});

test('same-Node trusted worker inherits forced guard while arbitrary modules and eval remain blocked', async () => {
  const { networkGuard, guardNodeOptions } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan0124-worker-test-'));
  try {
    const buildRoot = resolve(directory, '.next');
    mkdirSync(buildRoot);
    const worker = resolve(buildRoot, 'worker.cjs');
    const arbitrary = resolve(directory, 'arbitrary.cjs');
    const guard = resolve(directory, 'guard.cjs');
    const log = resolve(directory, 'egress.log');
    writeFileSync(guard, networkGuard);
    writeFileSync(worker, "fetch('https://example.com').catch(()=>{});");
    writeFileSync(arbitrary, '');
    const env = {
      ...process.env,
      NODE_OPTIONS: guardNodeOptions(guard),
      PLAN0124_EGRESS_LOG: log,
      PLAN0124_BUILD_ROOT: buildRoot,
    };
    const code = `const cp=require('node:child_process'); const child=cp.spawn(process.execPath,[${JSON.stringify(worker)}],{env:{},stdio:'ignore'});child.on('exit',()=>{});`;
    execFileSync(process.execPath, ['-e', code], { env, stdio: 'pipe' });
    assert.equal(readFileSync(log + '.allowed', 'utf8'), 'guarded-next-worker\n');
    assert.equal(readFileSync(log, 'utf8'), 'fetch\n');
    for (const argv of [[arbitrary], ['-e', ''], [resolve(buildRoot, 'missing.cjs')]]) {
      assert.throws(() =>
        execFileSync(
          process.execPath,
          ['-e', `require('node:child_process').spawn(process.execPath,${JSON.stringify(argv)})`],
          { env, stdio: 'pipe' },
        ),
      );
    }
    assert.equal(readFileSync(log, 'utf8'), 'fetch\nchild-process\nchild-process\nchild-process\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Git exception permits only exact read-only revision without custom shell or env', async () => {
  const { networkGuard, guardNodeOptions } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan0124-git-test-'));
  try {
    const guard = resolve(directory, 'guard.cjs');
    const log = resolve(directory, 'egress.log');
    writeFileSync(guard, networkGuard);
    const env = { ...process.env, NODE_OPTIONS: guardNodeOptions(guard), PLAN0124_EGRESS_LOG: log };
    execFileSync(
      process.execPath,
      ['-e', "require('node:child_process').execSync('git rev-parse HEAD',{stdio:'pipe'})"],
      { env, stdio: 'pipe' },
    );
    assert.equal(readFileSync(log + '.allowed', 'utf8'), 'git-revision\n');
    for (const code of [
      "execSync('git fetch',{stdio:'pipe'})",
      "execSync('git rev-parse HEAD',{env:{},stdio:'pipe'})",
      "execSync('git rev-parse HEAD',{shell:'cmd.exe',stdio:'pipe'})",
    ]) {
      assert.throws(() =>
        execFileSync(process.execPath, ['-e', `require('node:child_process').${code}`], {
          env,
          stdio: 'pipe',
        }),
      );
    }
    assert.equal(readFileSync(log, 'utf8'), 'child-process\nchild-process\nchild-process\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('HTTP socket and DNS guards block remote destinations while local HTTP works', async () => {
  const { networkGuard, guardNodeOptions } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan0124-socket-test-'));
  try {
    const guard = resolve(directory, 'guard.cjs');
    const log = resolve(directory, 'egress.log');
    writeFileSync(guard, networkGuard);
    const env = { ...process.env, NODE_OPTIONS: guardNodeOptions(guard), PLAN0124_EGRESS_LOG: log };
    const local =
      "const http=require('node:http');const server=http.createServer((_,res)=>res.end('local'));server.listen(0,'127.0.0.1',()=>http.get('http://127.0.0.1:'+server.address().port,res=>{res.on('data',chunk=>process.stdout.write(chunk));res.on('end',()=>server.close());}));";
    assert.equal(
      execFileSync(process.execPath, ['-e', local], { env, encoding: 'utf8', stdio: 'pipe' }),
      'local',
    );
    assert.equal(existsSync(log), false);
    for (const code of [
      "require('node:http').get('http://192.0.2.1')",
      "require('node:dns').lookup('example.com',()=>{})",
    ])
      assert.throws(() => execFileSync(process.execPath, ['-e', code], { env, stdio: 'pipe' }));
    assert.equal(readFileSync(log, 'utf8'), 'socket\ndns\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('installed TypeScript CLI stays guarded and rejects projects outside scratch', async () => {
  const { networkGuard, guardNodeOptions } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan0124-tsc-test-'));
  try {
    const buildRoot = resolve(directory, '.next');
    mkdirSync(buildRoot);
    const compiler = resolve(directory, 'tsc');
    const guard = resolve(directory, 'guard.cjs');
    const log = resolve(directory, 'egress.log');
    const project = resolve(directory, 'tsconfig.json');
    writeFileSync(guard, networkGuard);
    writeFileSync(project, '{}');
    writeFileSync(compiler, "fetch('https://example.com').catch(()=>{});");
    const env = {
      ...process.env,
      NODE_OPTIONS: guardNodeOptions(guard),
      PLAN0124_EGRESS_LOG: log,
      PLAN0124_TSC_ENTRY: compiler,
      PLAN0124_SCRATCH_ROOT: directory,
      PLAN0124_BUILD_ROOT: buildRoot,
    };
    const invoke = (argv) =>
      execFileSync(
        process.execPath,
        [
          '-e',
          `const child=require('node:child_process').spawn(process.execPath,${JSON.stringify(argv)},{cwd:${JSON.stringify(directory)},env:{},stdio:'ignore'});child.on('exit',()=>{});`,
        ],
        { env, stdio: 'pipe' },
      );
    invoke([compiler, '--showConfig', '--project', project, '--pretty', 'false']);
    assert.equal(readFileSync(log + '.allowed', 'utf8'), 'guarded-typescript-cli\n');
    assert.equal(readFileSync(log, 'utf8'), 'fetch\n');
    for (const argv of [
      [compiler, '--project', resolve(directory, '..', 'outside.json')],
      [compiler, '--tsBuildInfoFile', resolve(directory, 'outside.tsbuildinfo')],
      [compiler, '--eval', 'bad'],
    ])
      assert.throws(() => invoke(argv));
    assert.equal(readFileSync(log, 'utf8'), 'fetch\nchild-process\nchild-process\nchild-process\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('trusted fork restores protected env while arbitrary entry points and preloads are blocked', async () => {
  const { networkGuard, guardNodeOptions } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan0124-fork-test-'));
  try {
    const buildRoot = resolve(directory, '.next');
    mkdirSync(buildRoot);
    const worker = resolve(buildRoot, 'worker.cjs');
    const arbitrary = resolve(directory, 'arbitrary.cjs');
    const guard = resolve(directory, 'guard.cjs');
    const log = resolve(directory, 'egress.log');
    writeFileSync(guard, networkGuard);
    writeFileSync(arbitrary, '');
    writeFileSync(worker, "fetch('https://example.com').catch(()=>process.disconnect());");
    const env = {
      ...process.env,
      NODE_OPTIONS: guardNodeOptions(guard),
      PLAN0124_EGRESS_LOG: log,
      PLAN0124_BUILD_ROOT: buildRoot,
    };
    const code = `const child=require('node:child_process').fork(${JSON.stringify(worker)},[],{env:{NODE_OPTIONS:'--max-old-space-size=256'},stdio:'ignore'});child.on('exit',()=>{});`;
    execFileSync(process.execPath, ['-e', code], { env, stdio: 'pipe' });
    assert.equal(readFileSync(log, 'utf8'), 'fetch\n');
    for (const [entry, opts] of [
      [arbitrary, {}],
      [worker, { execArgv: ['--eval', ''] }],
      [worker, { execArgv: ['-r', 'other.cjs'] }],
      [worker, { execPath: 'other-node.exe' }],
    ])
      assert.throws(() =>
        execFileSync(
          process.execPath,
          [
            '-e',
            `require('node:child_process').fork(${JSON.stringify(entry)},[],${JSON.stringify(opts)})`,
          ],
          { env, stdio: 'pipe' },
        ),
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('scratch cleanup removes owned junction without deleting its dependency target', async () => {
  const { cleanupScratch } = await import('./run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, rmSync } =
    await import('node:fs');
  const { resolve, join, dirname, basename } = await import('node:path');
  const base = resolve('.superpowers/sdd/012-4-csp-and-secrets');
  mkdirSync(base, { recursive: true });
  const scratch = mkdtempSync(join(base, 'build-'));
  const dependencies = mkdtempSync(join(base, 'cleanup-target-'));
  try {
    writeFileSync(join(dependencies, 'preserve.txt'), 'dependency target retained');
    symlinkSync(
      dependencies,
      join(scratch, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    writeFileSync(join(scratch, 'source.ts'), '');
    cleanupScratch(scratch, base);
    assert.equal(existsSync(scratch), false);
    assert.equal(
      readFileSync(join(dependencies, 'preserve.txt'), 'utf8'),
      'dependency target retained',
    );
    assert.throws(() => cleanupScratch(dependencies, base));
    assert.equal(existsSync(dependencies), true);
  } finally {
    if (existsSync(scratch)) cleanupScratch(scratch, base);
    if (
      dirname(dependencies) !== base ||
      !/^cleanup-target-[a-zA-Z0-9]+$/.test(basename(dependencies))
    )
      throw new Error('Unsafe fixture cleanup');
    rmSync(dependencies, { recursive: true, force: true });
  }
});
