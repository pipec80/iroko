import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  assertP1Acceptance,
  expectedP1Cases,
  withPlan017Lifecycle,
} from '../run-plan-017-local.mjs';
import {
  classifyDockerCommand,
  createOwnedServerDiagnostics,
  preflightOwnedLogin,
  watchOwnedProcess,
} from '../run-plan-0124-local.mjs';
import { EventEmitter } from 'node:events';

test('offered core selection accepts analytics7 and active-account1 but rejects deferred swaps', () => {
  const cases = [
    ...Array.from({ length: 7 }, (_, index) => ({
      file: 'analytics.spec.ts',
      title: `privacy ${index}`,
      statuses: ['passed'],
    })),
    { file: 'active-account.spec.ts', title: 'core account switching', statuses: ['passed'] },
  ];
  const specs = ['analytics.spec.ts', 'active-account.spec.ts'];
  const stats = { expected: 8, skipped: 0, unexpected: 0, flaky: 0 };
  assert.doesNotThrow(() => assertP1Acceptance(stats, cases, specs, false));
  assert.throws(() => assertP1Acceptance(stats, cases, specs, true));
  assert.throws(() =>
    assertP1Acceptance(
      stats,
      cases.map((entry, index) => (index ? entry : { ...entry, title: '@projects-enabled' })),
      specs,
      false,
    ),
  );
  assert.throws(() =>
    assertP1Acceptance(
      { expected: 4 },
      Array.from({ length: 4 }, (_, index) => ({
        file: 'document-editor.spec.ts',
        title: `editor ${index}`,
        statuses: ['passed'],
      })),
      ['document-editor.spec.ts'],
      false,
    ),
  );
});

test('owned diagnostics detect Next memory restarts without retaining raw messages', () => {
  const diagnostics = createOwnedServerDiagnostics();
  diagnostics.observe(
    'Server is approaching the used memory threshold, restarting... secret=never-retain',
  );
  assert.deepEqual(
    diagnostics.snapshot().events.map(({ event }) => event),
    ['memory-restart'],
  );
  assert.equal(JSON.stringify(diagnostics.snapshot()).includes('never-retain'), false);
});

test('CLI cancellation waits for cleanup and removes signal listeners', async () => {
  const events = new EventEmitter();
  const lines = [];
  let cleaned = false;
  const pending = withPlan017Lifecycle(
    async ({ signal, onProgress }) => {
      onProgress('compiling-login');
      try {
        await new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        );
      } finally {
        cleaned = true;
      }
    },
    { events, write: (line) => lines.push(line) },
  );
  events.emit('SIGINT');
  await assert.rejects(pending, /cancelled/);
  assert.equal(cleaned, true);
  assert.equal(events.listenerCount('SIGINT'), 0);
  assert.equal(events.listenerCount('SIGTERM'), 0);
  assert.ok(lines.some((line) => line.includes('compiling-login')));
  assert.ok(lines.some((line) => line.includes('cancelling')));
});

test('cancellation stops only its owned child and detaches after close', async () => {
  const controller = new AbortController();
  const owned = new EventEmitter();
  const unrelated = new EventEmitter();
  const stopped = [];
  const watcher = watchOwnedProcess(owned, controller.signal, (child) => stopped.push(child));
  controller.abort();
  await watcher.stop();
  assert.deepEqual(stopped, [owned]);
  assert.equal(stopped.includes(unrelated), false);
  owned.emit('close');
  watcher.detach();
});

test('terminator failure is awaited and repeated stop targets the child only once', async () => {
  const controller = new AbortController();
  let attempts = 0;
  const watcher = watchOwnedProcess(new EventEmitter(), controller.signal, () => {
    attempts++;
    throw new Error('terminator-failed');
  });
  controller.abort();
  await assert.rejects(watcher.stop(), /terminator-failed/);
  await assert.rejects(watcher.stop(), /terminator-failed/);
  assert.equal(attempts, 1);
  watcher.detach();
});

test('cancellation during browser allows fixture cleanup instead of killing workers', async () => {
  const events = new EventEmitter();
  const lines = [];
  let cleaned = false;
  await assert.rejects(
    withPlan017Lifecycle(
      async ({ signal, onProgress }) => {
        onProgress('running-browser');
        events.emit('SIGINT');
        assert.equal(signal.aborted, false);
        cleaned = true;
        onProgress('cleanup');
      },
      { events, write: (line) => lines.push(line) },
    ),
    /cancelled after fixture cleanup/,
  );
  assert.equal(cleaned, true);
  assert.ok(lines.some((line) => line.includes('cancellation-deferred')));
});

