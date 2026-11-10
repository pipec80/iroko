# Dependency security — integration 2026-11-10

[PR250](https://github.com/pipec80/iroko/pull/250) consolidates the pending
Dependabot updates245–249 with the local014/015 closure. Next, its analyzer and
ESLint config are aligned at16.4.5; Supabase is2.119.0; Tailwind/PostCSS4.3.5,
Node types26.6.6, Knip6.44.2 and shadcn4.23.0 are resolved in the lockfile.
The normal protected-branch checks remain required before merge.

## Scoped overrides and local patch

- `glob >=9 <14.0.2` resolves to14.0.4 for
  [GHSA-3g3m-2fjr-6pw4](https://github.com/isaacs/node-glob/security/advisories/GHSA-3g3m-2fjr-6pw4).
- `minimatch >=7 <11.0.1` resolves to11.0.6 for
  [GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
  The existing minimatch3 patch remains separate. Node24 supports the selected
  versions; a ZIP glob-selection/byte regression checks compatibility.
- `deepmerge@4.3.1` has a pnpm patch filtering `__proto__`, `constructor` and
  `prototype` in the shared key enumeration used for source and target copies,
  in source/CJS/UMD entrypoints. Ordinary arrays, nested options and symbols
  remain supported. The regression reproduced poisoning before the patch and
  passes after it. See [upstream report273](https://github.com/TehShrike/deepmerge/issues/273).

At verification time the registry still published4.3.1;4.3.2 returned404.
Therefore the low-severity deepmerge advisory can remain visible in Dependabot
and `pnpm audit` even though its reported vector is patched locally. Do not
dismiss it or claim a patched upstream release. The maintenance action is to
replace the local patch when a verified corrected release exists.

`pnpm test:dependency-security` exercises the installed dependency entries and
ZIP selection. CI runs this regression alongside the production audit. Worker,
email-render and export checks complement it; they do not certify every
possible consumer. No toolchain major upgrade or alert suppression is used.
