import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  analytics: vi.fn(),
  speed: vi.fn(),
}));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: (props: { beforeSend: (event: unknown) => unknown }) => {
    sdk.analytics(props);
    return <div data-testid="vercel-analytics" />;
  },
}));
vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: (props: { beforeSend: (event: unknown) => unknown }) => {
    sdk.speed(props);
    return <div data-testid="vercel-speed-insights" />;
  },
}));

import { VercelAnalyticsConsent } from '../vercel-analytics-consent';
import { writeConsentCookie } from '@/lib/cookie-consent';

beforeEach(() => {
  sdk.analytics.mockClear();
  sdk.speed.mockClear();
  document.cookie = 'cookie_consent=; path=/; max-age=0';
});

it('does not mount either SDK before consent and blocks events after revocation', async () => {
  render(<VercelAnalyticsConsent />);
  expect(screen.queryByTestId('vercel-analytics')).toBeNull();
  expect(screen.queryByTestId('vercel-speed-insights')).toBeNull();
  expect(sdk.analytics).not.toHaveBeenCalled();
  expect(sdk.speed).not.toHaveBeenCalled();

  act(() => writeConsentCookie({ analytics: true, marketing: false }));
  await waitFor(() => expect(screen.getByTestId('vercel-analytics')).toBeTruthy());
  await waitFor(() => expect(screen.getByTestId('vercel-speed-insights')).toBeTruthy());
  const analyticsGuard = sdk.analytics.mock.lastCall?.[0].beforeSend;
  const speedGuard = sdk.speed.mock.lastCall?.[0].beforeSend;
  const event = { url: '/es' };
  expect(analyticsGuard(event)).toBe(event);
  expect(speedGuard(event)).toBe(event);

  act(() => writeConsentCookie({ analytics: false, marketing: false }));
  expect(screen.queryByTestId('vercel-analytics')).toBeNull();
  expect(screen.queryByTestId('vercel-speed-insights')).toBeNull();
  expect(analyticsGuard(event)).toBeNull();
  expect(speedGuard(event)).toBeNull();
});
