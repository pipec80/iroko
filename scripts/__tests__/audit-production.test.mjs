import assert from 'node:assert/strict';
import test from 'node:test';
import { auditDecision } from '../audit-production-dependencies.mjs';

const id = 'GHSA-fc5q-39xc-vjpf';
function report(entries) {
  return {
    advisories: Object.fromEntries(entries.map((entry, index) => [index, entry])),
    metadata: {
      vulnerabilities: {
        high: entries.filter((e) => e.severity === 'high').length,
        critical: entries.filter((e) => e.severity === 'critical').length,
      },
    },
  };
}
const covered = {
  github_advisory_id: id,
  module_name: 'picomatch',
  severity: 'high',
  findings: [{ version: '4.0.7', paths: ['app>sentry>picomatch'] }],
};
test('permits only the exact mitigated advisory and version', () => {
  assert.deepEqual(auditDecision(report([covered])), { blockers: [], mitigated: [id] });
});
test('still rejects an additional high or critical advisory', () => {
  for (const severity of ['high', 'critical'])
    assert.deepEqual(
      auditDecision(report([covered, { ...covered, github_advisory_id: 'GHSA-other', severity }]))
        .blockers,
      ['GHSA-other'],
    );
});
test('rejects a second unpatched version and unknown findings', () => {
  for (const findings of [
    [],
    [{ version: '2.3.2', paths: ['app>other>picomatch'] }],
    [...covered.findings, { version: '4.0.6', paths: ['other'] }],
  ]) {
    assert.deepEqual(auditDecision(report([{ ...covered, findings }])).blockers, [id]);
  }
});
test('fails closed on malformed or incomplete audit output', () => {
  assert.throws(() => auditDecision({}));
  assert.throws(() => auditDecision({ ...report([]), advisories: 'invalid' }));
  assert.throws(() => auditDecision(report([{ ...covered, severity: undefined }])));
  const incomplete = report([]);
  incomplete.metadata.vulnerabilities.high = 1;
  assert.throws(() => auditDecision(incomplete));
});
test('retains the existing high threshold for other severities', () => {
  assert.deepEqual(auditDecision(report([{ ...covered, severity: 'moderate' }])), {
    blockers: [],
    mitigated: [],
  });
});
