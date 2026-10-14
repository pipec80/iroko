# Plan 016 T1 — generated artifacts alternative evidence

Candidate: `03ef8730560c638328c7bad12e58d50376493080`. Review performed on candidate blobs using `git show` and `git grep`, not the modified working tree. This document records the generated-file alternative to manual EOF review. It does **not** assert human inspection of every line, successful compilation, reproducible installation, database parity, Cloud parity, or operational acceptance.

## Immutable ledger and method

Hashes below are SHA-256 of raw UTF-8 candidate blobs obtained through Git; physical ranges include all source lines. Neither generated artifact was regenerated or changed.

| Artifact                | Physical range | SHA-256                                                            | Review method                                                                                                                                   |
| ----------------------- | -------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm-lock.yaml`        | 1–16268        | `182df7e3b518902454366b76a3a0e7685ee7edaaa2e4e0e0cd99b82234002046` | Full YAML parse, unique-key validation, importer/override/graph/patch correspondence checks; manual importer and selected metadata inspection   |
| `src/types/database.ts` | 1–2722         | `9fd5cc20330ec634df4e1ecf61054b40ca4666c9ebaba56e7fcb51a78cd8f138` | Full TypeScript syntax AST parse, generated object inventory compared with SQL declaration index; selected RPC and consumer contract inspection |
| `package.json`          | 1–190          | `2efc7becf2f521973d12106bd7ea211e37e5a8ab6bb9ae60565e1ab0f4538e5a` | Previously inspected source, parsed direct dependency declarations and generator scripts                                                        |
| `pnpm-workspace.yaml`   | 1–48           | `4648f80e474f8b61f8f59c9a33e635ac3c57432ce23faf3cc6d13b10bf836064` | Previously inspected source, parsed overrides and patch mapping                                                                                 |

Installed parsers used: Python 3.11 / PyYAML 6.0; TypeScript 6.0.3 `createSourceFile` from existing `node_modules`; existing Next compiled semver implementation for direct range satisfaction. No package was installed. AST parsing is syntax analysis, **not** `tsc`, typechecking, or compilation. Initial direct `require('yaml')` and a pnpm-store YAML path did not resolve; the installed Python parser was used instead. Sandbox helper setup refresh later failed; authorized escalated read-only commands were used to resume inspection. One interrupted shell session could not be resumed; its unreturned output was not counted as evidence.

## Lockfile correspondence

Structural ranges: version 1; settings 3–5; overrides 7–35; patched dependencies 37–38; importers 40–299; packages 301–8064; snapshots 8065–16268. Full YAML parsing and custom duplicate-key rejection completed successfully.

- Exactly one importer, `.`. Its 38 production and 47 development dependencies correspond to package declarations: zero missing direct entries and zero specifier mismatches after applying direct workspace overrides. Resolved direct versions satisfy their effective ranges: zero failures.
- All 28 lock overrides equal workspace overrides. Examples: Next 16.3.5, Vite 8.0.16, esbuild 0.28.1, PostCSS 8.5.28, sharp 0.35.4 and the browser Vitest override 4.1.11. The overridden importer specifiers for PostCSS and `@vitest/browser` are intentionally exact rather than the original package caret ranges.
- All 85 importer resolutions have corresponding snapshot entries. There are 1558 package records and 1561 snapshots; every snapshot has its base package record after removing peer-context suffixes.
- All 3581 dependency/optional-dependency edges resolve within snapshots after npm-alias normalization. The four alias edges are `string-width-cjs` → `string-width@4.2.3`, `strip-ansi-cjs` → `strip-ansi@6.0.1`, `wrap-ansi-cjs` → `wrap-ansi@7.0.0`, and `web-vitals-soft-navs` → `web-vitals@6.0.0`. A naive name-plus-version check falsely reported these four; corrected normalization leaves zero unresolved edges.
- `patches/minimatch@3.1.5.patch` exists in the candidate. Its raw SHA-256 is `626ad3baefe1c4f92ef97ce62f5161d5207dfa8a7f9e93ff3efed52e5d89c51a`, exactly matching lock patchedDependencies line 38 and the workspace patch mapping. This checks correspondence, not successful patch application.

Selected resolved versions visible in importer ranges: Supabase JS 2.117.1 satisfies package `^2.116.0`; SSR 0.12.7; Next 16.3.5; React/React DOM 19.3.0; Sentry 10.67.0; Playwright 1.62.1; Vitest/browser/UI/coverage 4.1.11; TypeScript 6.0.3. The Next ESLint preset 16.2.11 and bundle analyzer 16.2.12 differ from Next itself; version differences alone do not establish a compatibility defect. Package engine Node24 and package-manager pnpm11.22 are declarations, not proof of the environment used to create or install the lock.

Workspace `allowBuilds` and release-age exclusions are install policy rather than entries whose effectiveness can be established solely from resolution records. [pnpm 11 documentation](https://pnpm.io/blog/releases/11.0) confirms default minimumReleaseAge1440 and the allowBuilds policy; no incorrect default-zero inference is made. Registry tarball integrity verification, complete transitive semver/peer/engine compatibility, platform-specific optional package execution, audit database freshness and successful frozen installation remain **[NO VERIFICADO]**. The checks above do not prove packages are safe, installed, or executable.

## Generated database type structure

Full source syntax parse yielded zero parse diagnostics. Top-level schema AST ranges: audit 10–103; billing 104–923; public 924–2555. Generic helpers and enum Constants occupy the remaining tail through 2722; inspected tail selects public as default, supports schema-qualified Tables/Insert/Update/Enums/CompositeTypes, and repeats enum values as runtime constants. Private/auth/storage schemas are outside this generator's selected inventory, intentionally not certified here.

| Schema  | Tables | Views | Functions | Enums |
| ------- | ------ | ----- | --------- | ----- |
| audit   | 1      | 1     | 0         | 1     |
| billing | 14     | 1     | 1         | 5     |
| public  | 20     | 0     | 78        | 6     |

The 128 generated object names were contrasted with a case-insensitive candidate SQL CREATE declaration index across schemas and migrations. The index found 315 declarations and 131 distinct schema/category/name objects. Every generated object has a corresponding CREATE declaration. The three SQL-only objects are explained rather than treated as drift:

- `public.apply_subscription_event`: legacy definition; dropped in `20260710000000_billing_apply_event_provider.sql:18` and `20260826125500_drop_legacy_billing_event_rpc.sql:9`.
- `public.get_billing_reconciliation_candidates`: replaced legacy RPC; dropped in `20260911130000_billing_reconciliation_state.sql:301`.
- `billing.assert_provider_price_matches_plan`: trigger-returning function, at `supabase/schemas/billing.sql:310` and `20260826123000_billing_core_v2.sql:111-112`; absence from callable generated RPC inventory is not itself missing application API evidence.

This is a lexical declaration comparison, not SQL execution or an AST-derived final database catalog. It does not fully replay migrations, overloads, dependency ordering, dynamic SQL, ALTER/DROP column evolution, privileges, RLS, SQL nullability or inferred relationship cardinality. Consequently the zero unmatched generated names is narrower than schema parity.

## Generator and consumer contracts inspected

`package.json:73` and CI `.github/workflows/ci.yml:229` both generate local `public,billing,audit` TypeScript into this file; linked generator at package75 uses the same schema selection. CI229–235 generates and fails on a Git diff, but this review neither ran it nor treats its definition as a passing result. Local versus linked output correspondence remains **[NO VERIFICADO]**.

`src/lib/supabase/{admin,client,middleware,server}.ts` import Database. Middleware75 and server10 instantiate the typed SSR client. Generic client typing constrains application query names and shapes; it does not authorize callers, enforce tenant isolation, or validate provider payloads at runtime.

Selected exact RPC contrasts:

- `claim_billing_recovery_jobs` generated2008–2018 takes batch/visibility numbers and returns id/provider/resource/reason/attempt count, matching `supabase/schemas/public.sql:3936-3951`. Recovery consumer invokes it at `src/lib/billing/recovery.ts:159`.
- `complete_billing_recovery_job` generated2030–2040 takes job id/outcome and optional error code, returning status/anomaly flag. Mirror3955–3957 has matching UUID/text/text-default-null parameters and result fields; consumer recovery43 invokes this API. Neither API includes a fencing token, consistent with existing D01; typing cannot repair lease ownership semantics. Do not count this as a new independent finding.
- `get_email_worker_health` generated2199–2210 has no arguments and the seven health fields. Mirror3066–3080 defines the same timestamp/status/error/timeout/queue/oldest/dead-letter result names. Generated scalar types omit explicit return-field nullability, so the nightly shell's null checks are still meaningful; type declarations alone do not guarantee non-null operational observations.
- `apply_invoice_paid` generated1852–1870 includes payment identifiers, currency/amount, paid timestamp and period endpoints, matching the reducer contract previously inspected in the billing review. This does not validate financial facts or resolve the existing MP discovery status discrepancy D11.

No new blocking artifact-correspondence defect was confirmed by this alternative. Required fresh evidence remains a permitted frozen install/patch application and version-appropriate checks for the lock, plus local database generation/diff and relevant SQL checks for generated types. They were deliberately not executed in this read-only review. Cloud parity requires separately authorized remote evidence.

Only this auxiliary document was created for the generated-artifact delegation. Matrices and generated sources were not edited. Mark the review as structured generated-file alternative evidence, not manual EOF or runtime acceptance.
