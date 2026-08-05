import { describe, it, expect } from 'vitest';

import { base32Decode, generateTotp, msUntilNextTotpStep } from './totp';

// RFC 6238 Appendix B — official test vectors (HMAC-SHA1, 8-digit codes).
// Secret is the ASCII string "12345678901234567890" (20 bytes), base32-encoded.
const RFC_6238_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

const RFC_6238_VECTORS: Array<{ timeSeconds: number; code: string }> = [
  { timeSeconds: 59, code: '94287082' },
  { timeSeconds: 1_111_111_109, code: '07081804' },
  { timeSeconds: 1_111_111_111, code: '14050471' },
  { timeSeconds: 1_234_567_890, code: '89005924' },
  { timeSeconds: 2_000_000_000, code: '69279037' },
  // Forces the 64-bit counter through the 32-bit boundary — requires
  // writeBigUInt64BE, not two writeUInt32BE calls, or this vector fails.
  { timeSeconds: 20_000_000_000, code: '65353130' },
];

describe('generateTotp', () => {
  it.each(RFC_6238_VECTORS)(
    'produces the RFC 6238 8-digit code for T=$timeSeconds',
    ({ timeSeconds, code }) => {
      const result = generateTotp(RFC_6238_SECRET_BASE32, {
        timestampMs: timeSeconds * 1000,
        digits: 8,
      });
      expect(result).toBe(code);
    },
  );

  it('defaults to 6 digits — the last 6 of the same 8-digit truncation (94287082 -> 287082)', () => {
    const result = generateTotp(RFC_6238_SECRET_BASE32, { timestampMs: 59_000 });
    expect(result).toBe('287082');
    expect(result).toHaveLength(6);
  });

  it('accepts base32 secrets with lowercase, spaces and padding', () => {
    const messy = 'gezd gnbv gy3t qojq gezd gnbv gy3t qojq===';
    const clean = generateTotp(RFC_6238_SECRET_BASE32, { timestampMs: 59_000 });
    expect(generateTotp(messy, { timestampMs: 59_000 })).toBe(clean);
  });
});

describe('base32Decode', () => {
  it('decodes the RFC 6238 secret back to its original ASCII bytes', () => {
    const decoded = base32Decode(RFC_6238_SECRET_BASE32);
    expect(decoded.toString('ascii')).toBe('12345678901234567890');
  });
});

describe('msUntilNextTotpStep', () => {
  it('returns the full step when exactly on a step boundary', () => {
    expect(msUntilNextTotpStep(30_000, 30)).toBe(30_000);
  });

  it('returns the remaining ms before the next 30s boundary', () => {
    expect(msUntilNextTotpStep(35_000, 30)).toBe(25_000);
  });
});