test('closed children are not stopped by subsequent cancellation', () => {
  const controller = new AbortController();
  const owned = new EventEmitter();
  const stopped = [];
  watchOwnedProcess(owned, controller.signal, (child) => stopped.push(child));
  owned.emit('close');
  controller.abort();
  assert.deepEqual(stopped, []);
});

test('login preflight accepts cancellation without persisting request details', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'iroko-cancel-preflight-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const controller = new AbortController();
  const pending = preflightOwnedLogin(
    'http://localhost:3000',
    folder,
    async (_url, options) => {
      await new Promise((_resolve, reject) =>
        options.signal.addEventListener('abort', () => reject(options.signal.reason), {
          once: true,
        }),
      );
    },
    controller.signal,
  );
  controller.abort(new Error('cancelled-test'));
  await assert.rejects(pending, /cancelled-test/);
  const evidence = JSON.parse(readFileSync(join(folder, 'login-preflight.json'), 'utf8'));
  assert.equal(evidence.outcome, 'failed');
  assert.equal(evidence.status, null);
});

test('editor acceptance includes all four draft and concurrency scenarios', () => {
  assert.equal(expectedP1Cases['document-editor.spec.ts'], 4);
});

test('owned Next diagnostics retain only fixed event labels', () => {
  const diagnostics = createOwnedServerDiagnostics();
  diagnostics.observe('Ready in 1200ms\n ○ Compiling /es/log');
  diagnostics.observe('in ...\nError: secret=should-never-appear\n');
  diagnostics.observe('Invalid environment variables: PRIVATE_VALUE=should-never-appear');
  const result = diagnostics.snapshot();
  assert.deepEqual(
    result.events.map(({ event }) => event),
    ['ready', 'compiling-login', 'server-error', 'environment-error'],
  );
  assert.ok(JSON.stringify(result).includes('environment-error'));
  assert.equal(JSON.stringify(result).includes('should-never-appear'), false);
});

test('owned login preflight records only status and elapsed time', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'iroko-login-preflight-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  let target;
  await preflightOwnedLogin('http://localhost:3000', folder, async (url) => {
    target = url.href;
    return new Response('local html', { status: 200 });
  });
  assert.equal(target, 'http://localhost:3000/es/login');
  const evidence = JSON.parse(readFileSync(join(folder, 'login-preflight.json'), 'utf8'));
  assert.equal(evidence.status, 200);
  assert.equal(evidence.outcome, 'ready');
  assert.ok(Number.isInteger(evidence.elapsedMs));
  assert.equal(Object.keys(evidence).length, 3);
  await assert.rejects(
    preflightOwnedLogin('https://example.com', folder, async () => new Response('bad')),
    /owned local application origin/,
  );
});

test('P1 acceptance rejects narrowed, skipped, duplicated and unsuccessful scenarios', () => {
  const specs = ['analytics.spec.ts', 'password-settings.spec.ts'];
  const cases = specs.flatMap((file) =>
    Array.from({ length: expectedP1Cases[file] }, (_, index) => ({
      file,
      title: `${file}-${index}`,
      statuses: ['passed'],
    })),
  );
  const stats = { expected: cases.length, skipped: 0, unexpected: 0, flaky: 0 };
  assert.doesNotThrow(() => assertP1Acceptance(stats, cases, specs));
  assert.throws(() => assertP1Acceptance({ ...stats, expected: 1 }, cases.slice(0, 1), specs));
  assert.throws(() => assertP1Acceptance(stats, [...cases.slice(1), cases.at(-1)], specs));
  for (const field of ['skipped', 'unexpected', 'flaky'])
    assert.throws(() => assertP1Acceptance({ ...stats, [field]: 1 }, cases, specs));
});

test('Vercel consent scenario must pass exactly once in the isolated local runner', () => {
  const specs = ['vercel-analytics-consent.spec.ts'];
  const cases = [{ file: specs[0], title: 'consent gate', statuses: ['passed'] }];
  const stats = { expected: 1, skipped: 0, unexpected: 0, flaky: 0 };
  assert.doesNotThrow(() => assertP1Acceptance(stats, cases, specs));
  assert.throws(() => assertP1Acceptance({ ...stats, expected: 0 }, [], specs));
  assert.throws(() => assertP1Acceptance(stats, [{ ...cases[0], statuses: ['failed'] }], specs));
});

