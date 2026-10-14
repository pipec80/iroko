import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const project = 'saas-boilerplate';
const container = `supabase_db_${project}`;
const fixture = `rate_limit_0123_${randomBytes(8).toString('hex')}`;
const ip = `198.18.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;
const expectRed = process.argv.includes('--expect-red');
const expectRace = process.argv.includes('--expect-race');
const checks = [];

function command(executable, args, input) {
  return execFileSync(executable, args, {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function sql(query) {
  return command(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    query,
  );
}

function verifyLocalTarget() {
  assert.match(
    readFileSync('supabase/config.toml', 'utf8'),
    /^project_id\s*=\s*"saas-boilerplate"/m,
  );
  const [database] = JSON.parse(command('docker', ['inspect', container]));
  assert.equal(database.Name, `/${container}`);
  assert.equal(database.Config.Labels['com.supabase.cli.project'], project);
  assert.equal(database.State.Running, true);
  const status = JSON.parse(command('supabase', ['status', '--output', 'json']));
  const target = new URL(status.API_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
  assert.equal(target.protocol, 'http:');
  assert.equal(target.username + target.password, '');
  assert.ok(status.SERVICE_ROLE_KEY);
  assert.equal(sql("SELECT current_database() || ':' || current_user;"), 'postgres:postgres');
  assert.equal(
    sql(
      "SELECT rolconfig::text LIKE '%pgrst.db_pre_request=public.check_request%' FROM pg_roles WHERE rolname='authenticator';",
    ),
    't',
  );
  return { target, key: status.SERVICE_ROLE_KEY };
}

function installFixture() {
  sql(`CREATE TABLE public.${fixture} (id integer PRIMARY KEY CHECK (id > 0));
    ALTER TABLE public.${fixture} ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.${fixture} FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT ON public.${fixture} TO service_role;
    NOTIFY pgrst, 'reload schema';`);
}

async function request(context, id) {
  const response = await fetch(new URL(`/rest/v1/${fixture}`, context.target), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: {
      apikey: context.key,
      Authorization: `Bearer ${context.key}`,
      'Content-Type': 'application/json',
      'cf-connecting-ip': ip,
    },
    body: JSON.stringify({ id }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function waitForSchema(context) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const response = await fetch(new URL(`/rest/v1/${fixture}?select=id&limit=0`, context.target), {
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { apikey: context.key, Authorization: `Bearer ${context.key}` },
    });
    await response.arrayBuffer();
    if (response.status === 200) return;
    assert.equal(response.status, 404, 'Unexpected fixture readiness response');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Fixture not observed in local schema cache');
}

async function checkHttp(context) {
  for (let id = 1; id <= 100; id++) {
    assert.equal((await request(context, id)).status, 201, `Write ${id} must succeed`);
  }
  checks.push('100 HTTP writes admitted');
  const blocked = await request(context, 101);
  assert.equal(sql(`SELECT count(*) FROM public.${fixture};`), '100');
  assert.equal(
    sql(`SELECT coalesce(sum(count),0) FROM private.rate_limit_counters WHERE ip='${ip}'::inet;`),
    '100',
  );
  checks.push('blocked write absent; committed counter remains 100');
  if (expectRed) {
    assert.equal(blocked.status, 500);
    assert.equal(blocked.body.code, 'PGRST121');
    console.log(
      JSON.stringify({
        phase: 'RED',
        observedStatus: blocked.status,
        code: blocked.body.code,
        checks,
      }),
    );
    return;
  }
  assert.equal(blocked.status, 429, 'Write 101 must return HTTP 429');
  assert.equal(blocked.body.code, '429');
  assert.equal(blocked.body.message, 'Too many requests');
  const repeated = await request(context, 102);
  assert.equal(repeated.status, 429);
  checks.push('HTTP 101 and repeat return valid 429');
  sql(`DELETE FROM private.rate_limit_counters WHERE ip='${ip}'::inet;`);
  assert.equal((await request(context, 1)).status, 409);
  assert.equal(
    sql(`SELECT coalesce(sum(count),0) FROM private.rate_limit_counters WHERE ip='${ip}'::inet;`),
    '0',
  );
  assert.equal((await request(context, 103)).status, 201);
  assert.equal(
    sql(`SELECT coalesce(sum(count),0) FROM private.rate_limit_counters WHERE ip='${ip}'::inet;`),
    '1',
  );
  checks.push('HTTP failed mutation rolls back its quota increment');
}

function openSession() {
  const child = spawn(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  );
  let pending;
  let buffer = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    if (pending && buffer.includes(pending.marker)) {
      const output = buffer.slice(0, buffer.indexOf(pending.marker)).trim();
      buffer = buffer.slice(buffer.indexOf(pending.marker) + pending.marker.length);
      clearTimeout(pending.timeout);
      pending.resolve(output);
      pending = undefined;
    }
  });
  const fail = () => {
    if (!pending) return;
    clearTimeout(pending.timeout);
    pending.reject(new Error('Persistent SQL session failed'));
    pending = undefined;
  };
  child.on('error', fail);
  child.on('exit', fail);
  child.stderr.resume();
  return {
    query(query) {
      assert.equal(pending, undefined, 'Only one query per SQL connection');
      const marker = `END_${randomBytes(8).toString('hex')}`;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error('SQL session timeout'));
        }, 75_000);
        pending = { resolve, reject, marker, timeout };
        child.stdin.write(`${query}\nSELECT '${marker}';\n`);
      });
    },
    close() {
      child.stdin.end('ROLLBACK;\n');
    },
  };
}

function startTransaction(address) {
  return `BEGIN; SET LOCAL statement_timeout='70s';
    SELECT set_config('request.method','POST',true);
    SELECT set_config('request.path','/${fixture}',true);
    SELECT set_config('request.headers','{"cf-connecting-ip":"${address}"}',true);`;
}

const attemptHook = `DO $$ BEGIN
  PERFORM public.check_request();
  PERFORM set_config('iroko.hook_result','admitted',true);
