import { describe, expect, it } from 'vitest';

import {
  auditLogQuerySchema,
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  AUDIT_LOG_MAX_PAGE_SIZE,
} from './audit-log';

describe('auditLogQuerySchema', () => {
  it('applies defaults when given an empty object', () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(AUDIT_LOG_DEFAULT_PAGE_SIZE);
      expect(result.data.cursor).toBeNull();
      expect(result.data.action).toBeNull();
      expect(result.data.resourceType).toBeNull();
    }
  });

  it('accepts the maximum page size', () => {
    const result = auditLogQuerySchema.safeParse({ limit: AUDIT_LOG_MAX_PAGE_SIZE });
    expect(result.success).toBe(true);
  });

  it('rejects a limit above the maximum page size', () => {
    expect(auditLogQuerySchema.safeParse({ limit: AUDIT_LOG_MAX_PAGE_SIZE + 1 }).success).toBe(
      false,
    );
  });

  it('rejects a limit below 1', () => {
    expect(auditLogQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('rejects an unknown action value', () => {
    expect(auditLogQuerySchema.safeParse({ action: 'not_a_real_action' }).success).toBe(false);
  });

  it('rejects an unknown resource type', () => {
    expect(auditLogQuerySchema.safeParse({ resourceType: 'not_a_real_table' }).success).toBe(false);
  });

  it('accepts a well-formed cursor', () => {
    const result = auditLogQuerySchema.safeParse({
      cursor: { createdAt: '2026-07-01T10:00:00Z', id: 3 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toEqual({ createdAt: '2026-07-01T10:00:00Z', id: 3 });
    }
  });

  it('rejects a cursor with a non-datetime createdAt', () => {
    expect(
      auditLogQuerySchema.safeParse({ cursor: { createdAt: 'not-a-date', id: 3 } }).success,
    ).toBe(false);
  });

  it('rejects a cursor with a non-positive id', () => {
    expect(
      auditLogQuerySchema.safeParse({ cursor: { createdAt: '2026-07-01T10:00:00Z', id: 0 } })
        .success,
    ).toBe(false);
  });
});
