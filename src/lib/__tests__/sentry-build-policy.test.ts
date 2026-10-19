import { describe, expect, it } from 'vitest';

import { isSentryUploadAuthorized } from '../sentry-build-policy';

const github = {
  uploadSourceMaps: 'true',
  ci: 'true',
  tokenPresent: true,
  localValidation: false,
  githubRepository: 'pipec80/iroko',
  githubRef: 'refs/heads/main',
  githubEvent: 'push',
};

describe('Sentry build authorization', () => {
  it.each([undefined, 'false', 'invalid'])('denies flag %s', (uploadSourceMaps) => {
    expect(isSentryUploadAuthorized({ ...github, uploadSourceMaps })).toBe(false);
  });
  it.each([
    { ci: undefined },
    { ci: 'false' },
    { tokenPresent: false },
    { localValidation: true },
    { githubRepository: 'other/iroko' },
    { githubRef: 'refs/heads/feature' },
    { githubEvent: 'pull_request' },
    { githubEvent: 'pull_request_target' },
    { githubEvent: undefined },
  ])('denies untrusted context %j', (override) => {
    expect(isSentryUploadAuthorized({ ...github, ...override })).toBe(false);
  });
  it.each(['push', 'workflow_dispatch'])('allows trusted GitHub %s', (githubEvent) => {
    expect(isSentryUploadAuthorized({ ...github, githubEvent })).toBe(true);
  });
  it.each(['preview', 'production'])('allows explicit Iroko Vercel %s', (vercelEnv) => {
    expect(
      isSentryUploadAuthorized({
        uploadSourceMaps: 'true',
        ci: 'true',
        tokenPresent: true,
        localValidation: false,
        vercel: '1',
        vercelEnv,
        vercelProjectId: 'prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL',
      }),
    ).toBe(true);
  });
  it('denies missing context and other Vercel projects', () => {
    expect(
      isSentryUploadAuthorized({
        uploadSourceMaps: 'true',
        ci: 'true',
        tokenPresent: true,
        localValidation: false,
      }),
    ).toBe(false);
    expect(
      isSentryUploadAuthorized({
        uploadSourceMaps: 'true',
        ci: 'true',
        tokenPresent: true,
        localValidation: false,
        vercel: '1',
        vercelEnv: 'preview',
        vercelProjectId: 'other',
      }),
    ).toBe(false);
  });
  it('cannot override a GitHub PR with Vercel markers', () => {
    expect(
      isSentryUploadAuthorized({
        ...github,
        githubEvent: 'pull_request',
        vercel: '1',
        vercelEnv: 'preview',
        vercelProjectId: 'prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL',
      }),
    ).toBe(false);
  });
});
