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
  expect(analyticsGuard(event)).toEqual(event);
  expect(speedGuard(event)).toEqual(event);

  act(() => writeConsentCookie({ analytics: false, marketing: false }));
  expect(screen.queryByTestId('vercel-analytics')).toBeNull();
  expect(screen.queryByTestId('vercel-speed-insights')).toBeNull();
  expect(analyticsGuard(event)).toBeNull();
  expect(speedGuard(event)).toBeNull();
});

it('removes credentials and personal query data from both SDK URLs without mutating input', async () => {
  act(() => writeConsentCookie({ analytics: true, marketing: false }));
  render(<VercelAnalyticsConsent />);
  await waitFor(() => expect(sdk.analytics).toHaveBeenCalled());
  await waitFor(() => expect(sdk.speed).toHaveBeenCalled());
  const guards = [
    sdk.analytics.mock.lastCall?.[0].beforeSend,
    sdk.speed.mock.lastCall?.[0].beforeSend,
  ];
  for (const guard of guards) {
    for (const [url, expected] of [
      [
        'http://localhost:3000/es/auth/click?token_hash=PRIVATE_MARKER&code=PRIVATE_MARKER&email=PRIVATE_MARKER#PRIVATE_MARKER',
        '/es/auth/click',
      ],
      ['/es/signup/confirmation?email=PRIVATE_MARKER', '/es/signup/confirmation'],
      ['javascript:PRIVATE_MARKER', ':redacted'],
      ['/es/dashboard', '/es/dashboard'],
    ]) {
      const event = { url, type: 'pageview', route: '/[locale]/auth/click' };
      const result = guard(event);
      expect(result).toEqual({ ...event, url: expected });
      expect(JSON.stringify(result)).not.toContain('PRIVATE_MARKER');
      expect(event.url).toBe(url);
    }
  }
});
