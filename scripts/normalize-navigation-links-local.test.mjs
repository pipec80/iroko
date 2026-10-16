import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyLink,
  buildPlan,
  buildApplySql,
  parseMode,
  assertOfficialTarget,
} from './normalize-navigation-links-local.mjs';

test('classifies with the real TS helper, preserving valid Unicode destinations', () => {
  assert.deepEqual(classifyLink('https://mañana.example'), {
    category: 'normalizable',
    href: 'https://xn--maana-pta.example/',
  });
  assert.deepEqual(classifyLink('/es/café'), { category: 'normalizable', href: '/es/caf%C3%A9' });
  assert.deepEqual(classifyLink('/es/dashboard'), { category: 'canonical', href: '/es/dashboard' });
  assert.deepEqual(classifyLink(null), { category: 'canonical', href: null });
  assert.deepEqual(classifyLink('   '), { category: 'normalizable', href: null });
  assert.deepEqual(classifyLink('javascript:alert(1)'), { category: 'invalid', href: null });
});

test('only explicit local apply is accepted; omission means check', () => {
  assert.equal(parseMode([]), '--check');
  assert.equal(parseMode(['--check']), '--check');
  assert.equal(parseMode(['--apply']), '--apply');
  for (const args of [['--linked'], ['--apply', '--check'], ['--remote']])
    assert.throws(() => parseMode(args));
  assert.doesNotThrow(() =>
    assertOfficialTarget('project_id = "saas-boilerplate"', {
      running: true,
      project: 'saas-boilerplate',
    }),
  );
  for (const target of [
    { running: false, project: 'saas-boilerplate' },
    { running: true, project: 'other' },
  ])
    assert.throws(() => assertOfficialTarget('project_id = "saas-boilerplate"', target));
  assert.throws(() =>
    assertOfficialTarget('project_id = "other"', { running: true, project: 'saas-boilerplate' }),
  );
});

const id = '00000000-0000-0000-0000-000000005199';
test('plan exposes counts separately and retains rows for compare-and-swap', () => {
  const plan = buildPlan({
    announcements: [{ id, link: 'https://mañana.example' }],
    notifications: [{ id, link: 'javascript:x' }],
  });
  assert.deepEqual(plan.counts.announcements, {
    rows: 1,
    canonical: 0,
    normalizable: 1,
    invalid: 0,
    updates: 1,
  });
  assert.equal(plan.tables.announcements[0].new_link, 'https://xn--maana-pta.example/');
  assert.equal(plan.tables.notifications[0].new_link, null);
  assert.equal(plan.tables.notifications[0].old_link, 'javascript:x');
  assert.throws(() => buildPlan({ announcements: [{ id: 'bad', link: null }], notifications: [] }));
  assert.throws(() =>
    buildPlan({
      announcements: [
        { id, link: null },
        { id, link: null },
      ],
      notifications: [],
    }),
  );
});

test('apply SQL locks both tables and rejects all snapshot drift before updates', () => {
  const plan = buildPlan({ announcements: [{ id, link: '   ' }], notifications: [] });
  const sql = buildApplySql(plan);
  assert.ok(sql.startsWith('BEGIN;'));
  assert.ok(
    sql.includes(
      'LOCK TABLE public.announcements, public.notifications IN SHARE ROW EXCLUSIVE MODE;',
    ),
  );
  assert.ok(sql.includes('FULL JOIN'));
  assert.ok(sql.includes('IS DISTINCT FROM s.old_link'));
  assert.ok(sql.includes('navigation_link_snapshot_drift'));
  assert.ok(sql.indexOf('navigation_link_snapshot_drift') < sql.indexOf('UPDATE public.'));
  assert.ok(sql.includes('IS DISTINCT FROM s.new_link'));
  assert.ok(sql.endsWith('COMMIT;'));
  assert.ok(!sql.includes('DELETE FROM'));
});

test('dollar quoting cannot be escaped by a historical link', () => {
  const attack = '/x?token=$navigation_snapshot_0$; DELETE FROM auth.users; --';
  const sql = buildApplySql(
    buildPlan({ announcements: [{ id, link: attack }], notifications: [] }),
  );
  assert.ok(sql.includes('$navigation_snapshot_1$'));
  assert.ok(sql.includes(attack));
  assert.equal(sql.split('$navigation_snapshot_1$').length, 3);
});

test('outer procedure quoting also excludes attacker-controlled delimiters', () => {
  const attack = '/x?token=$navigation_apply_0$; SELECT 1; --';
  const sql = buildApplySql(
    buildPlan({ announcements: [{ id, link: attack }], notifications: [] }),
  );
  assert.ok(sql.includes('DO $navigation_apply_1$'));
  assert.equal(sql.split('$navigation_apply_1$').length, 3);
});