test('Auth policy allowlist permits only exact non-secret reads', () => {
  const format =
    '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}|{{.Config.Image}}|{{range .Config.Env}}{{if eq (index (split . "=") 0) "GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION"}}{{index (split . "=") 1}}{{end}}{{end}}';
  assert.equal(
    classifyDockerCommand(['inspect', '--format', format, 'supabase_auth_saas-boilerplate']),
    'auth-inspect',
  );
  assert.equal(
    classifyDockerCommand([
      'exec',
      'supabase_auth_saas-boilerplate',
      'grep',
      '^GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=',
      '/.env',
    ]),
    'auth-policy',
  );
  assert.equal(classifyDockerCommand(['inspect', 'supabase_auth_saas-boilerplate']), null);
  assert.equal(
    classifyDockerCommand(['exec', 'supabase_auth_saas-boilerplate', 'cat', '/.env']),
    null,
  );
  assert.equal(
    classifyDockerCommand([
      'exec',
      'unrelated-auth',
      'grep',
      '^GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=',
      '/.env',
    ]),
    null,
  );
});

// Build selection is confined to scratch and never alters the repository Next config.
test('isolated compiler selection preserves 0124 default and rejects arbitrary flags', async () => {
  const { isolatedBuildArguments } = await import('../run-plan-0124-local.mjs');
  assert.deepEqual(isolatedBuildArguments(), ['build']);
  assert.deepEqual(isolatedBuildArguments('webpack'), ['build', '--webpack']);
  assert.throws(() => isolatedBuildArguments('dev'));
});

test('isolated dev server keeps loopback binding and production remains default', async () => {
  const { isolatedServerArguments } = await import('../run-plan-0124-local.mjs');
  assert.deepEqual(isolatedServerArguments('production', '3000'), [
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3000',
  ]);
  assert.deepEqual(isolatedServerArguments('development', '3000'), [
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3000',
  ]);
  assert.throws(() => isolatedServerArguments('arbitrary', '3000'));
});

