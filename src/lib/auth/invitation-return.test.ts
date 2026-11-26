import { describe, expect, it } from 'vitest';

import { invitationReturn } from './invitation-return';

const token = 'a'.repeat(64);
const target = `/es/auth/accept-invitation?token=${token}`;

describe('invitationReturn', () => {
  it('preserves only the localized invitation and its token', () => {
    expect(invitationReturn(target, 'es')).toBe(target);
  });

  it.each([
    `https://example.com${target}`,
    `${target}&token=${token}`,
    `${target}&next=/es/dashboard`,
    `${target}#fragment`,
    target.replace('/es/', '/en/'),
    target.replace(token, 'invalid'),
  ])('rejects unrelated or ambiguous destinations %s', (value) => {
    expect(invitationReturn(value, 'es')).toBeNull();
  });
});
