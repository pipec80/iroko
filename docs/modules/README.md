# Module Catalog

Last static verification: **2026-08-20**
Repository baseline inspected: `fe4b90ae59acf1105569b2edf6bfd705b548e6fe`

These guides explain implemented product capabilities. They are versioned
because code, plans, CI comments, and roadmap records link to them. They are not
release certificates: a guide can be current at the code level while its live
runtime or provider behavior remains **[NO VERIFICADO]**.

## Current modules

| Module                                             | Implementation     | Static verification                                        | Runtime / Cloud     |
| -------------------------------------------------- | ------------------ | ---------------------------------------------------------- | ------------------- |
| [Admin alert email](admin-alerts.md)               | Merged via PR #62  | Current paths and schema present                           | **[NO VERIFICADO]** |
| [Product analytics](analytics.md)                  | Merged via PR #109 | Current analytics code and configuration present           | **[NO VERIFICADO]** |
| [Platform announcements](announcements.md)         | Merged via PR #73  | Current code, schema, and tests present                    | **[NO VERIFICADO]** |
| [GDPR export and deletion](gdpr.md)                | Merged via PR #75  | Current code, schema, and tests present                    | **[NO VERIFICADO]** |
| [Impersonation](impersonation.md)                  | Merged via PR #64  | Current code and E2E specification present                 | **[NO VERIFICADO]** |
| [Legal pages and cookie consent](legal-cookies.md) | Merged via PR #66  | Current pages, consent code, and tests present             | **[NO VERIFICADO]** |
| [Onboarding](onboarding.md)                        | Merged via PR #70  | Current flow, actions, and tests present                   | **[NO VERIFICADO]** |
| [Platform administration](platform-admin.md)       | Merged via PR #60  | Current code present; one known audit-table defect remains | **[NO VERIFICADO]** |

## Maintenance contract

- Executable code, tests, migrations, and configuration override prose when
  they disagree.
- Update the affected guide in the same pull request when a module contract,
  route, authorization boundary, schema, or operational procedure changes.
- Keep original PR measurements and incident narratives only when explicitly
  labelled historical.
- Record fresh runtime and Cloud results in
  [operational evidence](../quality/operational-evidence.md); do not turn a
  historical green check into a current claim.
- Move a removed module to an audit or completed-plan record instead of leaving
  a current-looking guide behind.