EXCEPTION WHEN SQLSTATE 'PGRST' THEN
  PERFORM set_config('iroko.hook_result','blocked',true);
END $$; SELECT current_setting('iroko.hook_result');`;

async function checkConcurrentHooks({ boundary }) {
  const first = openSession();
  const second = openSession();
  try {
    sql(`DELETE FROM private.rate_limit_counters WHERE ip='${ip}'::inet;
      INSERT INTO private.rate_limit_counters(ip,window_start,count)
      VALUES ('${ip}',date_trunc('minute',now())-interval '1 minute',99);`);
    await first.query(startTransaction(ip));
    assert.equal(await first.query(attemptHook), 'admitted');
    if (boundary) {
      const delay = Number(
        sql(
          "SELECT ceil(extract(epoch FROM (date_trunc('minute',clock_timestamp())+interval '1 minute'-clock_timestamp()))*1000)::integer;",
        ),
      );
      console.log(
        JSON.stringify({
          progress: 'waiting for real minute boundary',
          waitMilliseconds: delay + 100,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, delay + 100));
    }
    const waitingSession = `0123_wait_${randomBytes(8).toString('hex')}`;
    await second.query(`${startTransaction(ip)} SET LOCAL application_name='${waitingSession}';`);
    const blocked = second.query(attemptHook);
    if (expectRace) {
      assert.equal(await blocked, 'admitted');
      await second.query('COMMIT;');
      await first.query('COMMIT;');
      assert.equal(
        sql(`SELECT sum(count) FROM private.rate_limit_counters WHERE ip='${ip}'::inet;`),
        '101',
      );
      checks.push('RED: cross-minute second admission completed before first commit; total 101');
      return;
    }
    let observedLock = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (
        sql(
          `SELECT count(*) FROM pg_stat_activity WHERE application_name='${waitingSession}' AND wait_event_type='Lock';`,
        ) === '1'
      ) {
        observedLock = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(observedLock, 'Second connection must visibly wait for the first transaction lock');
    const independent = openSession();
    try {
      await independent.query(startTransaction('198.19.0.1'));
      assert.equal(await independent.query(attemptHook), 'admitted');
      await independent.query('ROLLBACK;');
      checks.push('independent IP admitted while first IP lock held');
    } finally {
      independent.close();
    }
    await first.query('COMMIT;');
    assert.equal(await blocked, 'blocked');
    await second.query('COMMIT;');
    assert.equal(
      sql(`SELECT sum(count) FROM private.rate_limit_counters WHERE ip='${ip}'::inet;`),
      '100',
    );
    checks.push(
      boundary ?
        'two SQL connections serialize across real minute boundary'
      : 'two SQL connections serialize in same minute',
    );
    assert.equal(
      sql(
        "SELECT coalesce(sum(count),0) FROM private.rate_limit_counters WHERE ip='198.19.0.1'::inet;",
      ),
      '0',
    );
    checks.push('explicit transaction rollback preserved');
  } finally {
    first.close();
    second.close();
  }
}

let installed = false;
try {
  const context = verifyLocalTarget();
  installed = true;
  installFixture();
  await waitForSchema(context);
  if (!process.argv.includes('--concurrency-only')) await checkHttp(context);
  if (!expectRed && !process.argv.includes('--http-only')) {
    if (!expectRace) await checkConcurrentHooks({ boundary: false });
    await checkConcurrentHooks({ boundary: true });
  }
  if (!expectRed) console.log(JSON.stringify({ phase: expectRace ? 'RED_RACE' : 'GREEN', checks }));
} catch (error) {
  // Do not include CLI stderr or HTTP bodies: those may carry credentials.
  console.error(
    JSON.stringify({
      passed: false,
      error:
        error instanceof assert.AssertionError ?
          error.message
        : 'Local harness failed; inspect target and prerequisites',
      checks,
    }),
  );
  process.exitCode = 1;
} finally {
  if (installed) {
    sql(
      `DROP TABLE IF EXISTS public.${fixture}; DELETE FROM private.rate_limit_counters WHERE ip='${ip}'::inet; NOTIFY pgrst, 'reload schema';`,
    );
    assert.equal(
      sql(`SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='${fixture}';`),
      '0',
    );
    console.log(JSON.stringify({ cleanup: 'PASS', fixtureRowsRemaining: 0 }));
  }
}