test('Playwright fork remains guarded when a dev build directory does not exist yet', async () => {
  const { networkGuard, guardNodeOptions } = await import('../run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan017-dev-fork-'));
  try {
    const nextRoot = resolve(directory, 'next');
    const playwrightRoot = resolve(directory, 'playwright');
    mkdirSync(nextRoot);
    mkdirSync(playwrightRoot);
    const worker = resolve(playwrightRoot, 'workerProcessEntry.js');
    const guard = resolve(directory, 'guard.cjs');
    const log = resolve(directory, 'egress.log');
    writeFileSync(guard, networkGuard);
    writeFileSync(worker, "fetch('https://example.com').catch(()=>process.disconnect());");
    const env = {
      ...process.env,
      NODE_OPTIONS: guardNodeOptions(guard),
      PLAN0124_EGRESS_LOG: log,
      PLAN0124_NEXT_ROOT: nextRoot,
      PLAN0124_BUILD_ROOT: resolve(directory, 'not-created-yet'),
      PLAN0124_FIXTURE_WORKER: 'true',
      PLAN0124_PLAYWRIGHT_ROOT: playwrightRoot,
    };
    execFileSync(
      process.execPath,
      [
        '-e',
        `const child=require('node:child_process').fork(${JSON.stringify(worker)},[],{env:{NODE_OPTIONS:''},stdio:'ignore'});child.on('exit',()=>{});`,
      ],
      { env, stdio: 'pipe' },
    );
    assert.equal(readFileSync(log, 'utf8'), 'fetch\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Windows Rollup header probe is exact and keeps remote egress guarded', async () => {
  const { networkGuard, guardNodeOptions } = await import('../run-plan-0124-local.mjs');
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan017-rollup-probe-'));
  try {
    const guard = resolve(directory, 'guard.cjs');
    writeFileSync(guard, networkGuard);
    const script =
      "const r=require('node:process').report;r.excludeNetwork=true;console.log(JSON.stringify(r.getReport().header));";
    const env = {
      ...process.env,
      NODE_OPTIONS: guardNodeOptions(guard),
      PLAN017_WORKER_LIMIT: '2',
      PLAN0124_EGRESS_LOG: resolve(directory, 'egress.log'),
    };
    const exact = `const cp=require('node:child_process');const result=cp.spawnSync(process.execPath,['-p',${JSON.stringify(script)}],{encoding:'utf8',timeout:3000,windowsHide:true});if(result.status!==0)process.exit(1);`;
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ['-e', exact], { env, stdio: 'pipe' }),
    );
    for (const other of [
      script + "fetch('https://example.com');",
      script.replace('excludeNetwork=true', 'excludeNetwork=false'),
    ])
      assert.throws(() =>
        execFileSync(
          process.execPath,
          ['-e', exact.replace(JSON.stringify(script), JSON.stringify(other))],
          { env, stdio: 'pipe' },
        ),
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('development version metadata is synthetic only for the exact public GET', async () => {
  const { networkGuard, guardNodeOptions } = await import('../run-plan-0124-local.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan017-version-sink-'));
  try {
    const guard = resolve(directory, 'guard.cjs'),
      nextRoot = resolve(directory, 'next');
    mkdirSync(nextRoot);
    writeFileSync(resolve(nextRoot, 'package.json'), JSON.stringify({ version: '16.4.1' }));
    writeFileSync(guard, networkGuard);
    const env = {
      ...process.env,
      NODE_OPTIONS: guardNodeOptions(guard),
      NODE_ENV: 'development',
      PLAN017_WORKER_LIMIT: '2',
      PLAN0124_NEXT_ROOT: nextRoot,
      PLAN0124_EGRESS_LOG: resolve(directory, 'egress.log'),
    };
    const exact =
      "fetch('https://registry.npmjs.org/-/package/next/dist-tags').then(r=>r.json()).then(v=>{if(v.latest!=='16.4.1')process.exit(1);});";
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ['-e', exact], { env, stdio: 'pipe' }),
    );
    for (const code of [
      exact.replace('dist-tags', 'other'),
      exact.replace("dist-tags')", "dist-tags',{method:'POST'})"),
      exact.replace("dist-tags')", "dist-tags',{body:'synthetic'})"),
    ])
      assert.throws(() => execFileSync(process.execPath, ['-e', code], { env, stdio: 'pipe' }));
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ['-e', exact], {
        env: { ...env, NODE_ENV: 'production' },
        stdio: 'pipe',
      }),
    );
    const wrapped = exact.replace(
      "fetch('https://registry.npmjs.org/-/package/next/dist-tags')",
      "fetch(new Request('https://registry.npmjs.org/-/package/next/dist-tags',{headers:{authorization:'synthetic'}}))",
    );
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ['-e', wrapped], { env, stdio: 'pipe' }),
    );
    assert.throws(() =>
      execFileSync(process.execPath, ['-e', exact], {
        env: { ...env, PLAN017_WORKER_LIMIT: '' },
        stdio: 'pipe',
      }),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('only the two exact Vercel development script GETs are inert locally', async () => {
  const { isSyntheticDevelopmentScript } = await import('../run-plan-0124-local.mjs');
  const url = 'https://va.vercel-scripts.com/v1/script.debug.js';
  assert.equal(isSyntheticDevelopmentScript(url, 'GET'), true);
  assert.equal(
    isSyntheticDevelopmentScript(
      'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js',
      'GET',
    ),
    true,
  );
  for (const [target, method] of [
    [url, 'POST'],
    [url + '?secret=synthetic', 'GET'],
    [url.replace('.com', '.com.evil.invalid'), 'GET'],
    [url.replace('script.debug', 'script'), 'GET'],
  ])
    assert.equal(isSyntheticDevelopmentScript(target, method), false);
});

test('development acceptance rejects guard events written during server teardown', async () => {
  const { completeIsolatedDevelopment } = await import('../run-plan-0124-local.mjs');
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { resolve } = await import('node:path');
  const directory = mkdtempSync(resolve(tmpdir(), 'plan017-teardown-'));
  try {
    const log = resolve(directory, 'guard.log');
    await assert.rejects(() =>
      completeIsolatedDevelopment(async () => {
        writeFileSync(log, 'fetch\n');
      }, log),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('bounded P1 snapshot disables automatic upgrade checks without changing source defaults', async () => {
  const { isolatedExperimentalSettings } = await import('../run-plan-0124-local.mjs');
  const source = Object.freeze({ agentUpgrade: 'security', typedEnv: true });
  assert.deepEqual(isolatedExperimentalSettings(source, true), {
    agentUpgrade: false,
    typedEnv: true,
    cpus: 2,
  });
  assert.equal(isolatedExperimentalSettings(source, false).agentUpgrade, 'security');
  assert.equal(source.agentUpgrade, 'security');
});

test('only explicit bounded development gets cold-compilation browser budgets', async () => {
  const { isolatedE2eBudgets } = await import('../run-plan-0124-local.mjs');
  assert.deepEqual(isolatedE2eBudgets('development', true), {
    timeout: 300000,
    navigationTimeout: 90000,
  });
  assert.deepEqual(isolatedE2eBudgets('production', true), {
    timeout: 120000,
    navigationTimeout: 30000,
  });
  assert.deepEqual(isolatedE2eBudgets('development', false), {
    timeout: 120000,
    navigationTimeout: 30000,
  });
});

test('P1 synthetic environment explicitly enables local validation while 0124 stays unchanged', async () => {
  const { makeLocalEnv } = await import('../run-plan-0124-local.mjs');
  const status = {
    API_URL: 'http://127.0.0.1:54321',
    ANON_KEY: 'local-anon',
    SERVICE_ROLE_KEY: 'local-service',
    INBUCKET_URL: 'http://127.0.0.1:54324',
    AUTH_SITE_URL: 'http://localhost:3000',
  };
  assert.equal(makeLocalEnv(status, {}, true).LOCAL_VALIDATION, 'true');
  assert.equal(makeLocalEnv(status, {}).LOCAL_VALIDATION, undefined);
  assert.equal(makeLocalEnv(status, {}, true).NEXT_PUBLIC_LOCAL_VALIDATION, 'true');
  const { localE2eBudget } = await import('../../src/test/local-e2e-target.ts');
  const env = makeLocalEnv(status, {}, true);
  env.NODE_ENV = 'development';
  assert.equal(localE2eBudget(60_000, 'test', env), 300_000);
  assert.equal(localE2eBudget(20_000, 'navigation', env), 90_000);
  assert.equal(localE2eBudget(20_000, 'navigation', makeLocalEnv(status, {})), 20_000);
});

test('a remote request in a second browser context also fails shared acceptance', async () => {
  const { guardBrowserContexts } = await import('../run-plan-0124-local.mjs');
  const createContext = () => ({
    handler: undefined,
    async route(_pattern, handler) {
      this.handler = handler;
    },
  });
  const primary = createContext();
  const browser = {
    async newContext() {
      return createContext();
    },
  };
  const original = browser.newContext;
  const guard = await guardBrowserContexts(browser, primary, async (route) => route.local);
  const second = await browser.newContext();
  await primary.handler({ local: true });
  assert.doesNotThrow(() => guard.assertClean());
  await second.handler({ local: false });
  assert.throws(() => guard.assertClean(), /forbidden remote/);
  guard.restore();
  assert.equal(browser.newContext, original);
});

test('browser failure diagnostics retain only authorized locations and boolean comparison values', async () => {
  const { safeTestFailure } = await import('../run-plan-0124-local.mjs');
  const failure = safeTestFailure(
    {
      message: 'Expected: true\nReceived: false\nhttps://secret.invalid/private?token=credential',
      stack: 'at test (C:/private/password-settings.spec.ts:58:9)',
    },
    ['password-settings.spec.ts'],
  );
  assert.deepEqual(failure, {
    file: 'password-settings.spec.ts',
    line: 58,
    column: 9,
    expected: true,
    received: false,
  });
  assert.deepEqual(
    safeTestFailure(
      { message: 'Expected: credential\nReceived: secret', stack: 'at other.ts:9:9' },
      ['password-settings.spec.ts'],
    ),
    {},
  );
  assert.deepEqual(
    safeTestFailure(
      {
        message:
          'Command failed: docker exec psql private-credential\nviolates foreign key constraint "customers_account_id_fkey"',
      },
      [],
    ),
    { kind: 'sql-fixture', constraint: 'customers_account_id_fkey' },
  );
});

test('only exact installed country-flag SVG GETs receive inert local assets', async () => {
  const { isSyntheticCountryFlag } = await import('../run-plan-0124-local.mjs');
  const url = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/cl.svg';
  assert.equal(isSyntheticCountryFlag(url, 'GET'), true);
  for (const [target, method] of [
    [url, 'POST'],
    [url + '?token=synthetic', 'GET'],
    [url.replace('.net', '.net.evil.invalid'), 'GET'],
    [url.replace('/cl.svg', '/arbitrary.js'), 'GET'],
    [url.replace('https:', 'http:'), 'GET'],
  ])
    assert.equal(isSyntheticCountryFlag(target, method), false);
});
