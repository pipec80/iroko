import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { normalizeNavigationLink } from '../src/lib/validation/navigation-link.ts';

const TABLES = ['announcements', 'notifications'];
const CONTAINER = 'supabase_db_saas-boilerplate';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMode(args) {
  if (args.length === 0) return '--check';
  if (args.length !== 1 || !['--check', '--apply'].includes(args[0]))
    throw new Error(
      'Use --check (default) or explicit --apply; only the official local stack is supported',
    );
  return args[0];
}

export function assertOfficialTarget(config, state) {
  if (
    !/^\s*project_id\s*=\s*"saas-boilerplate"\s*$/m.test(config) ||
    state.running !== true ||
    state.project !== 'saas-boilerplate'
  )
    throw new Error('Official running saas-boilerplate local target required');
}

/** The actual application normalizer owns classification, including IDNA/UTF-8. */
export function classifyLink(link) {
  const result = normalizeNavigationLink(link);
  if (!result.valid) return { category: 'invalid', href: null };
  return { category: link === result.href ? 'canonical' : 'normalizable', href: result.href };
}

/** Preserve every snapshot row for drift detection; expose only counts to stdout. */
export function buildPlan(snapshot) {
  const tables = {};
  const counts = {};
  for (const name of TABLES) {
    if (!Array.isArray(snapshot[name])) throw new Error('Invalid local navigation snapshot');
    const seen = new Set();
    counts[name] = { rows: 0, canonical: 0, normalizable: 0, invalid: 0, updates: 0 };
    tables[name] = snapshot[name].map(({ id, link }) => {
      if (
        typeof id !== 'string' ||
        !UUID.test(id) ||
        seen.has(id) ||
        (link !== null && typeof link !== 'string')
      )
        throw new Error('Invalid local navigation snapshot');
      seen.add(id);
      const { category, href } = classifyLink(link);
      counts[name].rows++;
      counts[name][category]++;
      if (link !== href) counts[name].updates++;
      return { id, old_link: link, new_link: href };
    });
  }
  return { tables, counts };
}

function dollarQuote(value, prefix) {
  let index = 0;
  while (value.includes(`$${prefix}_${index}$`)) index++;
  const delimiter = `$${prefix}_${index}$`;
  return `${delimiter}${value}${delimiter}`;
}

/** Lock and compare the complete snapshot before changing links; drift aborts atomically. */
export function buildApplySql(plan) {
  const snapshot = dollarQuote(JSON.stringify(plan.tables), 'navigation_snapshot');
  const body = `
DECLARE v_snapshot jsonb := ${snapshot}::jsonb;
BEGIN
${TABLES.map(
  (name) => `  IF EXISTS (
    SELECT 1 FROM public.${name} a
    FULL JOIN jsonb_to_recordset(v_snapshot -> '${name}') AS s(id uuid, old_link text, new_link text)
      ON a.id = s.id
    WHERE a.id IS NULL OR s.id IS NULL OR a.link IS DISTINCT FROM s.old_link
  ) THEN RAISE EXCEPTION 'navigation_link_snapshot_drift'; END IF;`,
).join('\n')}
${TABLES.map(
  (name) => `  UPDATE public.${name} a SET link = s.new_link
  FROM jsonb_to_recordset(v_snapshot -> '${name}') AS s(id uuid, old_link text, new_link text)
  WHERE a.id = s.id AND a.link IS NOT DISTINCT FROM s.old_link
    AND a.link IS DISTINCT FROM s.new_link;`,
).join('\n')}
END;
`;
  return `BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.announcements, public.notifications IN SHARE ROW EXCLUSIVE MODE;
DO ${dollarQuote(body, 'navigation_apply')};
COMMIT;`;
}

function docker(args, input) {
  // Force a local socket even if the caller selected a remote Docker context.
  const host =
    process.platform === 'win32' ? 'npipe:////./pipe/docker_engine' : 'unix:///var/run/docker.sock';
  const env = { ...process.env };
  for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'])
    delete env[key];
  try {
    return execFileSync('docker', ['--host', host, ...args], {
      input,
      env,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 45000,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    // SQL diagnostics may quote historical links containing user tokens.
    throw new Error(
      'Local Docker/SQL operation failed; transaction rolled back if unfinished. Output withheld; rerun --check and inspect counts before retrying',
    );
  }
}

function verifyTarget(config) {
  const state = docker([
    'inspect',
    '--format',
    '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}',
    CONTAINER,
  ])
    .trim()
    .split('|');
  assertOfficialTarget(config, { running: state[0] === 'true', project: state[1] });
}

function psql(sql) {
  return docker(
    [
      'exec',
      '-i',
      CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '-Atq',
    ],
    sql,
  );
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const config = readFileSync(resolve('supabase/config.toml'), 'utf8');
  verifyTarget(config);
  const query = `BEGIN READ ONLY;
SELECT jsonb_build_object(
  'announcements', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'link',link)), '[]'::jsonb) FROM public.announcements),
  'notifications', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'link',link)), '[]'::jsonb) FROM public.notifications)
);
COMMIT;`;
  let plan;
  try {
    plan = buildPlan(JSON.parse(psql(query)));
  } catch {
    throw new Error('Cannot classify official local navigation snapshot; output withheld');
  }
  if (mode === '--apply') {
    verifyTarget(config);
    psql(buildApplySql(plan));
  }
  console.log(JSON.stringify({ mode, counts: plan.counts }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
