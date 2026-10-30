/** Fix the offered browser scenarios before execution; deferred positives remain available for return. */
export function offeredE2eScope(features: { projects: boolean; robot: boolean }) {
  return {
    // CSP requires its own confined runner regardless of the product configuration.
    testIgnore: [
      '**/csp.spec.ts',
      '**/password-settings.spec.ts',
      ...(features.projects ?
        ['**/projects-disabled.spec.ts']
      : ['**/projects.spec.ts', '**/document-editor.spec.ts']),
      ...(features.robot ? ['**/robot-disabled.spec.ts'] : []),
    ],
    grepInvert: features.projects ? /@confined-017/ : /@projects-enabled|@confined-017/,
  };
}
