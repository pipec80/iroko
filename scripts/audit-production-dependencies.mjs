import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** Only the tested, pinned local mitigation can satisfy its exact advisory. */
export function auditDecision(report) {
  if (!report?.advisories || !report.metadata?.vulnerabilities)
    throw new Error('Unsupported audit report');
  if (typeof report.advisories !== 'object' || Array.isArray(report.advisories))
    throw new Error('Unsupported advisory map');
  const entries = Object.values(report.advisories);
  if (
    entries.some(
      (entry) =>
        !entry || !['info', 'low', 'moderate', 'high', 'critical'].includes(entry.severity),
    )
  )
    throw new Error('Unsupported advisory severity');
  const severe = entries.filter((a) => ['high', 'critical'].includes(a.severity));
  const counts = report.metadata.vulnerabilities;
  if (
    !Number.isInteger(counts.high) ||
    !Number.isInteger(counts.critical) ||
    counts.high < 0 ||
    counts.critical < 0 ||
    counts.high !== severe.filter((a) => a.severity === 'high').length ||
    counts.critical !== severe.filter((a) => a.severity === 'critical').length ||
    counts.high + counts.critical !== severe.length
  )
    throw new Error('Incomplete audit report');
  const blockers = [];
  const mitigated = [];
  for (const advisory of severe) {
    const covered =
      advisory.github_advisory_id === 'GHSA-fc5q-39xc-vjpf' &&
      advisory.module_name === 'picomatch' &&
      Array.isArray(advisory.findings) &&
      advisory.findings.length > 0 &&
      advisory.findings.every(
        (finding) =>
          finding.version === '4.0.7' &&
          Array.isArray(finding.paths) &&
          finding.paths.length > 0 &&
          finding.paths.every((path) => typeof path === 'string' && path.length > 0),
      );
    (covered ? mitigated : blockers).push(advisory.github_advisory_id ?? 'unknown-advisory');
  }
  return { blockers, mitigated };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.env.npm_execpath || process.env.PICOMATCH_TEST_ROOT)
      throw new Error('Use pnpm audit:production on the installed tree');
    const guard = spawnSync(
      process.execPath,
      ['--test', 'scripts/__tests__/picomatch-security.test.mjs'],
      { stdio: 'inherit' },
    );
    if (guard.status !== 0) throw new Error('Installed mitigation failed');
    // pnpm11 --ignore modifies configuration and returns early: never use it here.
    const result = spawnSync(
      process.execPath,
      [process.env.npm_execpath, 'audit', '--prod', '--json'],
      { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
    );
    if (result.error || ![0, 1].includes(result.status))
      throw new Error('Audit registry unavailable');
    const decision = auditDecision(JSON.parse(result.stdout));
    for (const id of decision.mitigated)
      process.stdout.write(`Locally mitigated (pinned patch): ${id}\n`);
    for (const id of decision.blockers)
      process.stderr.write(`Unmitigated high/critical advisory: ${id}\n`);
    process.exitCode = decision.blockers.length ? 1 : 0;
  } catch {
    process.stderr.write(
      'Production dependency audit failed closed; inspect configuration, registry or mitigation.\n',
    );
    process.exitCode = 1;
  }
}
