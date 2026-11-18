import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupOwnedFixture, cleanupOwnedFixtures } from '../cleanup-access-account-fixture.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const owner = { id, runId: '44318030945' };
const user = {
  id,
  email: `access-account-${id}@example.test`,
  created_at: new Date().toISOString(),
  user_metadata: { given_name: 'AccessAcceptance', family_name: owner.runId },
};

function client(value, error = null) {
  const deleted = [];
  return {
    deleted,
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: value }, error }),
        deleteUser: async (target) => {
          deleted.push(target);
          return { error: null };
        },
      },
    },
  };
}

test('deletes only the exact fresh owned fixture', async () => {
  const admin = client(user);
  await cleanupOwnedFixture(admin, owner);
  assert.deepEqual(admin.deleted, [id]);
});

test('rejects another run, account, identity, stale fixture and malformed ID', async () => {
  for (const value of [
    { ...user, user_metadata: { ...user.user_metadata, family_name: '42' } },
    { ...user, email: 'unrelated@example.test' },
    { ...user, id: 'another-id' },
    { ...user, created_at: '2020-01-01T00:00:00Z' },
  ]) {
    const admin = client(value);
    await assert.rejects(cleanupOwnedFixture(admin, owner), /fixture_ownership/);
    assert.deepEqual(admin.deleted, []);
  }
  await assert.rejects(cleanupOwnedFixture(client(user), { ...owner, id: 'bad' }), /fixture_input/);
});

test('missing user is idempotent but transport or permission failure blocks', async () => {
  await cleanupOwnedFixture(client(null, { status: 404, code: 'user_not_found' }), owner);
  for (const status of [401, 403, 404, 429, 500]) {
    const admin = client(null, { status });
    await assert.rejects(cleanupOwnedFixture(admin, owner), /fixture_lookup/);
    assert.deepEqual(admin.deleted, []);
  }
});

test('a rejected previous target cannot prevent cleanup of the current fixture', async () => {
  const admin = client(user);
  await assert.rejects(
    cleanupOwnedFixtures(admin, [{ id: 'bad', runId: '42' }, owner]),
    /incomplete/,
  );
  assert.deepEqual(admin.deleted, [id]);
});
