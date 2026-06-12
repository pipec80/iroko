import { describe, expect, it } from 'vitest';

import { inviteSchema, removeMemberSchema, INVITABLE_ROLES } from './team';

describe('inviteSchema', () => {
  it('parses a single email into a one-element array', () => {
    const result = inviteSchema.safeParse({ emails: 'ana@example.com', role: 'member' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.emails).toEqual(['ana@example.com']);
  });

  it('splits by comma, trims whitespace and lowercases', () => {
    const result = inviteSchema.safeParse({
      emails: ' Ana@Example.com ,  BOB@example.COM ',
      role: 'admin',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emails).toEqual(['ana@example.com', 'bob@example.com']);
    }
  });

  it('ignores empty entries from trailing commas', () => {
    const result = inviteSchema.safeParse({ emails: 'ana@example.com,,', role: 'member' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.emails).toHaveLength(1);
  });

  it('rejects empty input', () => {
    expect(inviteSchema.safeParse({ emails: '', role: 'member' }).success).toBe(false);
  });

  it('rejects when any email in the list is malformed', () => {
    expect(
      inviteSchema.safeParse({ emails: 'ana@example.com,not-an-email', role: 'member' }).success,
    ).toBe(false);
  });

  it('accepts exactly 10 emails and rejects 11', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `user${i}@example.com`).join(',');
    const eleven = `${ten},user10@example.com`;
    expect(inviteSchema.safeParse({ emails: ten, role: 'member' }).success).toBe(true);
    expect(inviteSchema.safeParse({ emails: eleven, role: 'member' }).success).toBe(false);
  });

  it('accepts every invitable role', () => {
    for (const role of INVITABLE_ROLES) {
      expect(inviteSchema.safeParse({ emails: 'a@b.com', role }).success).toBe(true);
    }
  });

  it('rejects owner — ownership is never granted by invitation', () => {
    expect(inviteSchema.safeParse({ emails: 'a@b.com', role: 'owner' }).success).toBe(false);
  });
});

describe('removeMemberSchema', () => {
  it('accepts a valid UUID', () => {
    expect(
      removeMemberSchema.safeParse({ userId: '550e8400-e29b-41d4-a716-446655440000' }).success,
    ).toBe(true);
  });

  it('rejects non-UUID input', () => {
    expect(removeMemberSchema.safeParse({ userId: 'not-a-uuid' }).success).toBe(false);
  });
});
