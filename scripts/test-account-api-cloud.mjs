import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Cloud fixtures mutate test data only after explicit invocation and exact linked identity.
const projectRef = 'rgrxlygtmvavqzkjyywg';
if (process.argv.length !== 3 || process.argv[2] !== '--execute') {
  console.error(
    'Usage: node scripts/test-account-api-cloud.mjs --execute (authorized Cloud test only)',
  );
  process.exit(2);
}
assert.equal(readFileSync('supabase/.temp/project-ref', 'utf8').trim(), projectRef);
const accounts = [randomUUID(), randomUUID()];
const hashes = Array.from({ length: 4 }, () => randomBytes(32).toString('hex'));
const run = randomBytes(8).toString('hex');
const ipPrefix = `2001:db8:${randomBytes(2).toString('hex')}:${randomBytes(2).toString('hex')}:${randomBytes(2).toString('hex')}`;
const ips = Array.from({ length: 20 }, (_, index) => `${ipPrefix}::${(index + 1).toString(16)}`);
const checks = [];
let fixtureStarted = false;
let completed = false;

function command(executable, args, input) {
  try {
    return execFileSync(executable, args, {
      encoding: 'utf8',
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    }).trim();
  } catch {
    throw new Error(
      'Captured CLI command failed; inspect authentication and target without logging secrets',
    );
  }
}
function sql(query) {
  const output = JSON.parse(
    command('supabase', ['db', 'query', query, '--linked', '--output', 'json']),
  );
  const rows = Array.isArray(output) ? output : output.rows;
  assert.ok(Array.isArray(rows), 'CLI SQL output must be a row array');
  if (!rows.length) return '';
  const value = Object.values(rows[0])[0];
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
function cloudContext() {
  const rows = JSON.parse(
    command('supabase', ['projects', 'api-keys', '--project-ref', projectRef, '--output', 'json']),
  );
  assert.ok(Array.isArray(rows), 'CLI API-key output must be an array');
  const service = rows.find((row) => row.name === 'service_role')?.api_key;
  const anon = rows.find((row) => row.name === 'anon')?.api_key;
  assert.ok(service && anon, 'Expected legacy role keys available in memory');
  assert.equal(
    sql(
      "SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261013210434','20261013210436','20261014012941');",
    ),
    '3',
  );
  return { target: new URL('https://' + projectRef + '.supabase.co'), service, anon };
}
async function rpc(
  context,
  body,
  { name = 'admit_account_api_request', key = context.service } = {},
) {
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, context.target), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function admit(context, clientIp, hash) {
  const response = await rpc(context, { p_client_ip: clientIp, p_key_hash: hash });
  assert.equal(response.status, 200, 'Admission RPC must return HTTP 200');
  assert.equal(response.body.length, 1);
  return response.body[0];
}
function seedFixtures() {
  sql(`INSERT INTO public.accounts(id,name,slug) VALUES
    ('${accounts[0]}','0123 Cloud ${run}','0123-${run}-a'),
    ('${accounts[1]}','0123 HTTP ${run}','0123-${run}-b');
    INSERT INTO public.api_keys(account_id,name,key_prefix,key_hash) VALUES
    ('${accounts[0]}','First','irk_test','${hashes[0]}'),
    ('${accounts[0]}','Second','irk_test','${hashes[1]}'),
    ('${accounts[1]}','Independent','irk_test','${hashes[2]}'),
    ('${accounts[0]}','Expired','irk_test','${hashes[3]}');
    UPDATE public.api_keys SET expires_at=clock_timestamp()-interval '1 second' WHERE key_hash='${hashes[3]}';
`);
}
function assertFixtureIpsUnused() {
  const addresses = ips.map((address) => `'${address}'::inet`).join(',');
  assert.equal(
    sql(
      `SELECT count(*) FROM private.account_api_ip_admissions WHERE client_ip IN (${addresses});`,
    ),
    '0',
  );
  assert.equal(
    sql(`SELECT count(*) FROM private.rate_limit_counters WHERE ip IN (${addresses});`),
    '0',
  );
}
async function checkExemption(context) {
  const denied = await rpc(
    context,
    { p_client_ip: ips[1], p_key_hash: hashes[0] },
    { key: context.anon },
  );
  assert.ok([401, 403].includes(denied.status));
  assert.equal(denied.body.code, '42501');
  assert.equal((await admit(context, ips[1], null)).decision, 'missing_key');
  checks.push(
    'Cloud POST admission works for backend; anon ACL denied. Exact hook-exemption source checked separately; synthetic headers not trusted',
  );
}
async function checkIpQuota(context) {
  for (let offset = 0; offset < 300; offset += 10) {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        admit(context, ips[2], (offset + index) % 2 ? 'invalid' : null),
      ),
    );
    assert.ok(
      results.every((result) => result.status === 'fulfilled'),
      'All quota requests finish before cleanup',
    );
    for (let index = 0; index < 10; index++)
      assert.equal(
        results[index].value.decision,
        (offset + index) % 2 ? 'invalid_key' : 'missing_key',
      );
  }
  const blocked = await admit(context, ips[2], hashes[0]);
  assert.equal(blocked.decision, 'ip_limited');
  assert.ok(blocked.retry_after_seconds > 0 && blocked.retry_after_seconds <= 300);
  assert.equal(
    sql(`SELECT count(*) FROM private.account_api_ip_admissions WHERE client_ip='${ips[2]}';`),
    '300',
  );
  checks.push(
    '300/301 IP admissions, absent and invalid keys consume quota, rejected attempt adds no event',
  );
}
async function checkAccountQuota(context) {
  for (let index = 0; index < 100; index++) {
    const admitted = await admit(context, ips[3], hashes[index % 2]);
    assert.equal(admitted.decision, 'allowed');
    assert.equal(admitted.account_id, accounts[0]);
  }
  assert.equal((await admit(context, ips[4], hashes[1])).decision, 'account_limited');
  assert.equal((await admit(context, ips[4], hashes[2])).decision, 'allowed');
  assert.equal((await admit(context, ips[4], hashes[3])).decision, 'invalid_key');
  sql(`UPDATE public.api_keys SET revoked_at=clock_timestamp() WHERE key_hash='${hashes[0]}';`);
  assert.equal((await admit(context, ips[4], hashes[0])).decision, 'invalid_key');
  sql(`UPDATE public.api_keys SET revoked_at=NULL WHERE key_hash='${hashes[0]}';
    UPDATE private.account_api_account_admissions SET admitted_at=clock_timestamp()-interval '301 seconds' WHERE account_id='${accounts[0]}';`);
  assert.equal((await admit(context, ips[4], hashes[0])).decision, 'allowed');
  assert.equal(
    sql(
      `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='${accounts[0]}';`,
    ),
    '1',
  );
  checks.push(
    '100/101 account quota shared across keys and IPs; accounts isolated; expiry/revocation and window recovery',
  );
}
async function checkConcurrency(context) {
  sql(`DELETE FROM private.account_api_account_admissions WHERE account_id='${accounts[0]}';
    INSERT INTO private.account_api_account_admissions(account_id,admitted_at)
    SELECT '${accounts[0]}',clock_timestamp() FROM generate_series(1,99);`);
  const results = await Promise.allSettled(
    ips.slice(5, 13).map((address, index) => admit(context, address, hashes[index % 2])),
  );
  assert.ok(
    results.every((result) => result.status === 'fulfilled'),
    'All concurrent requests must finish before cleanup',
  );
  const outcomes = results.map((result) => result.value);
  assert.equal(outcomes.filter((outcome) => outcome.decision === 'allowed').length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.decision === 'account_limited').length, 7);
  assert.equal(
    sql(
      `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='${accounts[0]}';`,
    ),
    '100',
  );
  checks.push(
    'eight concurrent HTTP callers across IPs/two keys admit exactly one final account slot',
  );
}
async function checkConcurrentIpQuota(context) {
  sql(`INSERT INTO private.account_api_ip_admissions(client_ip,admitted_at)
    SELECT '${ips[13]}'::inet,clock_timestamp() FROM generate_series(1,299);`);
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => admit(context, ips[13], null)),
  );
  assert.ok(results.every((result) => result.status === 'fulfilled'));
  const outcomes = results.map((result) => result.value);
  assert.equal(outcomes.filter((result) => result.decision === 'missing_key').length, 1);
  assert.equal(outcomes.filter((result) => result.decision === 'ip_limited').length, 7);
  assert.equal(
    sql(`SELECT count(*) FROM private.account_api_ip_admissions WHERE client_ip='${ips[13]}';`),
    '300',
  );
  checks.push('eight concurrent HTTP requests admit exactly one final IP slot at 299/300');
}
async function checkStrictWindowExpiry(context) {
  sql(`DELETE FROM private.account_api_account_admissions WHERE account_id='${accounts[0]}';
    INSERT INTO private.account_api_account_admissions(account_id,admitted_at)
    SELECT '${accounts[0]}',statement_timestamp()-interval '290 seconds' FROM generate_series(1,100);`);
  assert.equal((await admit(context, ips[14], hashes[1])).decision, 'account_limited');
  assert.equal(
    sql(
      `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='${accounts[0]}';`,
    ),
    '100',
  );
  const waitMilliseconds = Number(
    sql(`SELECT greatest(0,ceil(extract(epoch FROM
    (min(admitted_at)+interval '300 seconds'-clock_timestamp()))*1000))::integer
    FROM private.account_api_account_admissions WHERE account_id='${accounts[0]}';`),
  );
  assert.ok(waitMilliseconds <= 10_000, 'Fixture expiry must be imminent');
  await new Promise((resolve) => setTimeout(resolve, waitMilliseconds + 50));
  assert.equal((await admit(context, ips[14], hashes[1])).decision, 'allowed');
  assert.equal(
    sql(
      `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='${accounts[0]}';`,
    ),
    '1',
  );
  checks.push(
    'strict rolling window blocks 100 unexpired events then admits at real database-clock expiry',
  );
}
async function checkReservationSurvivesReadFailure(context) {
  assert.equal((await admit(context, ips[15], hashes[2])).decision, 'allowed');
  const before = sql(
    `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='${accounts[1]}';`,
  );
  const response = await fetch(
    new URL('/rest/v1/accounts?select=nonexistent_0123_column', context.target),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { apikey: context.service, Authorization: `Bearer ${context.service}` },
    },
  );
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, '42703');
  assert.equal(
    sql(
      `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id='${accounts[1]}';`,
    ),
    before,
  );
  assert.equal(
    sql(`SELECT count(*) FROM private.account_api_ip_admissions WHERE client_ip='${ips[15]}';`),
    '1',
  );
  checks.push(
    'committed admission survives a subsequent real HTTP database-read failure; DB boundary, not Next endpoint acceptance',
  );
}
try {
  const context = cloudContext();
  assertFixtureIpsUnused();
  fixtureStarted = true;
  seedFixtures();
  await checkExemption(context);
  await checkIpQuota(context);
  await checkAccountQuota(context);
  await checkConcurrency(context);
  await checkConcurrentIpQuota(context);
  await checkStrictWindowExpiry(context);
  await checkReservationSurvivesReadFailure(context);
  completed = true;
} catch (error) {
  console.error(
    JSON.stringify({
      passed: false,
      error:
        error instanceof assert.AssertionError ?
          error.message
        : 'Cloud admission harness failed; no raw CLI or credential output emitted',
      checks,
    }),
  );
  process.exitCode = 1;
} finally {
  if (fixtureStarted) {
    try {
      sql(`DELETE FROM private.account_api_ip_admissions WHERE client_ip IN (${ips.map((address) => `'${address}'::inet`).join(',')});
      DELETE FROM private.rate_limit_counters WHERE ip IN (${ips.map((address) => `'${address}'::inet`).join(',')});
      DELETE FROM public.accounts WHERE id IN ('${accounts[0]}','${accounts[1]}');`);
      assert.equal(
        sql(
          `SELECT count(*) FROM public.accounts WHERE id IN ('${accounts[0]}','${accounts[1]}');`,
        ),
        '0',
      );
      assert.equal(
        sql(
          `SELECT count(*) FROM private.account_api_ip_admissions WHERE client_ip IN (${ips.map((address) => "'" + address + "'::inet").join(',')});`,
        ),
        '0',
      );
      assert.equal(
        sql(
          `SELECT count(*) FROM private.account_api_account_admissions WHERE account_id IN ('${accounts[0]}','${accounts[1]}');`,
        ),
        '0',
      );
      assert.equal(
        sql(
          `SELECT count(*) FROM private.rate_limit_counters WHERE ip IN (${ips.map((address) => "'" + address + "'::inet").join(',')});`,
        ),
        '0',
      );
      assert.equal(
        sql(
          `SELECT count(*) FROM public.api_keys WHERE key_hash IN (${hashes.map((hash) => "'" + hash + "'").join(',')});`,
        ),
        '0',
      );
      console.log(
        JSON.stringify({
          cleanup: 'PASS',
          fixtureAccountsRemaining: 0,
          fixtureEventsRemaining: 0,
          fixtureCountersRemaining: 0,
          fixtureKeysRemaining: 0,
        }),
      );
    } catch {
      console.error(
        JSON.stringify({ cleanup: 'FAILED', fixtureAccounts: accounts, fixtureIps: ips }),
      );
      process.exitCode = 1;
    }
  }
}
if (completed && process.exitCode !== 1) {
  console.log(JSON.stringify({ passed: true, target: projectRef, checks }));
}
