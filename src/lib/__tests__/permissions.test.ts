import { describe, it, expect } from 'vitest';

import {
  canEditContent,
  canDeleteContent,
  canManageMembers,
  canManageBilling,
  canManageOrgSettings,
  type MembershipRole,
} from '../permissions';

const ALL_ROLES: MembershipRole[] = ['owner', 'admin', 'member', 'viewer'];

describe('canEditContent', () => {
  it('should allow owner, admin and member', () => {
    expect(canEditContent('owner')).toBe(true);
    expect(canEditContent('admin')).toBe(true);
    expect(canEditContent('member')).toBe(true);
  });

  it('should deny viewer and null', () => {
    expect(canEditContent('viewer')).toBe(false);
    expect(canEditContent(null)).toBe(false);
  });
});

describe('canDeleteContent', () => {
  it('should allow only owner', () => {
    expect(canDeleteContent('owner')).toBe(true);
  });

  it('should deny admin, member, viewer and null', () => {
    // Decisión consciente: subir member a editor no le da capacidad de
    // destruir, y admin tampoco la tiene — borrar sigue siendo solo-owner.
    expect(canDeleteContent('admin')).toBe(false);
    expect(canDeleteContent('member')).toBe(false);
    expect(canDeleteContent('viewer')).toBe(false);
    expect(canDeleteContent(null)).toBe(false);
  });
});

describe.each([
  ['canManageMembers', canManageMembers],
  ['canManageBilling', canManageBilling],
  ['canManageOrgSettings', canManageOrgSettings],
] as const)('%s', (_name, fn) => {
  it('should allow owner and admin', () => {
    expect(fn('owner')).toBe(true);
    expect(fn('admin')).toBe(true);
  });

  it('should deny member, viewer and null', () => {
    expect(fn('member')).toBe(false);
    expect(fn('viewer')).toBe(false);
    expect(fn(null)).toBe(false);
  });
});

describe('every role is covered', () => {
  it('should return a boolean for all four roles without throwing', () => {
    for (const role of ALL_ROLES) {
      expect(typeof canEditContent(role)).toBe('boolean');
      expect(typeof canDeleteContent(role)).toBe('boolean');
      expect(typeof canManageMembers(role)).toBe('boolean');
    }
  });
});
