export type SentryBuildContext = {
  uploadSourceMaps?: string;
  ci?: string;
  tokenPresent: boolean;
  localValidation: boolean;
  githubRepository?: string;
  githubRef?: string;
  githubEvent?: string;
  vercel?: string;
  vercelEnv?: string;
  vercelProjectId?: string;
};

/** Authorizes build effects only in explicitly opted-in, known CI contexts. */
export function isSentryUploadAuthorized(input: SentryBuildContext): boolean {
  if (
    input.uploadSourceMaps !== 'true' ||
    input.ci !== 'true' ||
    !input.tokenPresent ||
    input.localValidation
  )
    return false;
  if (input.githubEvent === 'pull_request' || input.githubEvent === 'pull_request_target')
    return false;
  if (
    input.githubRepository !== undefined ||
    input.githubRef !== undefined ||
    input.githubEvent !== undefined
  ) {
    return (
      input.githubRepository === 'pipec80/iroko' &&
      input.githubRef === 'refs/heads/main' &&
      (input.githubEvent === 'push' || input.githubEvent === 'workflow_dispatch')
    );
  }
  return (
    input.vercel === '1' &&
    (input.vercelEnv === 'preview' || input.vercelEnv === 'production') &&
    input.vercelProjectId === 'prj_gEe5cFBOgMxmCCNisaRzZW2xZBiL'
  );
}
