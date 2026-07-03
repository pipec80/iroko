import { describe, it, expect } from 'vitest';
import { appConfig } from '../app.config';

describe('appConfig', () => {
  it('has a non-empty name and brand', () => {
    expect(appConfig.name.length).toBeGreaterThan(0);
    expect(appConfig.brand.length).toBeGreaterThan(0);
  });

  it('has a valid support email', () => {
    expect(appConfig.supportEmail).toMatch(/@/);
  });

  it('defaultLocale is included in locales', () => {
    expect(appConfig.locales).toContain(appConfig.defaultLocale);
  });

  it('feature toggles are booleans', () => {
    expect(typeof appConfig.features.billing).toBe('boolean');
    expect(typeof appConfig.features.projects).toBe('boolean');
    expect(typeof appConfig.features.members).toBe('boolean');
    expect(typeof appConfig.features.activityLog).toBe('boolean');
    expect(typeof appConfig.features.verticals.robot).toBe('boolean');
  });

  it('urls object has all required keys populated', () => {
    const keys = ['site', 'support', 'docs', 'github', 'twitter'] as const;
    for (const key of keys) {
      expect(appConfig.urls[key].length).toBeGreaterThan(0);
    }
  });

  it('theme vars are CSS variable references', () => {
    expect(appConfig.theme.primaryColor).toMatch(/^var\(--/);
    expect(appConfig.theme.accentColor).toMatch(/^var\(--/);
  });
});
