import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const guardSource = readFileSync(
  new URL('../src/test/local-e2e-target.ts', import.meta.url),
  'utf8',
);
const guardCode = ts.transpileModule(guardSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { resolveDbTarget, validateDbContainerState, requireLoopbackUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(guardCode).toString('base64')}`
);

export async function execute(command, args, input, timeoutMs = 600_000) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const deadline = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          shell: false,
          windowsHide: true,
          stdio: 'ignore',
        });
        killer.on('error', () => child.kill());
      } else child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', (error) => {
      clearTimeout(deadline);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(deadline);
      if (timedOut) {
        reject(new Error(`${command} timed out; child process terminated`));
        return;
      }
      if (code !== 0) {
        const error = new Error(`${command} failed (${code}): ${stderr}\n${stdout}`);
        error.exitCode = code;
        reject(error);
      } else accept({ stdout, stderr });
    });
    child.stdin.end(input);
  });
}

/** Run the official local suite with short-lived, cluster-bound SQL authorization. */
export async function runReconciliationDbTest(target, testPaths = [], run = execute) {
  const project = /^project_id\s*=\s*"([^"]+)"/m.exec(
    readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8'),
  )?.[1];
  const checked = resolveDbTarget(
    {
      E2E_SUPABASE_PROJECT_ID: target.project,
      E2E_SUPABASE_DB_CONTAINER: target.container,
    },
    project,
  );
  if (project !== 'saas-boilerplate' || checked.project !== project)
    throw new Error('Only the official local project is allowed');
  for (const name of ['E2E_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
    if (process.env[name]) requireLoopbackUrl(process.env[name]);
  }
  for (const file of testPaths) {
    if (!/^supabase[\\/]tests[\\/]database[\\/][\w.-]+\.test\.sql$/.test(file))
      throw new Error('Only local database test paths are allowed');
  }
  if (process.env.DOCKER_HOST && !/^(?:npipe|unix):\/\//.test(process.env.DOCKER_HOST))
    throw new Error('Remote Docker hosts are not allowed');
  const endpoint = (
    await run('docker', ['context', 'inspect', '--format', '{{(index .Endpoints "docker").Host}}'])
  ).stdout.trim();
  if (!/^(?:npipe|unix):\/\//.test(endpoint))
    throw new Error('Docker context must use a local socket');
  const state = await run('docker', [
    'inspect',
    checked.container,
    '--format',
    '{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}',
  ]);
  validateDbContainerState(state.stdout, project);
  const sql = async (input) =>
    run(
      'docker',
      [
        'exec',
        '-i',
        '-e',
        'PGOPTIONS=-c statement_timeout=120000 -c lock_timeout=10000',
        checked.container,
        'psql',
        '-X',
        '-U',
        'supabase_admin',
        '-d',
        'postgres',
        '-At',
        '-v',
        'ON_ERROR_STOP=1',
      ],
      input,
    );
  const cluster = (await sql('SELECT system_identifier FROM pg_control_system();')).stdout.trim();
  if (!/^\d+$/.test(cluster)) throw new Error('Invalid local cluster identity');
  const runId = randomUUID();
  // Fixed test42 IDs must be absent before this run can own or clean them.
  const collision = (
    await sql(`SELECT
    (SELECT count(*) FROM auth.users WHERE id='00000000-0000-0000-0000-000000004393')+
    (SELECT count(*) FROM public.accounts WHERE id='00000000-0000-0000-0000-000000004393')+
    (SELECT count(*) FROM billing.customers WHERE id='00000000-0000-0000-0000-000000004394')+
    (SELECT count(*) FROM billing.subscriptions WHERE id IN ('00000000-0000-0000-0000-000000004395','00000000-0000-0000-0000-000000004396'));`)
  ).stdout.trim();
  if (collision !== '0')
    throw new Error(
      'Existing test42 fixture requires explicit local investigation; no rows changed',
    );
  let ownsHarness = false;
  try {
    await sql(`BEGIN;
      CREATE SCHEMA iroko_test_guard;
      REVOKE ALL ON SCHEMA iroko_test_guard FROM PUBLIC;
      GRANT USAGE ON SCHEMA iroko_test_guard TO postgres;
      CREATE TABLE iroko_test_guard.target_attestation(run_id uuid PRIMARY KEY,project_id text NOT NULL,system_identifier text NOT NULL,expires_at timestamptz NOT NULL);
      INSERT INTO iroko_test_guard.target_attestation VALUES ('${runId}','${project}','${cluster}',clock_timestamp()+interval '30 minutes');
      CREATE TABLE iroko_test_guard.fixture_ids(id uuid PRIMARY KEY);
      CREATE TABLE iroko_test_guard.recovery_resources(resource_id text PRIMARY KEY);
      GRANT SELECT,INSERT ON iroko_test_guard.recovery_resources TO postgres;
      GRANT SELECT ON iroko_test_guard.target_attestation TO postgres;
      GRANT SELECT,INSERT ON iroko_test_guard.fixture_ids TO postgres;
      CREATE FUNCTION iroko_test_guard.connect(connection_name text) RETURNS void
      LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
      DECLARE actual text;
      BEGIN
        IF NOT EXISTS(SELECT 1 FROM iroko_test_guard.target_attestation WHERE project_id='saas-boilerplate' AND system_identifier=(SELECT system_identifier::text FROM pg_control_system()) AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'local_test_attestation_required'; END IF;
        PERFORM extensions.dblink_connect(connection_name,'dbname=postgres user=postgres');
        SELECT identity INTO actual FROM extensions.dblink(connection_name,'SELECT system_identifier::text FROM pg_control_system()') AS remote(identity text);
        IF actual IS DISTINCT FROM '${cluster}' THEN RAISE EXCEPTION 'remote_cluster_mismatch'; END IF;
      END $body$;
      REVOKE ALL ON FUNCTION iroko_test_guard.connect(text) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION iroko_test_guard.connect(text) TO postgres;
      COMMIT;
    `);
    ownsHarness = true;
    const result = await run(process.platform === 'win32' ? 'supabase.exe' : 'supabase', [
      'test',
      'db',
      '--local',
      ...testPaths,
    ]);
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    if (/^\s*not ok\b/m.test(result.stdout)) throw new Error('pgTAP reported failed assertions');
  } finally {
    if (ownsHarness) {
      // Includes failure paths after committed remote fixtures. No broad reset.
      await sql(`BEGIN;
        DELETE FROM billing.recovery_jobs WHERE resource_id IN (SELECT resource_id FROM iroko_test_guard.recovery_resources);
        DELETE FROM billing.reconciliation_state WHERE subscription_id IN ('00000000-0000-0000-0000-000000004395','00000000-0000-0000-0000-000000004396');
        DELETE FROM billing.subscriptions WHERE id IN ('00000000-0000-0000-0000-000000004395','00000000-0000-0000-0000-000000004396');
        DELETE FROM billing.customers WHERE id='00000000-0000-0000-0000-000000004394';
        DELETE FROM billing.reconciliation_state WHERE subscription_id IN (SELECT s.id FROM billing.subscriptions s JOIN billing.customers c ON c.id=s.customer_id WHERE c.account_id IN (SELECT id FROM iroko_test_guard.fixture_ids));
        DELETE FROM billing.subscriptions WHERE customer_id IN (SELECT id FROM billing.customers WHERE account_id IN (SELECT id FROM iroko_test_guard.fixture_ids));
        DELETE FROM billing.customers WHERE account_id IN (SELECT id FROM iroko_test_guard.fixture_ids);
        DELETE FROM public.accounts WHERE id='00000000-0000-0000-0000-000000004393' OR id IN (SELECT id FROM iroko_test_guard.fixture_ids);
        DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000004393' OR id IN (SELECT id FROM iroko_test_guard.fixture_ids);
        DO $body$ BEGIN
          IF EXISTS(SELECT 1 FROM billing.recovery_jobs WHERE resource_id IN (SELECT resource_id FROM iroko_test_guard.recovery_resources)) THEN RAISE EXCEPTION 'Local recovery fixture cleanup failed; inspect official local database'; END IF;
          IF EXISTS(SELECT 1 FROM auth.users WHERE id IN (SELECT id FROM iroko_test_guard.fixture_ids)) OR EXISTS(SELECT 1 FROM auth.users WHERE id='00000000-0000-0000-0000-000000004393') THEN RAISE EXCEPTION 'Local fixture cleanup failed; inspect official local database before any local reset'; END IF;
        END $body$;
        DROP SCHEMA iroko_test_guard CASCADE;
        COMMIT;`);
    }
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runReconciliationDbTest(
    { project: 'saas-boilerplate', container: 'supabase_db_saas-boilerplate' },
    process.argv.slice(2),
  ).catch((error) => {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 1;
  });
}
