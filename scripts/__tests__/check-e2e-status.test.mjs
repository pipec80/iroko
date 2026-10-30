import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { acceptE2eResults } from '../check-e2e-status.mjs';

test('accepts only successful E2E jobs or explicitly permitted skips', () => {
  assert.equal(acceptE2eResults(['success', 'success'], false), true);
  assert.equal(acceptE2eResults(['success', 'cancelled'], false), false);
  assert.equal(acceptE2eResults(['failure', 'success'], true), false);
  assert.equal(acceptE2eResults(['skipped', 'skipped'], false), false);
  assert.equal(acceptE2eResults(['skipped', 'skipped'], true), true);
  assert.equal(acceptE2eResults(['success', 'unknown'], true), false);
});

test('CLI fails on cancellation and accepts an authorized skip', () => {
  const script = new URL('../check-e2e-status.mjs', import.meta.url);
  const run = (e2e, webkit, allowSkipped) =>
    spawnSync(process.execPath, [fileURLToPath(script)], {
      env: { ...process.env, E2E_RESULT: e2e, WEBKIT_RESULT: webkit, ALLOW_SKIPPED: allowSkipped },
      encoding: 'utf8',
    });
  assert.equal(run('success', 'cancelled', 'false').status, 1);
  assert.equal(run('skipped', 'skipped', 'false').status, 1);
  assert.equal(run('skipped', 'skipped', 'true').status, 0);
});

test('Build depends on security and E2E status calls the checker', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const build = workflow.slice(workflow.indexOf('\n  build:'));
  const e2eStatus = workflow.slice(
    workflow.indexOf('\n  e2e-status:'),
    workflow.indexOf('\n  build:'),
  );
  assert.match(build, /needs:\s*\[[^\]]*security[^\]]*\]/);
  assert.match(e2eStatus, /scripts\/check-e2e-status\.mjs/);
});

test('CI routes confined 017 scenarios through the existing isolated runner and owned Auth policy', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const e2e = workflow.slice(workflow.indexOf('\n  e2e:'), workflow.indexOf('\n  e2e-webkit:'));
  const general = e2e.slice(
    e2e.indexOf('- name: Run E2E tests'),
    e2e.indexOf('- name: Test confined acceptance runner'),
  );
  assert.doesNotMatch(general, /LOCAL_VALIDATION/);
  const policy = e2e.slice(
    e2e.indexOf('- name: Prepare owned CI Auth password policy'),
    e2e.indexOf('- name: Run confined 017 acceptance'),
  );
  assert.match(policy, /true\|saas-boilerplate\|true/);
  assert.match(policy, /GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION/);
  assert.match(policy, /test ! -e \/\.env/);
  assert.match(policy, /GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=true/);
  assert.match(policy, /docker restart supabase_auth_saas-boilerplate/);
  assert.match(policy, /\.State\.Health\.Status/);
  assert.match(policy, /seq 1 30/);
  assert.doesNotMatch(policy, /supabase (?:stop|start)|docker restart supabase_db/);
  assert.match(
    e2e,
    /env -i PATH="\$PATH" HOME="\$HOME" node scripts\/run-plan-017-local\.mjs password-settings\.spec\.ts analytics\.spec\.ts/,
  );
  assert.ok(
    e2e.indexOf('Run confined CSP and consumer acceptance') <
      e2e.indexOf('Prepare owned CI Auth password policy'),
  );
  assert.ok(
    e2e.indexOf('Prepare owned CI Auth password policy') <
      e2e.indexOf('Run confined 017 acceptance'),
  );
  assert.doesNotMatch(
    e2e.slice(e2e.indexOf('- name: Run confined 017 acceptance')),
    /continue-on-error:\s*true/,
  );
});
