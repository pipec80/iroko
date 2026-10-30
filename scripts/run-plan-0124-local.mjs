import { execFileSync, spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { createRequire } from 'node:module';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function parseMode(args) {
  if (args.length !== 1 || !['--build', '--e2e'].includes(args[0]))
    throw new Error('Use exactly --build or --e2e');
  return args[0];
}
export function failureClass(output) {
  output = output.replace(/\u001b\[[0-9;]*m/g, '');
  const classes = [
    ['SYMLINK_OUTSIDE_ROOT', /symlink.*outside|outside.*root|outside.*filesystem/i],
    ['NETWORK_GUARD', /Plan0124 blocked network or child execution/],
    ['MODULE_RESOLUTION', /Module not found|Cannot find module/],
    ['ENV_VALIDATION', /Invalid environment variables|environment validation/i],
    ['TURBOPACK_PANIC', /Turbopack.*(?:panic|error)|FATAL.*Turbopack/i],
    ['PERMISSION', /EPERM|EACCES/],
    ['TYPECHECK', /Type error:|Failed to compile/],
  ];
  const labels = classes.filter(([, pattern]) => pattern.test(output)).map(([label]) => label);
  const missing =
    /(?:Cannot find module|Can't resolve|Module not found:)\s*[`'"]([^`'"\r\n]+)[`'"]/.exec(
      output,
    )?.[1];
  if (missing && /^(?:@?[a-z0-9][a-z0-9@/_.-]{0,119})$/i.test(missing))
    labels.push(`missing-module:${missing}`);
  else if (missing) {
    const name = missing.split(/[/\\]/).pop();
    if (/^[a-z0-9_.-]{1,80}$/i.test(name)) labels.push(`missing-module-basename:${name}`);
  }
  return labels.join(',') || 'UNCLASSIFIED';
}
export function safeBuildDiagnostic(output, env) {
  let safe = output.replace(/\u001b\[[0-9;]*m/g, '');
  for (const value of Object.values(env)
    .filter((value) => typeof value === 'string' && value.length >= 8)
    .sort((a, b) => b.length - a.length))
    safe = safe.split(value).join('[redacted]');
  safe = safe
    .replace(/https?:\/\/[^\s'"<>]+/gi, '[url-redacted]')
    .replace(/[A-Z]:[\\/][^\r\n'"<>)]*/gi, '[path-redacted]')
    .replace(/\/(?:Users|home|tmp|var)\/[^\r\n'"<>)]*/g, '[path-redacted]');
  return safe
    .split(/\r?\n/)
    .filter((line) => /error|cannot|failed|not found|junction|symlink/i.test(line))
    .slice(0, 10)
    .map((line) => line.slice(0, 200))
    .join('\n');
}
export function assertScratchPath(scratch, base = tmpdir(), prefix = 'iroko-plan0124-') {
  const path = relative(resolve(base), resolve(scratch));
  if (
    isAbsolute(path) ||
    path.startsWith('..') ||
    !path.startsWith(prefix) ||
    !/^[a-zA-Z0-9-]+$/.test(path) ||
    path === prefix
  )
    throw new Error('Unsafe cleanup path');
}
export function guardNodeOptions(guard) {
  return `--require="${guard.replace(/\\/g, '/')}"`;
}
/** Removes only a validated task scratch; dependency junction targets remain intact. */
export function cleanupScratch(scratch, base) {
  assertScratchPath(scratch, base, 'build-');
  const junction = resolve(scratch, 'node_modules');
  if (existsSync(junction))
    rmSync(junction, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
}
/** Windows can release build file handles after process close; retry only transient removal failures. */
export async function cleanupAfterProcessesClose(
  scratch,
  base,
  {
    remove = cleanupScratch,
    pause = (ms) => new Promise((accept) => setTimeout(accept, ms)),
    onRetry = () => {},
  } = {},
) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      remove(scratch, base);
      return;
    } catch (error) {
      if (attempt === 4 || !['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)) throw error;
      onRetry({ attempt, code: error.code });
      await pause(attempt * 1000);
    }
  }
}
export function isLoopback(host) {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
}
export function localDockerEnv(parent, platform = process.platform) {
  const env = { ...parent };
  for (const key of ['DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
  env.DOCKER_HOST =
    platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock';
  return env;
}
export function assertNoBuildSinkRequests(count) {
  if (count !== 0) throw new Error('Build attempted requests to the synthetic provider sink');
}
/** Auth redirects allow port 3000; an occupied port must fail instead of reusing a server. */
export async function assertAppPortAvailable(port = 3000) {
  await new Promise((accept, reject) => {
    const server = createTcpServer();
    server.once('error', () =>
      reject(new Error('Application port is occupied; server reuse is forbidden')),
    );
    server.listen(port, '127.0.0.1', () => server.close(accept));
  });
}
export function assertLocalParent(env) {
  for (const key of Object.keys(env)) {
    if (/^(?:CI|VERCEL(?:_.*)?|GITHUB_ACTIONS|NETLIFY|CF_PAGES|PLAYWRIGHT_BASE_URL)$/.test(key))
      throw new Error(`Hosting or target marker is forbidden: ${key}`);
    if (/(?:_URL|_HOST)$/.test(key) && env[key] && !env[key].startsWith('/')) {
      let url;
      try {
        url = new URL(env[key]);
      } catch {
        throw new Error(`Invalid destination: ${key}`);
      }
      if (!isLoopback(url.hostname)) throw new Error(`Remote destination is forbidden: ${key}`);
    }
  }
}
export function safeSourcePath(path) {
  return (
    !isAbsolute(path) &&
    !path
      .split(/[/\\]/)
      .some(
        (part) =>
          part === '..' ||
          /^(?:\.env(?:\..*)?|\.git|\.agents|\.codex|\.superpowers|\.aws|node_modules|secrets?|private(?:\..*)?)$/i.test(
            part,
          ),
      ) &&
    !/\.(?:pem|key|p12|pfx|log)$/i.test(path) &&
    !/\.local(?:\.|$)/i.test(path)
  );
}
/** Accept only the official running Auth container and the owned HTTP app port. */
export function parseAuthAttestation(value) {
  const [running, project, site, ...extra] = String(value).trim().split('|');
  if (running !== 'true' || project !== 'saas-boilerplate' || extra.length)
    throw new Error('Official running local Auth container is required');
  let url;
  try {
    url = new URL(site);
  } catch {
    throw new Error('Local Auth application origin is unavailable');
  }
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '3000' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('Local Auth must use the owned loopback HTTP application origin');
  return url.origin;
}

/**
 * Confine provider proxies to the owned sink as a second boundary after browser
 * interception. Preserve Next/Sentry match conditions and destination templates.
 * @param {Awaited<ReturnType<NonNullable<import('next').NextConfig['rewrites']>>>} entries
 * @param {string} sinkUrl
 */
export function localizeExternalRewrites(entries, sinkUrl) {
  const sink = new URL(sinkUrl);
  if (
    sink.protocol !== 'http:' ||
    !isLoopback(sink.hostname) ||
    sink.username ||
    sink.password ||
    sink.search ||
    sink.hash ||
    sink.pathname !== '/'
  )
    throw new Error('Rewrite sink must be a loopback HTTP origin');
  /** @param {{source:string,destination:string}} entry */
  const localize = (entry) => {
    // Next destinations can contain named placeholders in their hostname.
    // Remove the entire authority without parsing those templates as URLs.
    const authority = /^(?:https?:)?\/\/[^/?#]+/.exec(entry.destination);
    if (!authority) return entry;
    const suffix = entry.destination.slice(authority[0].length);
    return {
      ...entry,
      destination: sink.origin + (suffix.startsWith('/') ? suffix : '/' + suffix),
    };
  };
  if (Array.isArray(entries)) return entries.map(localize);
  return {
    ...entries,
    beforeFiles: entries.beforeFiles?.map(localize) ?? [],
    afterFiles: entries.afterFiles?.map(localize) ?? [],
    fallback: entries.fallback?.map(localize) ?? [],
  };
}

export function makeLocalEnv(status, parent, boundedP1 = false) {
  for (const key of ['API_URL', 'INBUCKET_URL']) {
    if (!status[key] || !isLoopback(new URL(status[key]).hostname))
      throw new Error('Official local Supabase endpoints are required');
  }
  if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY)
    throw new Error('Local Supabase credentials are unavailable');
  const env = Object.fromEntries(
    Object.entries(parent).filter(([key]) =>
      /^(?:PATH|Path|SystemRoot|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|HOME)$/.test(
        key,
      ),
    ),
  );
  return {
    ...localDockerEnv(env),
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    ...(boundedP1 ? { LOCAL_VALIDATION: 'true', NEXT_PUBLIC_LOCAL_VALIDATION: 'true' } : {}),
    SENTRY_AUTH_TOKEN: 'plan-0124-synthetic-no-upload',
    SENTRY_UPLOAD_SOURCE_MAPS: 'false',
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
    SUPABASE_SECRET_KEY: status.SERVICE_ROLE_KEY,
    SITE_URL: parseAuthAttestation(`true|saas-boilerplate|${status.AUTH_SITE_URL ?? ''}`),
    MAILPIT_URL: status.INBUCKET_URL,
    RESEND_API_KEY: 'local-unused',
    FROM_EMAIL: 'local@example.test',
    BILLING_DEFAULT_PROVIDER: 'mock',
    ALLOW_MOCK_BILLING: 'true',
    MOCK_BILLING_SECRET: 'cd'.repeat(32),
    IMPERSONATION_COOKIE_SECRET: 'ab'.repeat(32),
    POSTHOG_HOST: 'http://127.0.0.1:1',
    NEXT_PUBLIC_POSTHOG_HOST: '/ingest',
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_local_synthetic',
    NEXT_PUBLIC_SENTRY_DSN: 'http://synthetic@127.0.0.1:1/1',
    E2E_SUPABASE_URL: status.API_URL,
    E2E_SUPABASE_PROJECT_ID: 'saas-boilerplate',
    E2E_SUPABASE_DB_CONTAINER: 'supabase_db_saas-boilerplate',
  };
}
export function classifyDockerCommand(argv) {
  if (!Array.isArray(argv) || argv.some((arg) => typeof arg !== 'string')) return null;
  const inspect = [
    'inspect',
    '--format',
    '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}',
    'supabase_db_saas-boilerplate',
  ];
  if (JSON.stringify(argv) === JSON.stringify(inspect)) return 'inspect';
  const authInspect = [
    'inspect',
    '--format',
    '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}|{{.Config.Image}}|{{range .Config.Env}}{{if eq (index (split . "=") 0) "GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION"}}{{index (split . "=") 1}}{{end}}{{end}}',
    'supabase_auth_saas-boilerplate',
  ];
  const authPolicy = [
    'exec',
    'supabase_auth_saas-boilerplate',
    'grep',
    '^GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=',
    '/.env',
  ];
  if (JSON.stringify(argv) === JSON.stringify(authInspect)) return 'auth-inspect';
  if (JSON.stringify(argv) === JSON.stringify(authPolicy)) return 'auth-policy';
  if (
    argv.length === 11 &&
    argv[0] === 'exec' &&
    argv[1] === 'supabase_db_saas-boilerplate' &&
    JSON.stringify(argv.slice(2, 9)) ===
      JSON.stringify(['psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']) &&
    ['-c', '-tAc'].includes(argv[9]) &&
    argv[10].length <= 20000 &&
    !/\b(?:COPY|PROGRAM|dblink|pg_read_file|lo_import)\b|\b(?:net|vault)\s*\./i.test(argv[10])
  )
    return 'psql';
  return null;
}

// Injected into Node workers as well as the build coordinator. Native network
// libraries are outside this guard; only exact Git metadata and protected local
// compiler/Next workers may execute. Provider CLIs remain forbidden.
export const networkGuard = String.raw`
${classifyDockerCommand.toString()}
const fs = require('node:fs');
const net = require('node:net');
const cp = require('node:child_process');
if (process.env.PLAN017_WORKER_LIMIT === '2') {
  const os = require('node:os');
  const cpus = os.cpus.bind(os);
  os.cpus = () => cpus().slice(0, 2);
  os.availableParallelism = () => 2;
}
const ownedBrowserChildren = new Map();
const ownedTaskkillExecutable = process.platform === 'win32' && process.env.PLAN0124_TASKKILL_EXECUTABLE
  ? fs.realpathSync(process.env.PLAN0124_TASKKILL_EXECUTABLE) : undefined;
const allowed = h => ['localhost','127.0.0.1','::1','[::1]'].includes(h);
function fail(kind) { fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG, kind + '\n'); throw new Error('Plan0124 blocked network or child execution'); }
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = typeof first === 'object' ? first : {port:first,host:typeof args[1] === 'string' ? args[1] : 'localhost'};
  if (!options.path && !allowed(options.host || 'localhost')) fail('socket');
  return connect.apply(this,args);
};
const lookup = require('node:dns').lookup;
require('node:dns').lookup = function(host,...args) { if (!allowed(host)) fail('dns'); return lookup.call(this,host,...args); };
const fetch = globalThis.fetch;
if (fetch) globalThis.fetch = function(input,...args) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = String(args[0]?.method ?? (typeof input === 'object' ? input.method : undefined) ?? 'GET').toUpperCase();
  // Tooling metadata has no application semantics: ignore wrapper headers and
  // child NODE_ENV differences, returning fixed local data without any egress.
  if (process.env.PLAN017_WORKER_LIMIT === '2' && url.href === 'https://registry.npmjs.org/-/package/next/dist-tags' && method === 'GET' && !args[0]?.body && !(input instanceof Request && input.body)) {
    fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed', 'synthetic-next-version\n');
    return Promise.resolve(new Response(JSON.stringify({latest:require(process.env.PLAN0124_NEXT_ROOT + '/package.json').version,canary:'0.0.0'}),{headers:{'content-type':'application/json'}}));
  }
  if (!allowed(url.hostname)) {
    if (process.env.PLAN0124_DIAGNOSTICS === 'true' && /^[a-zA-Z0-9.-]{1,120}$/.test(url.hostname)) fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details','fetch-host:' + url.hostname + '\n');
    if (process.env.PLAN0124_DIAGNOSTICS === 'true' && url.hostname === 'registry.npmjs.org') fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details','fetch-shape:' + JSON.stringify({nextVersion:url.href === 'https://registry.npmjs.org/-/package/next/dist-tags',get:method === 'GET',request:input instanceof Request,headers:Boolean(args[0]?.headers),body:Boolean(args[0]?.body),development:process.env.NODE_ENV === 'development',workerLimit:process.env.PLAN017_WORKER_LIMIT === '2'}) + '\n');
    fail('fetch');
  }
  return fetch.call(this,input,...args);
};
const fork = cp.fork;
cp.fork = function(modulePath,args,options) {
  const opts = Array.isArray(args) ? (options || {}) : (args || {});
  if (opts.execPath && opts.execPath !== process.execPath) fail('fork-executable');
  if (opts.execArgv && opts.execArgv.some(arg => /--(?:require|import|eval|loader)|^-e|^-r/.test(arg))) fail('fork-preload');
  const path = require('node:path');
  let trusted = false;
  if (process.env.NODE_OPTIONS?.includes('--require=')) {
    try {
      const actual=fs.realpathSync(modulePath);
      trusted=[process.env.PLAN0124_NEXT_ROOT,process.env.PLAN0124_BUILD_ROOT,process.env.PLAN0124_FIXTURE_WORKER==='true'?process.env.PLAN0124_PLAYWRIGHT_ROOT:undefined].filter(root=>root && fs.existsSync(root)).some(root=>{const rel=path.relative(fs.realpathSync(root),actual);return rel && !rel.startsWith('..') && !path.isAbsolute(rel);});
    } catch { trusted=false; }
  }
  if (!trusted) {
    if (process.env.PLAN0124_DIAGNOSTICS === 'true') {
      const file = path.basename(String(modulePath));
      if (/^[a-zA-Z0-9_.-]{1,80}$/.test(file)) fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details', 'fork-entry:' + file + '\n');
      fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details', 'fork-guard-present:' + Boolean(process.env.NODE_OPTIONS?.includes('--require=')) + '\n');
    }
    fail('fork-environment');
  }
  const childEnv={...process.env,...(opts.env || {})};
  for (const key of ['NODE_OPTIONS','PLAN0124_EGRESS_LOG','PLAN0124_DIAGNOSTICS','PLAN0124_NEXT_ROOT','PLAN0124_BUILD_ROOT','PLAN0124_TSC_ENTRY','PLAN0124_SCRATCH_ROOT','PLAN0124_FIXTURE_WORKER','PLAN0124_PLAYWRIGHT_ROOT','PLAN0124_BROWSER_EXECUTABLE','PLAN0124_TASKKILL_EXECUTABLE','PLAN0124_DOCKER_CONTEXT','DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) childEnv[key]=process.env[key];
  fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed','guarded-next-fork\n');
  return fork.call(this,modulePath,Array.isArray(args)?args:[],{...opts,env:childEnv});
};
// Next's worker machinery uses child_process.fork. External executables (including
// native Sentry CLI) must never launch from the isolated build process.
for (const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync']) {
  const original = cp[name];
  cp[name] = function(command,...args) {
    const argv = Array.isArray(args[0]) ? args[0] : [];
    const options = (Array.isArray(args[0]) ? args[1] : args[0]) || {};
    const rollupReport = "const r=require('node:process').report;r.excludeNetwork=true;console.log(JSON.stringify(r.getReport().header));";
    if (process.platform === 'win32' && process.env.PLAN017_WORKER_LIMIT === '2' && name === 'spawnSync' && command === process.execPath && JSON.stringify(argv) === JSON.stringify(['-p',rollupReport]) && JSON.stringify(options) === JSON.stringify({encoding:'utf8',timeout:3000,windowsHide:true})) {
      fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed', 'guarded-rollup-header-probe\n');
      return original.call(this,command,argv,{...options,env:{...process.env,NODE_OPTIONS:process.env.NODE_OPTIONS}});
    }
    // Playwright's Windows fallback uses a shell command. Rewrite only the
    // exact cleanup of a still-live Chromium child launched by this guard.
    const cleanup = /^taskkill \/pid ([1-9]\d*) \/T \/F$/.exec(String(command));
    const ownedChild = cleanup ? ownedBrowserChildren.get(Number(cleanup[1])) : undefined;
    if (process.env.PLAN0124_FIXTURE_WORKER === 'true' && name === 'spawnSync' &&
        ownedTaskkillExecutable && options.shell === true && !options.env &&
        !argv.length && ownedChild && ownedChild.exitCode === null &&
        ownedChild.signalCode === null && !ownedChild.killed) {
      fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed','owned-chromium-cleanup\n');
      return original.call(this,ownedTaskkillExecutable,['/PID',cleanup[1],'/T','/F'],
        {...options,shell:false,windowsHide:true});
    }
    if (process.env.PLAN0124_FIXTURE_WORKER === 'true' && name === 'execFileSync' && command === 'docker' && !options.shell && !options.env) {
      const inspect = ['inspect','--format','{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}','supabase_db_saas-boilerplate'];
      const operation = classifyDockerCommand(argv);
      const isInspect = operation === 'inspect';
      const psql = operation === 'psql';
      if (process.env.PLAN017_WORKER_LIMIT === '2' && ['auth-inspect','auth-policy'].includes(operation)) {
        const prefix = ['--context',process.env.PLAN0124_DOCKER_CONTEXT];
        const authIdentity = [...inspect.slice(0, -1), 'supabase_auth_saas-boilerplate'];
        const state = original.call(this,command,[...prefix,...authIdentity],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
        if (state !== 'true|saas-boilerplate') fail('docker-identity');
        fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed','local-auth-policy-read\n');
        return original.call(this,command,[...prefix,...argv],options);
      }
      if (isInspect || psql) {
        const prefix = ['--context',process.env.PLAN0124_DOCKER_CONTEXT];
        const state = original.call(this,command,[...prefix,...inspect],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
        if (state !== 'true|saas-boilerplate') fail('docker-identity');
        fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed',(isInspect?'local-docker-inspect':'local-docker-psql')+'\n');
        if (isInspect) return options.encoding ? state+'\n' : Buffer.from(state+'\n');
        return original.call(this,command,[...prefix,...argv],options);
      }
    }
    if (process.env.PLAN0124_FIXTURE_WORKER === 'true' && name === 'spawn' && !options.shell && process.env.PLAN0124_BROWSER_EXECUTABLE) {
      let browser = false;
      try { browser = fs.realpathSync(command) === fs.realpathSync(process.env.PLAN0124_BROWSER_EXECUTABLE); } catch { browser=false; }
      if (browser) {
        fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed','owned-chromium\n');
        const child = original.call(this,command,...args);
        if (Number.isSafeInteger(child.pid) && child.pid > 0) {
          ownedBrowserChildren.set(child.pid,child);
          child.once('close',()=>ownedBrowserChildren.delete(child.pid));
        }
        return child;
      }
    }
    const gitRevision = (name === 'execSync' && command === 'git rev-parse HEAD') || (name === 'execFileSync' && command === 'git' && JSON.stringify(argv) === JSON.stringify(['rev-parse','HEAD']));
    if (gitRevision && !options.shell && !options.env) {
      fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed', 'git-revision\n');
      return original.call(this,command,...args);
    }
    if (name === 'spawn' && command === process.execPath && !options.shell) {
      const path = require('node:path');
      const entry = argv.find(arg => !arg.startsWith('-'));
      const safeFlags = argv.filter(arg => arg.startsWith('-')).every(arg => /^--(?:conditions=react-server|max-old-space-size=\d+|enable-source-maps)$/.test(arg));
      let trusted = false;
      let typescript = false;
      if (entry && process.env.PLAN0124_TSC_ENTRY && process.env.PLAN0124_SCRATCH_ROOT && process.env.NODE_OPTIONS?.includes('--require=')) {
        try {
          typescript = fs.realpathSync(entry) === fs.realpathSync(process.env.PLAN0124_TSC_ENTRY) && path.resolve(options.cwd || process.cwd()) === path.resolve(process.env.PLAN0124_SCRATCH_ROOT);
          const confined = (input,root) => { const rel = path.relative(root,path.resolve(options.cwd || process.cwd(),input)); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); };
          for (let index=1; typescript && index<argv.length; index++) {
            const flag=argv[index];
            if (['--showConfig','--noEmit'].includes(flag)) continue;
            if (flag === '--project') { typescript = confined(argv[++index],process.env.PLAN0124_SCRATCH_ROOT); continue; }
            if (flag === '--tsBuildInfoFile') { typescript = confined(argv[++index],process.env.PLAN0124_BUILD_ROOT); continue; }
            if (['--pretty','--declarationMap','--emitDeclarationOnly'].includes(flag)) { typescript=argv[++index] === 'false'; continue; }
            typescript=false;
          }
        } catch { typescript=false; }
      }
      if (entry && safeFlags && /\.(?:[cm]?js)$/.test(entry) && process.env.NODE_OPTIONS?.includes('--require=')) {
        try {
          const actual = fs.realpathSync(entry);
          trusted = [process.env.PLAN0124_NEXT_ROOT, process.env.PLAN0124_BUILD_ROOT].filter(Boolean).some(root => {const rel = path.relative(fs.realpathSync(root), actual); return rel && !rel.startsWith('..') && !path.isAbsolute(rel);});
        } catch { trusted = false; }
      }
      if (trusted || typescript) {
        const childEnv = {...(options.env || process.env),NODE_OPTIONS:process.env.NODE_OPTIONS,PLAN0124_EGRESS_LOG:process.env.PLAN0124_EGRESS_LOG,PLAN0124_DIAGNOSTICS:process.env.PLAN0124_DIAGNOSTICS,PLAN0124_NEXT_ROOT:process.env.PLAN0124_NEXT_ROOT,PLAN0124_BUILD_ROOT:process.env.PLAN0124_BUILD_ROOT,PLAN0124_TSC_ENTRY:process.env.PLAN0124_TSC_ENTRY,PLAN0124_SCRATCH_ROOT:process.env.PLAN0124_SCRATCH_ROOT};
        fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.allowed', (typescript ? 'guarded-typescript-cli' : 'guarded-next-worker') + '\n');
        return original.call(this,command,argv,{...options,env:childEnv});
      }
    }
    if (process.env.PLAN0124_DIAGNOSTICS === 'true') {
      const raw = String(command).split(/[/\\]/).pop();
      const executable = /^[a-zA-Z0-9_.-]{1,80}$/.test(raw) ? raw : (/^git\s/.test(String(command)) ? 'git' : 'shell-command');
      fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details', 'child-executable:' + executable + '\n');
      fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details', 'child-method:' + name + '\n');
      for (const flag of ['--eval','-e','--require','-r','--import','--conditions','--max-old-space-size','--enable-source-maps']) {
        if (argv.some(arg => arg === flag || arg.startsWith(flag + '='))) fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details', 'child-flag:' + flag.replace(/^-+/,'') + '\n');
      }
      for (const arg of argv) {
        const file = String(arg).split(/[/\\]/).pop().replace(/[\[\]]/g,'_');
        if (/^[a-zA-Z0-9_.-]{1,80}\.(?:[cm]?js)$/.test(file)) fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details','child-entry:' + file + '\n');
        const flag = /^--([a-z][a-z0-9-]{0,60})(?:=.*)?$/.exec(String(arg))?.[1];
        if (flag) fs.appendFileSync(process.env.PLAN0124_EGRESS_LOG + '.details','child-flag:' + flag + '\n');
      }
    }
    fail('child-process');
  };
}
require('node:module').syncBuiltinESMExports();
`;

function stopOwnedProcess(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch {
      if (child.exitCode === null && !child.signalCode)
        throw new Error('Unable to stop owned process tree');
    }
  } else child.kill('SIGTERM');
}

/** Cancellation targets only a child created by this run, never a process-name scan. */
export function watchOwnedProcess(child, signal, stop = stopOwnedProcess) {
  let closed = false;
  let stopping;
  const stopOnce = () => {
    if (closed) return stopping ?? Promise.resolve();
    stopping ??= Promise.resolve().then(() => stop(child));
    return stopping;
  };
  // Rejections are awaited by the owner in finally, never thrown from EventTarget.
  const cancel = () => {
    void stopOnce().catch(() => {});
  };
  const detach = () => signal?.removeEventListener('abort', cancel);
  child.once('close', () => {
    closed = true;
    detach();
  });
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  return { stop: stopOnce, detach };
}

function runNode(args, cwd, env) {
  return new Promise((accept, reject) => {
    // Do not echo subprocess output: env validation and SDK errors can contain keys.
    const child = spawn(process.execPath, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let output = '';
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (chunk) => {
        output += chunk;
      });
    child.once('error', () => reject(new Error('Unable to start owned Node process')));
    child.once('close', (code) =>
      code === 0 ?
        accept(output)
      : reject(
          new Error(
            `Owned Node process failed (exit ${code}); class=${failureClass(output)}\n${safeBuildDiagnostic(output, env)}`,
          ),
        ),
    );
  });
}

function containsMap(directory) {
  if (!existsSync(directory)) return false;
  return readdirSync(directory, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? containsMap(resolve(directory, entry.name)) : entry.name.endsWith('.map'),
  );
}
function assetBytes(directory) {
  if (!existsSync(directory)) return 0;
  return readdirSync(directory, { withFileTypes: true }).reduce(
    (total, entry) =>
      total +
      (entry.isDirectory() ?
        assetBytes(resolve(directory, entry.name))
      : statSync(resolve(directory, entry.name)).size),
    0,
  );
}

export const requiredE2eSpecs = [
  'csp.spec.ts',
  'impersonation.spec.ts',
  'analytics.spec.ts',
  'sentry-tunnel.spec.ts',
];

/** Read the build-time Projects switch without executing application code or private environment. */
export function readOfferedProjects(configSource) {
  const ts = createRequire(import.meta.url)('typescript');
  const source = ts.createSourceFile('app.config.ts', configSource, ts.ScriptTarget.Latest, true);
  const declarations = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations);
  const config = declarations.find(
    (entry) => ts.isIdentifier(entry.name) && entry.name.text === 'appConfig',
  );
  const property = (object, name) =>
    ts.isObjectLiteralExpression(object) ?
      object.properties.find(
        (entry) => ts.isPropertyAssignment(entry) && entry.name.getText(source) === name,
      )?.initializer
    : undefined;
  const features = config?.initializer && property(config.initializer, 'features');
  const projects = features && property(features, 'projects');
  if (projects?.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (projects?.kind === ts.SyntaxKind.FalseKeyword) return false;
  throw new Error('Offered Projects configuration must be an explicit boolean literal');
}

/** Fail closed when an isolated run silently narrows the preselected offered scenario set. */
export function assertCompleteE2eAcceptance(stats, cases, offeredProjects = true) {
  if (typeof offeredProjects !== 'boolean') throw new Error('Invalid offered configuration');
  const expectedByFile = {
    'csp.spec.ts': 10,
    'analytics.spec.ts': offeredProjects ? 7 : 6,
    'impersonation.spec.ts': 4,
    'sentry-tunnel.spec.ts': 1,
  };
  const expected = offeredProjects ? 22 : 21;
  if (
    stats.expected !== expected ||
    stats.skipped ||
    stats.unexpected ||
    stats.flaky ||
    cases.length !== expected
  )
    throw new Error(
      `All ${expected} offered isolated E2E cases must pass without skips or retries`,
    );
  const counts = {};
  const seen = new Set();
  for (const entry of cases) {
    const file = entry.file.replaceAll('\\', '/').split('/').at(-1);
    const identity = `${file}:${entry.title}`;
    if (
      !Object.hasOwn(expectedByFile, file) ||
      (!offeredProjects && entry.title.includes('@projects-enabled')) ||
      entry.title.includes('@confined-017') ||
      seen.has(identity) ||
      entry.statuses.length !== 1 ||
      entry.statuses[0] !== 'passed'
    )
      throw new Error('Isolated E2E coverage contains missing, repeated or unsuccessful cases');
    seen.add(identity);
    counts[file] = (counts[file] ?? 0) + 1;
  }
  for (const [file, count] of Object.entries(expectedByFile))
    if (counts[file] !== count) throw new Error(`Incomplete isolated E2E coverage: ${file}`);
}
export const turnstileStub = String.raw`(()=>{const widgets=new Map();let sequence=0;const token='plan0124-local-captcha';const complete=id=>{widgets.get(id)?.callback?.(token);};window.turnstile={ready:callback=>callback(),render:(_element,options={})=>{const id='local-'+(++sequence);widgets.set(id,options);setTimeout(()=>complete(id),0);return id;},reset:id=>setTimeout(()=>complete(id),0),getResponse:()=>token,isExpired:()=>false,remove:id=>widgets.delete(id),execute:id=>setTimeout(()=>complete(id),0)};const source=document.currentScript?.src;const callback=source?new URL(source).searchParams.get('onload'):null;if(callback)setTimeout(()=>window[callback]?.(),0);})();`;

/** Development-only Vercel debug assets are inert local scripts, never provider requests. */
export function isSyntheticDevelopmentScript(url, method) {
  return (
    method === 'GET' &&
    [
      'https://va.vercel-scripts.com/v1/script.debug.js',
      'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js',
    ].includes(url)
  );
}

/** react-country-flag's exact installed SVG asset shape is an inert local image. */
export function isSyntheticCountryFlag(url, method) {
  return (
    method === 'GET' &&
    /^https:\/\/cdn\.jsdelivr\.net\/gh\/lipis\/flag-icons\/flags\/4x3\/[a-z]{2}\.svg$/.test(url)
  );
}

/** Creates only scratch configuration; original Playwright env loading is never imported. */
export function isolatedE2eBudgets(runtime, boundedP1) {
  return runtime === 'development' && boundedP1 ?
      { timeout: 300000, navigationTimeout: 90000 }
    : { timeout: 120000, navigationTimeout: 30000 };
}

/** Every context created during a scenario shares one fail-closed egress count. */
export async function guardBrowserContexts(browser, context, handle) {
  let blocked = 0;
  const install = (target) =>
    target.route('**/*', async (route) => {
      if ((await handle(route)) === false) blocked++;
    });
  const original = browser.newContext;
  browser.newContext = async function (...args) {
    const target = await original.apply(this, args);
    await install(target);
    return target;
  };
  try {
    await install(context);
  } catch (error) {
    browser.newContext = original;
    throw error;
  }
  return {
    restore() {
      browser.newContext = original;
    },
    assertClean() {
      if (blocked) throw new Error('Browser attempted forbidden remote requests');
    },
  };
}

export function writeE2eHarness(
  scratch,
  baseURL,
  guardLog,
  specs = requiredE2eSpecs,
  runtime = 'production',
  boundedP1 = false,
  offeredProjects = true,
) {
  if (typeof offeredProjects !== 'boolean') throw new Error('Invalid offered configuration');
  const budgets = isolatedE2eBudgets(runtime, boundedP1);
  const directory = resolve(scratch, 'src/test/e2e');
  for (const name of specs)
    if (!existsSync(resolve(directory, name)))
      throw new Error(`Required E2E spec missing: ${name}`);
  const baseFile = resolve(scratch, 'src/test/plan0124-base.ts');
  const browserGuardFile = resolve(scratch, 'scripts/plan0124-browser-guard.mjs');
  mkdirSync(dirname(browserGuardFile), { recursive: true });
  writeFileSync(browserGuardFile, `export ${guardBrowserContexts.toString()}\n`);
  const rewrite = (folder) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      if (entry.isDirectory()) rewrite(path);
      else if (/\.tsx?$/.test(entry.name)) {
        let modulePath = relative(dirname(path), baseFile).replace(/\\/g, '/').replace(/\.ts$/, '');
        if (!modulePath.startsWith('.')) modulePath = './' + modulePath;
        writeFileSync(
          path,
          readFileSync(path, 'utf8').replaceAll("'@playwright/test'", JSON.stringify(modulePath)),
        );
      }
    }
  };
  rewrite(directory);
  writeFileSync(
    baseFile,
    `import { test as base } from '@playwright/test';\nimport { appendFileSync } from 'node:fs';\nimport { guardBrowserContexts } from '../../scripts/plan0124-browser-guard.mjs';\nexport * from '@playwright/test';\nexport const test=base.extend<{plan0124Guard:void}>({plan0124Guard:[async({context,browser},use)=>{const guard=await guardBrowserContexts(browser,context,async(route:import('@playwright/test').Route)=>{const url=new URL(route.request().url());if(process.env.PLAN017_WORKER_LIMIT==='2'&&(${isSyntheticCountryFlag.toString()})(url.href,route.request().method()))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"/>'});if(process.env.PLAN017_WORKER_LIMIT==='2'&&(${isSyntheticDevelopmentScript.toString()})(url.href,route.request().method()))return route.fulfill({contentType:'application/javascript',body:'// inert local Vercel debug asset'});if(url.hostname==='challenges.cloudflare.com'&&url.pathname==='/turnstile/v0/api.js'&&route.request().method()==='GET')return route.fulfill({contentType:'application/javascript',body:${JSON.stringify(turnstileStub)}});if(url.pathname.startsWith('/ingest/')&&['localhost','127.0.0.1'].includes(url.hostname))return route.fulfill({contentType:url.pathname.endsWith('.js')?'application/javascript':'application/json',body:url.pathname.endsWith('.js')?'// local synthetic PostHog':JSON.stringify({status:1})});if(['localhost','127.0.0.1','[::1]'].includes(url.hostname)||['data:','blob:'].includes(url.protocol))return route.continue();if(/^[a-zA-Z0-9.-]{1,120}$/.test(url.hostname))appendFileSync(${JSON.stringify(guardLog)}+".details","browser-host:"+url.hostname+"\\n");appendFileSync(${JSON.stringify(guardLog)},'browser\\n');await route.abort();return false;});try{await use();}finally{guard.restore();guard.assertClean();}},{auto:true}]});\n`,
  );
  const config = resolve(scratch, 'plan0124-playwright.config.ts');
  writeFileSync(
    config,
    `import {defineConfig,devices} from '@playwright/test';\nexport default defineConfig({testDir:'./src/test/e2e',testMatch:${JSON.stringify(specs)},testIgnore:${JSON.stringify(offeredProjects ? ['**/projects-disabled.spec.ts'] : ['**/projects.spec.ts', '**/document-editor.spec.ts'])},forbidOnly:true,fullyParallel:false,workers:1,retries:0,timeout:${budgets.timeout},grepInvert:/Cloud @smoke: a real envelope through \\/sentry-tunnel reaches Sentry$${offeredProjects ? '' : '|@projects-enabled'}${boundedP1 ? '' : '|@confined-017'}/,reporter:[['json',{outputFile:'plan0124-results.json'}]],use:{...devices['Desktop Chrome'],baseURL:${JSON.stringify(baseURL)},serviceWorkers:'block',navigationTimeout:${budgets.navigationTimeout},trace:'off',screenshot:'off',launchOptions:{executablePath:process.env.PLAN0124_BROWSER_EXECUTABLE,args:['--disable-background-networking','--disable-component-update','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1']}}});\n`,
  );
  const fixture = resolve(scratch, 'src/app/[locale]/csp-runtime-error/page.tsx');
  mkdirSync(dirname(fixture), { recursive: true });
  writeFileSync(
    fixture,
    "export const dynamic='force-dynamic';export default function Plan0124SyntheticErrorPage(){throw new Error('Plan0124 synthetic runtime error');}\n",
  );
  return config;
}

async function startSink() {
  let count = 0;
  const server = createHttpServer((request, response) => {
    count++;
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{"status":1}');
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', accept);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}`, count: () => count };
}
/** All isolated servers bind loopback; development is an explicitly separate evidence class. */
export function isolatedServerArguments(runtime, port) {
  if (!['production', 'development'].includes(runtime))
    throw new Error('Unsupported isolated runtime');
  return [
    ...(runtime === 'development' ? ['dev', '--webpack'] : ['start']),
    '--hostname',
    '127.0.0.1',
    '--port',
    port,
  ];
}

/** Bounded P1 runs cannot perform Next's automatic dependency-upgrade assessment. */
export function isolatedExperimentalSettings(experimental, boundedP1) {
  return { ...experimental, cpus: 2, ...(boundedP1 ? { agentUpgrade: false } : {}) };
}

/** Warm the owned login route and record only bounded timing/status, never HTML or headers. */
export async function preflightOwnedLogin(siteUrl, scratchBase, request = fetch, signal) {
  const origin = new URL(siteUrl);
  if (origin.protocol !== 'http:' || !isLoopback(origin.hostname) || origin.port !== '3000')
    throw new Error('Login preflight requires the owned local application origin');
  const started = Date.now();
  let status = null;
  let outcome = 'failed';
  try {
    const response = await request(new URL('/es/login', origin), {
      redirect: 'manual',
      signal: AbortSignal.any([AbortSignal.timeout(120_000), ...(signal ? [signal] : [])]),
    });
    status = response.status;
    await response.arrayBuffer();
    if (status !== 200) throw new Error('Owned login route returned non-200 status');
    outcome = 'ready';
  } finally {
    writeFileSync(
      resolve(scratchBase, 'login-preflight.json'),
      JSON.stringify({ elapsedMs: Date.now() - started, status, outcome }, null, 2),
    );
  }
  console.log(`Owned login preflight: ${status} in ${Date.now() - started}ms`);
}

/** Keep only fixed diagnostic labels from the owned Next server, never raw logs or env values. */
export function createOwnedServerDiagnostics() {
  const started = Date.now();
  const events = [];
  let tail = '';
  return {
    observe(chunk) {
      const output = (tail + String(chunk)).replace(/\u001b\[[0-9;]*m/g, '').slice(-8192);
      const checks = [
        ['ready', /Ready in\s+\d/i],
        ['compiling-login', /Compiling[^\r\n]*\/es\/login/i],
        ['compiled-login', /Compiled[^\r\n]*\/es\/login/i],
        ['compiling-proxy', /Compiling[^\r\n]*proxy/i],
        ['compiled-proxy', /Compiled[^\r\n]*proxy/i],
        ['compiling-instrumentation', /Compiling[^\r\n]*instrumentation/i],
        ['compiled-instrumentation', /Compiled[^\r\n]*instrumentation/i],
        [
          'environment-error',
          /Invalid environment variables|environment validation|Missing required environment variables/i,
        ],
        ['module-error', /Module not found|Cannot find module|Can't resolve/i],
        ['compile-error', /Failed to compile|Compilation failed|Syntax error/i],
        ['server-error', /\bError:|\bERR_|\bEACCES\b|\bEPERM\b/i],
        ['memory-restart', /Server is approaching the used memory threshold, restarting/i],
      ];
      for (const [event, pattern] of checks)
        if (pattern.test(output) && !events.some((entry) => entry.event === event))
          events.push({ event, elapsedMs: Date.now() - started });
      tail = output.slice(-256);
    },
    snapshot() {
      return { elapsedMs: Date.now() - started, events };
    },
  };
}

/** Failure evidence never retains test messages, bodies, full paths or credentials. */
export function safeTestFailure(error, specs, specFile) {
  const safe = {};
  const location = String(error.stack ?? '').match(/([a-zA-Z0-9-]+\.spec\.ts):(\d+):(\d+)/);
  if (location && specs.includes(location[1]))
    Object.assign(safe, {
      file: location[1],
      line: Number(location[2]),
      column: Number(location[3]),
    });
  const message = String(error.message ?? '').replace(/\u001b\[[0-9;]*m/g, '');
  if (/Command failed:.*docker[\s\S]*psql/i.test(message)) safe.kind = 'sql-fixture';
  else if (/Timeout|timed out/i.test(message)) safe.kind = 'timeout';
  const constraint = message.match(/constraint "([a-z][a-z0-9_]{1,79})"/);
  if (safe.kind === 'sql-fixture' && constraint) safe.constraint = constraint[1];
  if (!safe.file) {
    const frame = message.match(/^\s*>\s*(\d+)\s*\|/m);
    const file = String(error.location?.file ?? specFile ?? '')
      .replaceAll('\\', '/')
      .split('/')
      .at(-1);
    const line = error.location?.line ?? (frame ? Number(frame[1]) : undefined);
    if (specs.includes(file) && Number.isInteger(line) && line > 0)
      Object.assign(safe, {
        file,
        line,
        ...(Number.isInteger(error.location?.column) ? { column: error.location.column } : {}),
      });
  }
  for (const key of ['Expected', 'Received']) {
    const match = message.match(new RegExp(key + ':\\s*(true|false)\\b'));
    if (match) safe[key.toLowerCase()] = match[1] === 'true';
  }
  return safe;
}

async function runE2e(
  scratch,
  source,
  dependencies,
  env,
  scratchBase,
  acceptance = null,
  runtime = 'production',
  specs = requiredE2eSpecs,
  signal,
  onProgress = () => {},
) {
  signal?.throwIfAborted();
  const offeredProjects = readOfferedProjects(
    readFileSync(resolve(scratch, 'src/config/app.config.ts'), 'utf8'),
  );
  const require = createRequire(resolve(source, 'package.json'));
  const playwright = require('@playwright/test');
  const executable = playwright.chromium.executablePath();
  if (!existsSync(executable))
    throw new Error('Installed Chromium required; no browser install is performed');
  const playwrightRequire = createRequire(require.resolve('@playwright/test'));
  const fixtureEnv = {
    ...env,
    PLAN0124_FIXTURE_WORKER: 'true',
    PLAN0124_BROWSER_EXECUTABLE: executable,
    PLAN0124_PLAYWRIGHT_ROOT: dirname(playwrightRequire.resolve('playwright/package.json')),
    PLAN0124_DOCKER_CONTEXT: process.platform === 'win32' ? 'desktop-linux' : 'default',
  };
  const endpoint = execFileSync(
    'docker',
    [
      'context',
      'inspect',
      fixtureEnv.PLAN0124_DOCKER_CONTEXT,
      '--format',
      '{{json .Endpoints.docker.Host}}',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  if (
    !/^(?:"npipe:\/+\.\/pipe\/(?:dockerDesktopLinuxEngine|docker_engine)"|"unix:\/\/\/var\/run\/docker.sock")\s*$/.test(
      endpoint,
    )
  )
    throw new Error('Docker context must attest a local daemon endpoint');
  const port = String(new URL(env.SITE_URL).port);
  const server = spawn(
    process.execPath,
    [resolve(dependencies, 'next/dist/bin/next'), ...isolatedServerArguments(runtime, port)],
    { cwd: scratch, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  let exited = false;
  let ready = false;
  const diagnostics = createOwnedServerDiagnostics();
  const serverClosed = new Promise((accept) => server.once('close', accept));
  const ownedServer = watchOwnedProcess(server, signal);
  server.on('exit', () => {
    exited = true;
  });
  server.on('error', () => {
    exited = true;
  });
  server.stdout.on('data', (chunk) => {
    diagnostics.observe(chunk);
    if (String(chunk).includes('Ready in')) ready = true;
  });
  server.stderr.on('data', (chunk) => diagnostics.observe(chunk));
  try {
    onProgress('starting-next');
    for (let attempt = 0; attempt < 90 && !ready; attempt++) {
      signal?.throwIfAborted();
      if (exited) throw new Error('Owned server exited before readiness');
      await new Promise((accept) => setTimeout(accept, 1000));
    }
    if (!ready || exited) throw new Error('Owned server did not bind its loopback port');
    if (acceptance && runtime === 'development') {
      onProgress('compiling-login');
      await preflightOwnedLogin(env.SITE_URL, scratchBase, fetch, signal);
    }
    onProgress('running-browser');
    let failure;
    try {
      await runNode(
        [
          resolve(dependencies, '@playwright/test/cli.js'),
          'test',
          '--config',
          'plan0124-playwright.config.ts',
        ],
        scratch,
        fixtureEnv,
      );
    } catch (error) {
      failure = error;
    }
    const resultFile = resolve(scratch, 'plan0124-results.json');
    if (!existsSync(resultFile)) throw failure || new Error('E2E reporter produced no result');
    const result = JSON.parse(readFileSync(resultFile, 'utf8'));
    const cases = [];
    const visit = (suite) => {
      for (const spec of suite.specs || [])
        cases.push({
          title: spec.title,
          file: spec.file,
          statuses: spec.tests.flatMap((test) => test.results.map((result) => result.status)),
          failures: spec.tests.flatMap((test) =>
            test.results.flatMap((result) =>
              (result.errors ?? []).map((error) => safeTestFailure(error, specs, spec.file)),
            ),
          ),
        });
      for (const nested of suite.suites || []) visit(nested);
    };
    for (const suite of result.suites || []) visit(suite);
    const evidence = {
      observedAt: new Date().toISOString(),
      stats: result.stats,
      runtime,
      offeredProjects,
      cases,
      excludedCloudTest: 'Cloud @smoke: a real envelope through /sentry-tunnel reaches Sentry',
      syntheticTestRoutes: ['/[locale]/csp-runtime-error'],
    };
    writeFileSync(resolve(scratchBase, 'e2e-results.json'), JSON.stringify(evidence, null, 2));
    console.log('E2E actual counts: ' + JSON.stringify(result.stats));
    if (failure) throw failure;
    if (acceptance) acceptance(result.stats, cases, offeredProjects);
    else assertCompleteE2eAcceptance(result.stats, cases, offeredProjects);
    if (
      !acceptance &&
      !cases.some(
        (test) =>
          test.title === 'POST /sentry-tunnel is not locale-redirected by the proxy' &&
          test.statuses.includes('passed'),
      )
    )
      throw new Error('Local Sentry tunnel case did not execute');
    if (existsSync(env.PLAN0124_EGRESS_LOG))
      throw new Error('E2E attempted forbidden egress or process execution');
  } finally {
    onProgress('stopping-next');
    writeFileSync(
      resolve(scratchBase, 'owned-next-server-diagnostics.json'),
      JSON.stringify({ ...diagnostics.snapshot(), exited, ready }, null, 2),
    );
    if (!exited && server.pid) await ownedServer.stop();
    await serverClosed;
    ownedServer.detach();
  }
}

/** Compiler choice applies only to the isolated candidate, preserving the default 0124 build. */
export function isolatedBuildArguments(compiler = 'turbopack') {
  if (compiler === 'turbopack') return ['build'];
  if (compiler === 'webpack') return ['build', '--webpack'];
  throw new Error('Unsupported isolated compiler');
}

/** The server teardown is part of acceptance; it must not add a blocked operation. */
export async function completeIsolatedDevelopment(run, guardLog) {
  await run();
  if (existsSync(guardLog))
    throw new Error('E2E teardown attempted forbidden egress or process execution');
}

export async function runLocalValidation({
  mode = parseMode(process.argv.slice(2)),
  specs = requiredE2eSpecs,
  acceptance = null,
  compiler = 'turbopack',
  runtime = 'production',
  evidenceDirectory = '.superpowers/sdd/012-4-csp-and-secrets',
  signal,
  onProgress = () => {},
} = {}) {
  signal?.throwIfAborted();
  onProgress('local-preflight');
  assertLocalParent(process.env);
  if (
    !['production', 'development'].includes(runtime) ||
    (runtime === 'development' && (!acceptance || mode !== '--e2e'))
  )
    throw new Error('Development runtime requires explicit bounded acceptance');
  const source = process.cwd();
  if (
    !/^\s*project_id\s*=\s*"saas-boilerplate"\s*$/m.test(
      readFileSync(resolve(source, 'supabase/config.toml'), 'utf8'),
    )
  )
    throw new Error('Not the official local project');
  const dependencies = resolve(source, 'node_modules');
  for (const installedModulePath of ['next/dist/bin/next', '@playwright/test/cli.js'])
    if (!existsSync(resolve(dependencies, installedModulePath)))
      throw new Error('Installed dependencies required; installation is forbidden');
  // Capture the CLI output only in memory; errors are intentionally not echoed.
  let status;
  let buildFailure;
  try {
    status = JSON.parse(
      execFileSync('supabase', ['status', '-o', 'json'], {
        cwd: source,
        env: localDockerEnv(process.env),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      }),
    );
    // Auth confirmation sets host-only cookies before redirecting to SITE_URL.
    // Inventory the actual local GoTrue origin rather than substituting an IP.
    const authFormat =
      '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}|{{range .Config.Env}}{{if eq (index (split . "=") 0) "GOTRUE_SITE_URL"}}{{index (split . "=") 1}}{{end}}{{end}}';
    status.AUTH_SITE_URL = parseAuthAttestation(
      execFileSync(
        'docker',
        ['inspect', '--format', authFormat, 'supabase_auth_saas-boilerplate'],
        {
          env: localDockerEnv(process.env),
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        },
      ),
    );
  } catch {
    throw new Error('Cannot read official local Supabase status; output withheld');
  }
  const env = makeLocalEnv(status, process.env, Boolean(acceptance));
  const scratchBase = resolve(source, evidenceDirectory);
  mkdirSync(scratchBase, { recursive: true });
  const scratch = mkdtempSync(resolve(scratchBase, 'build-'));
  let sink;
  try {
    onProgress('preparing-workspace');
    if (mode === '--e2e') await assertAppPortAvailable();
    sink = await startSink();
    env.POSTHOG_HOST = sink.url;
    env.NEXT_PUBLIC_SENTRY_DSN = sink.url.replace('http://', 'http://synthetic@') + '/1';
    const files = execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { cwd: source, encoding: 'utf8' },
    )
      .split('\0')
      .filter(Boolean);
    for (const path of files) {
      if (!safeSourcePath(path)) continue;
      const input = resolve(source, path);
      if (!existsSync(input)) continue;
      const output = resolve(scratch, path);
      if (relative(scratch, output).startsWith('..') || lstatSync(input).isSymbolicLink())
        throw new Error('Unsafe source path');
      mkdirSync(dirname(output), { recursive: true });
      cpSync(input, output, { dereference: false });
    }
    symlinkSync(
      dependencies,
      resolve(scratch, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    // Tailwind 4.3.3 promotes source roots ignored by an ancestor .gitignore
    // to external sources, bypassing ignores and walking dependency junctions.
    // An empty boundary restores ordinary source detection; no repository
    // credentials, history or configuration are copied into this directory.
    mkdirSync(resolve(scratch, '.git'));
    // Turbopack requires dependency junction targets inside its filesystem root.
    // Override only the isolated copy's filesystem boundary, never the source
    // compiler/cache configuration or application environment.
    const isolatedConfig = resolve(scratch, 'plan0124-next.config.ts');
    cpSync(resolve(scratch, 'next.config.ts'), isolatedConfig);
    writeFileSync(
      resolve(scratch, 'next.config.ts'),
      `import config from './plan0124-next.config';\nimport { localizeExternalRewrites, isolatedExperimentalSettings } from './scripts/run-plan-0124-local.mjs';\nexport default { ...config, experimental: isolatedExperimentalSettings(config.experimental, ${Boolean(acceptance)}), async rewrites() { return localizeExternalRewrites(await config.rewrites?.() ?? [], ${JSON.stringify(sink.url)}); }, turbopack: { ...config.turbopack, root: ${JSON.stringify(source)} } };\n`,
    );
    const guard = resolve(scratch, '.plan0124-network.cjs');
    writeFileSync(guard, networkGuard);
    env.PLAN0124_EGRESS_LOG = resolve(scratch, '.plan0124-egress.log');
    env.PLAN0124_DIAGNOSTICS = 'true';
    if (process.platform === 'win32')
      env.PLAN0124_TASKKILL_EXECUTABLE = resolve(process.env.SystemRoot, 'System32/taskkill.exe');
    env.PLAN0124_NEXT_ROOT = resolve(dependencies, 'next');
    env.PLAN0124_BUILD_ROOT = resolve(scratch, '.next');
    env.PLAN0124_TSC_ENTRY = resolve(dependencies, 'typescript/bin/tsc');
    env.PLAN0124_SCRATCH_ROOT = scratch;
    // NODE_OPTIONS parsing treats Windows backslashes as escapes even inside
    // double quotes; use forward slashes so child workers load the actual guard.
    env.NODE_OPTIONS = guardNodeOptions(guard);
    if (acceptance) {
      env.PLAN017_WORKER_LIMIT = '2';
      env.RAYON_NUM_THREADS = '2';
      env.TURBO_TASKS_AVAILABLE_PARALLELISM = '2';
    }
    if (mode === '--e2e') {
      env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
      writeE2eHarness(
        scratch,
        env.SITE_URL,
        env.PLAN0124_EGRESS_LOG,
        specs,
        runtime,
        Boolean(acceptance),
        readOfferedProjects(readFileSync(resolve(scratch, 'src/config/app.config.ts'), 'utf8')),
      );
    }
    if (runtime === 'development') {
      env.NODE_ENV = 'development';
      await completeIsolatedDevelopment(
        () =>
          runE2e(
            scratch,
            source,
            dependencies,
            env,
            scratchBase,
            acceptance,
            runtime,
            specs,
            signal,
            onProgress,
          ),
        env.PLAN0124_EGRESS_LOG,
      );
      console.log('Bounded local development E2E passed; production build remains unverified.');
      return;
    }
    let output;
    try {
      output = await runNode(
        [resolve(dependencies, 'next/dist/bin/next'), ...isolatedBuildArguments(compiler)],
        scratch,
        env,
      );
    } catch (error) {
      if (existsSync(env.PLAN0124_EGRESS_LOG)) {
        const kinds = readFileSync(env.PLAN0124_EGRESS_LOG, 'utf8')
          .split('\n')
          .filter((kind) =>
            /^(?:socket|dns|fetch|child-process|fork-executable|fork-environment|fork-preload)$/.test(
              kind,
            ),
          );
        const detailPath = env.PLAN0124_EGRESS_LOG + '.details';
        const details =
          existsSync(detailPath) ?
            readFileSync(detailPath, 'utf8')
              .split('\n')
              .filter((detail) =>
                /^child-(?:executable|method|flag|entry):[a-zA-Z0-9_.-]{1,80}$/.test(detail),
              )
          : [];
        const permittedPath = env.PLAN0124_EGRESS_LOG + '.allowed';
        const permittedLocalOperations =
          existsSync(permittedPath) ?
            readFileSync(permittedPath, 'utf8')
              .split('\n')
              .filter((kind) =>
                [
                  'git-revision',
                  'guarded-next-worker',
                  'guarded-typescript-cli',
                  'guarded-next-fork',
                ].includes(kind),
              )
          : [];
        writeFileSync(
          resolve(scratchBase, 'failed-build-guards.json'),
          JSON.stringify(
            { observedAt: new Date().toISOString(), kinds, details, permittedLocalOperations },
            null,
            2,
          ),
        );
        throw new Error(
          `${error.message}\nBlocked guard event kinds: ${[...new Set(kinds)].join(',')}\n${[...new Set(details)].join(',')}`,
        );
      }
      throw error;
    }
    if (existsSync(env.PLAN0124_EGRESS_LOG))
      throw new Error('Build attempted forbidden egress or external process execution');
    await new Promise(setImmediate);
    const buildSinkRequests = sink.count();
    assertNoBuildSinkRequests(buildSinkRequests);
    // Only route-symbol/size rows are safe to print; all other build output stays in RAM.
    const routeMatrix = output.split('\n').filter((line) => /^[┌├└│○ƒ● ]+[\/○ƒ●]/u.test(line));
    console.log(routeMatrix.join('\n'));
    if (containsMap(resolve(scratch, 'public')) || containsMap(resolve(scratch, '.next/static')))
      throw new Error('Public sourcemaps exist');
    const allowedPath = env.PLAN0124_EGRESS_LOG + '.allowed';
    const permittedLocalOperations =
      existsSync(allowedPath) ?
        readFileSync(allowedPath, 'utf8')
          .split('\n')
          .filter((kind) =>
            [
              'git-revision',
              'guarded-next-worker',
              'guarded-typescript-cli',
              'guarded-next-fork',
            ].includes(kind),
          )
      : [];
    const evidence = {
      observedAt: new Date().toISOString(),
      compiler,
      routeMatrix,
      staticAssetBytes: assetBytes(resolve(scratch, '.next/static')),
      nodeGuardAttempts: 0,
      buildSinkRequests,
      permittedLocalOperations,
      publicMapCount: 0,
      isolatedFilesystemRoot: 'repository source root',
      syntheticTestRoutes: mode === '--e2e' ? ['/[locale]/csp-runtime-error'] : [],
      perRouteSizes:
        'not inferred; only emitted route matrix and total static asset bytes recorded',
    };
    writeFileSync(
      resolve(scratchBase, mode === '--e2e' ? 'e2e-build.json' : 'build-baseline.json'),
      JSON.stringify(evidence, null, 2),
    );
    if (mode === '--e2e') {
      await runE2e(
        scratch,
        source,
        dependencies,
        env,
        scratchBase,
        acceptance,
        runtime,
        specs,
        signal,
        onProgress,
      );
      if (existsSync(env.PLAN0124_EGRESS_LOG))
        throw new Error('E2E teardown attempted forbidden egress or process execution');
    }
    console.log('Isolated build passed. Forbidden Node egress and child execution attempts: 0.');
  } catch (error) {
    buildFailure = error;
    if (mode === '--e2e' && existsSync(env.PLAN0124_EGRESS_LOG)) {
      const kinds = readFileSync(env.PLAN0124_EGRESS_LOG, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((kind) =>
          (
            /^(?:browser|socket|dns|fetch|child-process|fork-executable|fork-environment|fork-preload|docker-identity)$/.test(
              kind,
            )
          ) ?
            kind
          : 'unknown',
        );
      writeFileSync(
        resolve(scratchBase, 'failed-e2e-guards.json'),
        JSON.stringify(
          {
            observedAt: new Date().toISOString(),
            kinds,
            details:
              existsSync(env.PLAN0124_EGRESS_LOG + '.details') ?
                readFileSync(env.PLAN0124_EGRESS_LOG + '.details', 'utf8')
                  .split('\n')
                  .filter((line) =>
                    /^(?:fork-entry:[a-zA-Z0-9_.-]{1,80}|fork-guard-present:(?:true|false)|(?:fetch|browser)-host:[a-zA-Z0-9.-]{1,120}|fetch-shape:\{"nextVersion":(?:true|false),"get":(?:true|false),"request":(?:true|false),"headers":(?:true|false),"body":(?:true|false),"development":(?:true|false),"workerLimit":(?:true|false)\})$/.test(
                      line,
                    ),
                  )
              : [],
          },
          null,
          2,
        ),
      );
      throw new Error(
        `${error.message}\nBlocked runtime guard kinds: ${[...new Set(kinds)].join(',')}`,
      );
    }
    throw error;
  } finally {
    onProgress('cleanup');
    if (sink) {
      sink.server.closeAllConnections();
      await new Promise((accept) => sink.server.close(accept));
    }
    try {
      const retries = [];
      await cleanupAfterProcessesClose(scratch, scratchBase, {
        onRetry: (event) => {
          retries.push(event);
          try {
            writeFileSync(
              resolve(scratchBase, 'cleanup-retries.json'),
              JSON.stringify({ retries }, null, 2),
            );
          } catch {
            /* Diagnostics cannot change cleanup outcome. */
          }
        },
      });
    } catch (error) {
      try {
        writeFileSync(
          resolve(scratchBase, 'cleanup-failure.json'),
          JSON.stringify(
            {
              scratch: relative(scratchBase, scratch),
              originalBuildFailed: Boolean(buildFailure),
              code: /^[A-Z_]+$/.test(error.code ?? '') ? error.code : 'UNKNOWN',
            },
            null,
            2,
          ),
        );
      } catch {
        /* Preserve the build error even if diagnostic persistence fails. */
      }
      if (!buildFailure) {
        if (sink) await new Promise((accept) => sink.server.close(accept));
        throw new Error(
          'Build completed but isolated cleanup failed; task workspace contains cleanup-failure.json',
        );
      }
      console.error('Isolated cleanup failed; original build failure preserved in task workspace');
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  runLocalValidation().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
