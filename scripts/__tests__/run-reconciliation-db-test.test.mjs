import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execute, runReconciliationDbTest } from '../run-reconciliation-db-test.mjs';

const target = { project: 'saas-boilerplate', container: 'supabase_db_saas-boilerplate' };
function fakeExecutor({ failSuite = false, identity = 'true|saas-boilerplate' } = {}) {
  const calls = [];
  const run = async (command, args, input = '') => {
    calls.push({ command, args, input });
    if (args[0] === 'context')
      return { stdout: 'npipe:////./pipe/dockerDesktopLinuxEngine', stderr: '' };
    if (args[0] === 'inspect') return { stdout: identity, stderr: '' };
    if (input === 'SELECT system_identifier FROM pg_control_system();')
      return { stdout: '123456\n', stderr: '' };
    if (input.startsWith('SELECT\n    (SELECT count(*) FROM auth.users'))
      return { stdout: '0\n', stderr: '' };
    if (args[0] === 'test' && failSuite) throw new Error('induced test failure');
    return { stdout: '', stderr: '' };
  };
  return { calls, run };
}
test('usual package command uses guarded runner', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
  assert.equal(pkg.scripts['supa:test'], 'node scripts/run-reconciliation-db-test.mjs');
});
test('CI prepares runner dependencies before the attested SQL command', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const job = workflow.split('\n  db-tests:')[1].split('\n  edge-functions:')[0];
  assert.match(job, /uses: pnpm\/action-setup@/);
  assert.match(job, /uses: actions\/setup-node@/);
  const install = job.indexOf('pnpm install --frozen-lockfile');
  assert.ok(install >= 0 && install < job.indexOf('run: pnpm supa:test'));
  assert.match(job, /run: pnpm supa:test/);
  assert.doesNotMatch(job, /run: supabase test db/);
});
test('rejects another project and malformed container before any SQL', async () => {
  for (const rejected of [
    { project: 'other', container: 'supabase_db_other' },
    { ...target, container: 'remote:5432' },
  ]) {
    const fake = fakeExecutor();
    await assert.rejects(runReconciliationDbTest(rejected, [], fake.run));
    assert.equal(fake.calls.length, 0);
  }
});
test('rejects wrong Docker identity before SQL', async () => {
  const fake = fakeExecutor({ identity: 'true|other' });
  await assert.rejects(runReconciliationDbTest(target, [], fake.run));
  assert.equal(fake.calls.length, 2);
});
test('passes separate file arguments and always tears down after induced failure', async () => {
  const fake = fakeExecutor({ failSuite: true });
  const paths = ['supabase/tests/database/53_freeze_data_concurrency.test.sql'];
  await assert.rejects(runReconciliationDbTest(target, paths, fake.run), /induced test failure/);
  assert.deepEqual(fake.calls.find((call) => call.args[0] === 'test').args, [
    'test',
    'db',
    '--local',
    ...paths,
  ]);
  assert.match(fake.calls.at(-1).input, /DROP SCHEMA iroko_test_guard CASCADE/);
  assert.match(
    fake.calls.at(-1).input,
    /DELETE FROM billing.recovery_jobs WHERE resource_id IN \(SELECT resource_id FROM iroko_test_guard.recovery_resources\)/,
  );
});
test('empty file list retains complete local SQL suite', async () => {
  const fake = fakeExecutor();
  await runReconciliationDbTest(target, [], fake.run);
  assert.deepEqual(fake.calls.find((call) => call.args[0] === 'test').args, [
    'test',
    'db',
    '--local',
  ]);
});
test('hung child is terminated within a bounded deadline', async () => {
  await assert.rejects(
    execute(process.execPath, ['-e', 'setInterval(() => {},1000)'], '', 100),
    /timed out; child process terminated/,
  );
});
test('remote Docker endpoint is rejected before inspection or SQL', async () => {
  const calls = [];
  const remote = async (command, args) => {
    calls.push({ command, args });
    return { stdout: 'ssh://remote.example', stderr: '' };
  };
  await assert.rejects(runReconciliationDbTest(target, [], remote), /local socket/);
  assert.equal(calls.length, 1);
});
