import { describe, expect, it } from 'vitest';
import { offeredE2eScope } from './e2e-scope';

describe('offered E2E scenario selection', () => {
  it('selects exclusion scenarios and retains unrelated privacy/RBAC cases for the MVP', () => {
    const scope = offeredE2eScope({ projects: false, robot: false });
    expect(scope.testIgnore).toContain('**/projects.spec.ts');
    expect(scope.testIgnore).toContain('**/document-editor.spec.ts');
    expect(scope.testIgnore).not.toContain('**/projects-disabled.spec.ts');
    expect(scope.testIgnore).not.toContain('**/robot-disabled.spec.ts');
    expect(scope.testIgnore).not.toContain('**/analytics.spec.ts');
    expect(scope.testIgnore).not.toContain('**/rbac-matrix.spec.ts');
    expect(scope.testIgnore).toContain('**/password-settings.spec.ts');
    expect(scope.grepInvert?.test('signup funnel @projects-enabled')).toBe(true);
    expect(scope.grepInvert?.test('analytics strips synthetic Auth URL data')).toBe(false);
    expect(scope.grepInvert?.test('synthetic Auth URL data @confined-017')).toBe(true);
  });
  it('retains deferred positive scenarios only in a configuration that offers the modules', () => {
    const scope = offeredE2eScope({ projects: true, robot: true });
    expect(scope.testIgnore).not.toContain('**/projects.spec.ts');
    expect(scope.testIgnore).not.toContain('**/document-editor.spec.ts');
    expect(scope.testIgnore).toContain('**/projects-disabled.spec.ts');
    expect(scope.testIgnore).toContain('**/robot-disabled.spec.ts');
    expect(scope.grepInvert?.test('synthetic Auth URL data @confined-017')).toBe(true);
    expect(scope.grepInvert?.test('signup funnel @projects-enabled')).toBe(false);
  });
});
