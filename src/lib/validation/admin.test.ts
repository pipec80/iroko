import { describe, expect, it } from 'vitest';

import {
  ADMIN_ACCOUNTS_DEFAULT_PAGE_SIZE,
  ADMIN_ACCOUNTS_MAX_PAGE_SIZE,
  adminAccountsQuerySchema,
  platformAuditLogQuerySchema,
} from './admin';

describe('adminAccountsQuerySchema', () => {
  it('applies defaults when given an empty object', () => {
    const result = adminAccountsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(ADMIN_ACCOUNTS_DEFAULT_PAGE_SIZE);
      expect(result.data.search).toBeNull();
      expect(result.data.cursor).toBeNull();
    }
  });

  it('rejects a limit above the maximum page size', () => {
    expect(
      adminAccountsQuerySchema.safeParse({ limit: ADMIN_ACCOUNTS_MAX_PAGE_SIZE + 1 }).success,
    ).toBe(false);
  });

  it('rejects a limit below 1', () => {
    expect(adminAccountsQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('accepts a well-formed cursor', () => {
    const result = adminAccountsQuerySchema.safeParse({
      cursor: { createdAt: '2026-07-01T10:00:00Z', id: '11111111-1111-4111-8111-111111111111' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a cursor with a non-uuid id', () => {
    expect(
      adminAccountsQuerySchema.safeParse({
        cursor: { createdAt: '2026-07-01T10:00:00Z', id: 'not-a-uuid' },
      }).success,
    ).toBe(false);
  });
});

describe('platformAuditLogQuerySchema', () => {
  it('applies defaults when given an empty object', () => {
    const result = platformAuditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.accountId).toBeNull();
      expect(result.data.actorId).toBeNull();
      expect(result.data.action).toBeNull();
      expect(result.data.resourceType).toBeNull();
    }
  });

  it('rejects an unknown action value', () => {
    expect(platformAuditLogQuerySchema.safeParse({ action: 'not_a_real_action' }).success).toBe(
      false,
    );
  });

  it('accepts a well-formed cursor', () => {
    const result = platformAuditLogQuerySchema.safeParse({
      cursor: { createdAt: '2026-07-01T10:00:00Z', id: 3 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts an accountId filter', () => {
    const result = platformAuditLogQuerySchema.safeParse({
      accountId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid accountId', () => {
    expect(platformAuditLogQuerySchema.safeParse({ accountId: 'nope' }).success).toBe(false);
  });
});
