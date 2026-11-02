import { describe, expect, it } from 'vitest';

import { formatPlanAmount } from '../presentation';

describe('plan amount presentation', () => {
  it('keeps CLP as whole pesos', () => {
    expect(formatPlanAmount(19990, 'CLP', 'es-CL')).toContain('19.990');
  });
  it('converts USD minor units using the currency exponent', () => {
    expect(formatPlanAmount(1990, 'USD', 'en')).toBe('$19.90');
  });
  it('supports zero and three decimal currencies without assuming cents', () => {
    expect(formatPlanAmount(1990, 'JPY', 'en')).toContain('1,990');
    expect(formatPlanAmount(1990, 'KWD', 'en')).toContain('1.990');
  });
});
