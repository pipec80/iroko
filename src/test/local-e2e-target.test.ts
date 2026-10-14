import { describe, expect, it } from 'vitest';

import { requireLoopbackUrl, resolveDbTarget, validateDbContainerState } from './local-e2e-target';

const isolated = {
  LOCAL_VALIDATION: 'true',
  E2E_SUPABASE_PROJECT_ID: 'iroko-014-disposable',
  E2E_SUPABASE_DB_CONTAINER: 'supabase_db_iroko-014-disposable',
  E2E_SUPABASE_URL: 'http://127.0.0.1:56321',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:56321',
};

describe('isolated acceptance target', () => {
  it('selects only the exact explicit disposable project', () => {
    expect(resolveDbTarget(isolated, 'maintainer')).toEqual({
      project: 'iroko-014-disposable',
      container: 'supabase_db_iroko-014-disposable',
    });
  });
  it('never falls back when isolated project metadata is missing', () => {
    expect(() => resolveDbTarget({ LOCAL_VALIDATION: 'true' }, 'maintainer')).toThrow();
  });
  it('rejects a different container and mismatched application API', () => {
    expect(() =>
      resolveDbTarget({ ...isolated, E2E_SUPABASE_DB_CONTAINER: 'supabase_db_maintainer' }, ''),
    ).toThrow();
    expect(() =>
      resolveDbTarget({ ...isolated, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' }, ''),
    ).toThrow();
  });
  it.each([
    'https://project.supabase.co',
    'http://127.0.0.1.example.com',
    'https://localhost:3000',
    'http://user:pass@localhost:3000',
    'http://localhost:3000/path',
    'http://localhost:3000?x=1',
    'http://localhost:3000#fragment',
  ])('rejects unsafe endpoint %s', (url) => {
    expect(() => requireLoopbackUrl(url)).toThrow();
  });
  it('uses the exact repository project for ordinary local tests', () => {
    expect(resolveDbTarget({}, 'saas-boilerplate').container).toBe('supabase_db_saas-boilerplate');
  });
  it('requires the Docker project label and running state', () => {
    expect(() =>
      validateDbContainerState('true|iroko-014-disposable', isolated.E2E_SUPABASE_PROJECT_ID),
    ).not.toThrow();
    expect(() =>
      validateDbContainerState('true|maintainer', isolated.E2E_SUPABASE_PROJECT_ID),
    ).toThrow();
    expect(() =>
      validateDbContainerState('false|iroko-014-disposable', isolated.E2E_SUPABASE_PROJECT_ID),
    ).toThrow();
  });
});
