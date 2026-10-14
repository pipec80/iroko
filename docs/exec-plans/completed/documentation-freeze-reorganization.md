# Documentation Freeze Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed historical roadmap with a concise MVP-freeze
roadmap, classify every maintained execution plan, and preserve all versioned
and local history without adding product scope.

**Architecture:** Keep ADR 0001's authority hierarchy intact. Preserve the
current roadmap as an exact raw snapshot, make the root roadmap own only freeze
direction and sequence, move non-active plan families to a deferred tree, and
remove duplicated status/order from secondary entry points. Execute in small
committed groups with a local preflight manifest and repository-wide link
validation after every move.

**Tech Stack:** Markdown, Git, PowerShell 7, Node.js documentation checker,
Prettier 3.

**Spec:**
[`docs/architecture/documentation-freeze-structure.md`](../../architecture/documentation-freeze-structure.md)

## Global Constraints

- Add no product capability, payment provider, vertical, commercial module,
  database change, application code or Cloud operation.
- Preserve unrelated working-tree changes and ignored/private material.
- Do not create an isolated worktree from the original baseline: it omits the
  current modified and untracked documentation. First create the Task 1
  checkpoint, then follow the execution method selected by the owner.
- Keep `docs/current-state.md` above `ROADMAP.md` in the existing authority
  hierarchy.
- Preserve the pre-freeze `ROADMAP.md` bytes and SHA-256 hash before replacing
  it.
- Keep ignored/private filenames and contents out of committed manifests.
- A directory move never changes completion status by itself.
- Use PowerShell end-to-end for local file inventory and ignored-file moves;
  use literal paths for local moves.
- Stage only the files named by the current task and verify the staged list
  before every commit.
- Do not push, merge, deploy or mutate provider/Cloud resources.

## Review Focus

1. **Ignored/private leakage:** no path below `docs/private/`, ignored local
   manifest, screenshot or generated preview becomes staged or versioned.
   Task 5 verifies the final tracked/staged sets.
2. **Incomplete baseline:** all existing modified and untracked documentation
   is included in the Task 1 checkpoint or explicitly recorded as unrelated
   and preserved. Task 1 compares the preflight status with its staging list.
3. **Archive corruption:** the raw roadmap snapshot must hash exactly like the
   pre-replacement root roadmap. Task 2 checks SHA-256 before committing and
   Task 5 checks it again.
4. **Broken or stale navigation:** moved Plan 011/013 paths, ignored
   `estado-fases` dependencies and old authority claims must disappear from
   maintained current documentation. Tasks 3–5 combine `docs:check` with
   targeted `rg` searches.
5. **False status claims:** Plan 011 must be “freeze scope satisfied; remaining
   scenarios deferred,” Plan 013 must be conditional, and Plans 001–010 must
   remain completed evidence. Tasks 3 and 4 review these exact meanings.

---

### Task 1: Preserve the current documentation baseline

**Files:**

- Create locally, ignored:
  `docs/local/plans-archive/documentation-freeze-preflight/git-status.txt`
- Create locally, ignored:
  `docs/local/plans-archive/documentation-freeze-preflight/versioned-files.tsv`
- Create locally, ignored:
  `docs/local/plans-archive/documentation-freeze-preflight/ignored-files.tsv`
- Create locally, ignored:
  `docs/local/plans-archive/documentation-freeze-preflight/file-hashes.sha256`
- Create locally, ignored:
  `docs/local/plans-archive/documentation-freeze-preflight/roadmap.sha256`
- Create locally, ignored:
  `docs/local/plans-archive/documentation-freeze-preflight/baseline-commit.txt`
- Commit the existing approved documentation work in the paths listed below;
  do not modify its content in this task.

**Interfaces:**

- Consumes: the dirty documentation worktree approved as the input to this
  reorganization.
- Produces: one baseline commit containing all maintained documentation inputs;
  a local-only inventory directory; the exact pre-freeze roadmap hash used by
  Tasks 2 and 5.

- [ ] **Step 1: Re-read the operating contract and spec**

Read `AGENTS.md`, `docs/index.md`, `docs/current-state.md`, ADR 0001 and the
spec linked above. Confirm that no product implementation is authorized.

- [ ] **Step 2: Capture repository and file inventories without changing files**

Create
`docs/local/plans-archive/documentation-freeze-preflight/`. Record:

- `git status --short --branch` in `git-status.txt`;
- tracked plus untracked/non-ignored `docs/` paths, class and size in
  `versioned-files.tsv`;
- ignored `docs/` paths, class and size in `ignored-files.tsv`;
- SHA-256 for every existing file below `docs/` in `file-hashes.sha256`;
- SHA-256 for `ROADMAP.md` alone in `roadmap.sha256`.

Use `Get-ChildItem -Recurse -File`, `Get-FileHash -Algorithm SHA256`,
`git ls-files`, `git ls-files --others --exclude-standard` and
`git ls-files --others --ignored --exclude-standard`. Do not print file
contents or commit this directory.

- [ ] **Step 3: Verify the captured baseline**

Run:

```powershell
git status --short --branch
git check-ignore -v docs/local/plans-archive/documentation-freeze-preflight/git-status.txt
Get-FileHash -Algorithm SHA256 ROADMAP.md
Get-Content docs/local/plans-archive/documentation-freeze-preflight/roadmap.sha256
```

Expected: the manifest path is ignored; the two roadmap hashes match; the
status still contains every preflight modification and untracked document.
The design inspection found 241 tracked, 8 untracked/non-ignored and 173
ignored files before the spec and plan were added. Record actual execution
counts instead of forcing those historical numbers.

- [ ] **Step 4: Review the existing documentation diff before checkpointing**

Run `git diff --` for each modified path and open each untracked Markdown file.
The intended checkpoint set is:

```text
README.md
ROADMAP.md
docs/architecture/system-overview.md
docs/architecture/iot-vertical-pilot.md
docs/architecture/product-strategy.md
docs/audits/2026-09-24-reusable-saas-readiness.md
docs/audits/2026-10-05-saas-template-competitive-landscape.md
docs/capabilities.md
docs/current-state.md
docs/exec-plans/active/012-security-hardening-and-pricing-truth.md
docs/exec-plans/active/013-launch-readiness-roadmap.md
docs/exec-plans/active/014-reference-surface-correctness.md
docs/exec-plans/active/015-reusable-foundation-acceptance.md
docs/exec-plans/active/016-nextjs-supabase-code-review.md
docs/index.md
docs/modules/README.md
docs/quality/testing-strategy.md
```

The approved spec and this plan are already committed process artifacts; they
are not part of the pending checkpoint unless execution changes them.

If any listed diff is unrelated to the approved documentation investigation,
leave it unstaged and record the ruling in the execution ledger. Do not absorb
unknown work to obtain a clean status.

- [ ] **Step 5: Validate the checkpoint content**

Run:

```powershell
pnpm docs:check
pnpm test:docs-check
pnpm exec prettier --check README.md ROADMAP.md docs/architecture/system-overview.md docs/architecture/iot-vertical-pilot.md docs/architecture/product-strategy.md docs/audits/2026-09-24-reusable-saas-readiness.md docs/audits/2026-10-05-saas-template-competitive-landscape.md docs/capabilities.md docs/current-state.md docs/exec-plans/active/012-security-hardening-and-pricing-truth.md docs/exec-plans/active/013-launch-readiness-roadmap.md docs/exec-plans/active/014-reference-surface-correctness.md docs/exec-plans/active/015-reusable-foundation-acceptance.md docs/exec-plans/active/016-nextjs-supabase-code-review.md docs/index.md docs/modules/README.md docs/quality/testing-strategy.md docs/exec-plans/active/documentation-freeze-reorganization.md
git diff --check
```

Expected: documentation checks and four checker tests pass; Prettier and diff
checks report no errors.

- [ ] **Step 6: Stage only the reviewed checkpoint and verify the index**

Stage the exact intended files with `git add -- <paths>`, then run:

```powershell
git diff --cached --name-status
git diff --cached --check
git status --short
```

Expected: the staged list contains only the reviewed documentation paths; no
ignored/local/private file is present.

- [ ] **Step 7: Commit the documentation baseline**

```powershell
git commit -m "docs: capture reusable foundation baseline"
```

After the commit, write `git rev-parse HEAD` to `baseline-commit.txt`, recompute
`roadmap.sha256` from the committed `ROADMAP.md`, then rerun
`git status --short` and compare it with the preflight status. Only explicitly
excluded unrelated work may remain.

---

### Task 2: Archive the previous roadmap and install the freeze roadmap

**Files:**

- Create: `docs/history/README.md`
- Create:
  `docs/history/roadmaps/roadmap-pre-freeze-2026-10-05.raw.md.txt`
- Replace: `ROADMAP.md:1-664`
- Modify: `docs/index.md`

**Interfaces:**

- Consumes: Task 1's `roadmap.sha256` and committed pre-freeze roadmap.
- Produces: exact raw historical snapshot; concise root roadmap owning freeze
  scope, order, gates and deferred boundaries; history navigation used by
  later tasks.

- [ ] **Step 1: Copy the roadmap bytes before editing the root file**

Create `docs/history/roadmaps/`. Copy `ROADMAP.md` with byte APIs, not a
line-oriented writer, to
`roadmap-pre-freeze-2026-10-05.raw.md.txt`. Do not add a header to the raw file.

- [ ] **Step 2: Prove the raw snapshot is exact**

Run `Get-FileHash -Algorithm SHA256` for the root roadmap, the raw snapshot and
the Task 1 recorded value.

Expected: all three hashes are identical. Stop before replacing the root file
if any value differs.

- [ ] **Step 3: Write the history index**

In `docs/history/README.md`, record:

- original path `ROADMAP.md`;
- capture date `2026-10-05`;
- baseline commit from Task 1;
- SHA-256 from Task 1;
- raw snapshot path and `.txt` rationale;
- statement that history is non-authoritative;
- link back to current `ROADMAP.md`, `docs/current-state.md` and ADR 0001.

- [ ] **Step 4: Replace the root roadmap with the approved freeze contract**

Write a concise roadmap with these sections:

1. identity and MVP objective;
2. authority boundary;
3. freeze rule and allowed work;
4. exact ordered queue;
5. MVP exit gates;
6. deferred scope and reactivation conditions;
7. navigation to current state, capabilities, active plans and history.

The ordered queue must be exactly:

```text
011 freeze scope satisfied; remaining scenarios deferred
→ 016 T0/T1
→ 014 T1
→ 012.1 Grants
→ 012.3 rate-limiting investigation
→ 012.2 SSRF
→ 012.4 CSP and secrets
→ 012.5 pricing truth
→ 014 T2/T3
→ 016 T2/T3
→ 015
→ solid MVP candidate
```

Do not copy engineering standards, provider prices, historical prompts or
phase checklists into the new roadmap. Link their current owners.

- [ ] **Step 5: Link the current and historical roadmaps from the index**

Update `docs/index.md` navigation without yet moving execution plans. Label the
raw snapshot as history and the root roadmap as direction/order below current
state.

- [ ] **Step 6: Validate the archive and roadmap**

Run:

```powershell
pnpm docs:check
pnpm test:docs-check
pnpm exec prettier --check ROADMAP.md docs/history/README.md docs/index.md
git diff --check
Get-FileHash -Algorithm SHA256 docs/history/roadmaps/roadmap-pre-freeze-2026-10-05.raw.md.txt
Get-Content docs/local/plans-archive/documentation-freeze-preflight/roadmap.sha256
```

Expected: all checks pass and the archive hash still matches the preflight
value.

- [ ] **Step 7: Commit the roadmap transition**

Stage only `ROADMAP.md`, `docs/history/README.md`, the raw snapshot and
`docs/index.md`. Verify `git diff --cached --name-status`, then commit:

```powershell
git commit -m "docs: replace roadmap with freeze sequence"
```

---

### Task 3: Establish the active, deferred and completed plan lifecycle

**Files:**

- Create: `docs/exec-plans/README.md`
- Create: `docs/exec-plans/deferred/011-billing/README.md`
- Move to `docs/exec-plans/deferred/011-billing/`:
  - `011-billing-correctness.md`
  - `011-mercadopago-reliability-roadmap.md`
  - `011-mercadopago-v1-chile-acceptance.md`
  - `011-phase1-core-v2-tasks.md`
  - `011-phase2-mercadopago-tasks.md`
  - `011-phase3-stripe-certification-tasks.md`
  - `011-phase4-paddle-tasks.md`
  - `011-phase5-lemon-squeezy-tasks.md`
  - `011-phase6-reconciliation-tasks.md`
  - `011a-mercadopago-payment-health-paid-through.md`
  - `011b-mercadopago-checkout-resolution.md`
  - `011c-mercadopago-financial-anomalies.md`
  - `011d-mercadopago-invoice-discovery-reconciliation.md`
  - `011e-mercadopago-worker-rollout.md`
  - `011f-mercadopago-internal-acceptance.md`
  - `011g-mercadopago-refund-ingress.md`
- Move: `docs/exec-plans/active/013-launch-readiness-roadmap.md` to
  `docs/exec-plans/deferred/013-launch-readiness-roadmap.md`
- Modify every maintained Markdown file that links to a moved plan.

**Interfaces:**

- Consumes: Task 2's roadmap classifications and exact order.
- Produces: stable active/deferred/completed directory semantics and a complete
  move map used by Tasks 4 and 5.

- [ ] **Step 1: Create lifecycle indexes before moving files**

`docs/exec-plans/README.md` must define:

- active = bounded work in the current freeze;
- deferred = preserved work outside the freeze or waiting for an external
  condition;
- completed = acceptance criteria satisfied with evidence;
- directory placement does not authorize execution or prove completion;
- roadmap owns order and current state owns verified evidence.

The Plan 011 README must use the exact meaning from the spec: current freeze
scope satisfied, recorded evidence remains scenario/date bounded, and remaining
provider/operational scenarios are deferred rather than erased or completed.

- [ ] **Step 2: Move the 16 Plan 011 files and Plan 013 with recorded Git moves**

Create both deferred directories. Use `git mv -- <literal source>
<literal destination>` for each listed file. Do not use a wildcard that could
capture Plans 012–016 or the maintenance plan.

- [ ] **Step 3: Update Plan 011 internal references**

Keep basename-only links within the grouped 011 directory where valid. Replace
hardcoded `docs/exec-plans/active/011...` paths inside deferred files with the
new exact path. Preserve historical completion/evidence text.

- [ ] **Step 4: Update every maintained incoming link**

Use `rg -l` first, then edit the actual Markdown targets in:

```text
docs/architecture/billing-platform-v2-design.md
docs/architecture/mercadopago-reliability-design.md
docs/architecture/product-strategy.md
docs/architecture/system-overview.md
docs/current-state.md
docs/index.md
docs/modules/README.md
docs/modules/gdpr.md
docs/quality/operational-evidence.md
```

Also update any additional current Markdown file found at execution time. Do
not rewrite completed-plan prose merely because it mentions a historical path
inside inline code; update actual maintained navigation and broken Markdown
links.

- [ ] **Step 5: Assert the final plan classification**

Run:

```powershell
Get-ChildItem docs/exec-plans/active -File | Sort-Object Name | Select-Object -ExpandProperty Name
Get-ChildItem docs/exec-plans/deferred/011-billing -File | Sort-Object Name | Select-Object -ExpandProperty Name
Get-ChildItem docs/exec-plans/completed -File | Sort-Object Name | Select-Object -ExpandProperty Name
rg -n "exec-plans/active/011|exec-plans/active/013" -g "*.md" . --glob "!docs/exec-plans/completed/**"
```

Expected:

- active contains Plans 012, 014, 015, 016 and this temporary maintenance plan;
- deferred 011 contains its README plus all 16 listed files;
- deferred root contains Plan 013;
- completed still contains Plans 001–010;
- the stale-path search returns no current/deferred maintained reference.

- [ ] **Step 6: Validate all recorded moves and links**

Run:

```powershell
pnpm docs:check
pnpm test:docs-check
pnpm exec prettier --check docs/exec-plans/README.md docs/exec-plans/deferred/011-billing/README.md docs/exec-plans/deferred/011-billing/*.md docs/exec-plans/deferred/013-launch-readiness-roadmap.md docs/architecture/billing-platform-v2-design.md docs/architecture/mercadopago-reliability-design.md docs/architecture/product-strategy.md docs/architecture/system-overview.md docs/current-state.md docs/index.md docs/modules/README.md docs/modules/gdpr.md docs/quality/operational-evidence.md
git diff --check
git diff --summary
```

Expected: checks pass and Git reports the planned moves rather than deletions
with missing replacements.

- [ ] **Step 7: Commit the plan lifecycle**

Stage only the indexes, recorded moves and incoming-link updates. Inspect the
cached name-status and summary, then commit:

```powershell
git commit -m "docs: classify freeze execution plans"
```

---

### Task 4: Remove duplicated authority and archive stale local status

**Files:**

- Modify: `README.md`
- Modify: `SECURITY.md`
- Modify: `docs/index.md`
- Modify: `docs/current-state.md`
- Modify: `docs/architecture/system-overview.md`
- Modify: `docs/architecture/product-strategy.md`
- Modify: `docs/modules/README.md`
- Modify: `docs/modules/gdpr.md`
- Modify: `docs/prompts/codex-follow-up-operations.md`
- Modify: `docs/prompts/codex-remediation-orchestrator.md`
- Modify: `docs/quality/testing-strategy.md`
- Modify as discovered: maintained Markdown containing obsolete roadmap
  authority, active Plan 011/013 meaning or dependency on ignored status files.
- Move locally, ignored: `docs/estado-fases.md` to
  `docs/local/plans-archive/estado-fases-2026-07-28.md`

**Interfaces:**

- Consumes: Task 3's plan index and move map.
- Produces: one navigation path with distinct owners; no maintained current
  document depends on ignored `estado-fases`; local historical bytes preserved.

- [ ] **Step 1: Simplify the documentation index**

Make `docs/index.md` a navigation and lifecycle entry point. Remove its detailed
duplicate active-plan status table. Link to:

- current state for verified status;
- root roadmap for freeze order;
- capabilities for declared surface;
- execution-plan README for lifecycle and plan locations;
- history for superseded material.

Add `history/` and `exec-plans/deferred/` to the directory policy.

- [ ] **Step 2: Simplify current state without losing evidence**

Keep dated implementation/runtime evidence in `docs/current-state.md`. Replace
competing order prose with one link to the root roadmap. Its active-work section
may summarize each plan's evidence status, but it must not define another task
sequence. Update Plan 011/013 links to deferred paths and state their exact
deferred meanings.

- [ ] **Step 3: Replace obsolete roadmap authority references**

Update maintained entry points and prompts so:

- engineering rules point to `AGENTS.md`;
- testing rules point to `TESTING-PLAN.md`;
- operational/provider truth points to current state and quality evidence;
- product promise points to product strategy/capabilities;
- roadmap references describe direction and order only.

`SECURITY.md` must stop relying on the removed “Free tier — la verdad” roadmap
section and link to the current pricing/security owner instead.

- [ ] **Step 4: Remove maintained dependence on ignored `estado-fases`**

Before moving the ignored file, obtain its SHA-256 and confirm its destination
resolves within `docs/local/plans-archive/`. Move it with PowerShell
`Move-Item -LiteralPath`. Recompute the hash at the destination and require an
exact match.

Update maintained versioned references to use the raw roadmap history, deferred
Plan 013 or current roadmap as appropriate. Do not edit completed Plan 009 just
to modernize its historical prose.

- [ ] **Step 5: Search for semantic duplication and stale authority**

Run targeted searches across maintained Markdown, excluding completed plans,
raw history, design-system generated references and `docs/local/`:

```powershell
rg -n "fuente de verdad detallada.*ROADMAP|Estándares de Ingeniería.*ROADMAP|docs/estado-fases\.md|exec-plans/active/011|exec-plans/active/013" -g "*.md" . --glob "!docs/exec-plans/completed/**" --glob "!docs/design-system/**" --glob "!docs/local/**"
rg -n "016.*014.*012|012.*014.*016|Plan 011 owns|Current closure map" ROADMAP.md docs/index.md docs/current-state.md docs/architecture docs/modules docs/quality -g "*.md"
```

Expected: the first search returns no obsolete maintained dependency; each hit
from the second search either links to the canonical roadmap or states evidence
without defining another order.

- [ ] **Step 6: Validate authority cleanup**

Run:

```powershell
pnpm docs:check
pnpm test:docs-check
pnpm exec prettier --check README.md SECURITY.md docs/index.md docs/current-state.md docs/architecture/system-overview.md docs/architecture/product-strategy.md docs/modules/README.md docs/modules/gdpr.md docs/prompts/codex-follow-up-operations.md docs/prompts/codex-remediation-orchestrator.md docs/quality/testing-strategy.md
git diff --check
```

Expected: all checks pass. `git status --short` must not show the ignored local
manifest or archived `estado-fases` file.

- [ ] **Step 7: Commit the authority cleanup**

Stage only the named versioned documentation changes. Verify no local/private
path is staged, then commit:

```powershell
git commit -m "docs: align authority with the MVP freeze"
```

---

### Task 5: Audit the final tree and complete the maintenance plan

**Files:**

- Modify: `docs/exec-plans/README.md`
- Move:
  `docs/exec-plans/active/documentation-freeze-reorganization.md` to
  `docs/exec-plans/completed/documentation-freeze-reorganization.md`
- Modify only if validation finds an actual defect: affected documentation
  from Tasks 2–4.

**Interfaces:**

- Consumes: Task 1 inventories and hash; Task 2 archive; Task 3 move map; Task
  4 authority cleanup.
- Produces: audited final documentation tree, completed maintenance record and
  fresh validation evidence.

- [ ] **Step 1: Compare initial and final inventories**

Generate a final local-only inventory beside the Task 1 files. Account for each
versioned path as unchanged, created or moved. Account for ignored paths without
publishing their contents or private names. Investigate any missing file before
continuing.

Expected differences are limited to:

- new history/index documentation;
- new execution-plan lifecycle indexes;
- the exact Plan 011 and Plan 013 moves;
- the local `estado-fases` move;
- maintained link/authority edits;
- this plan's eventual move to completed.

- [ ] **Step 2: Recheck archive integrity**

Compare the SHA-256 of
`docs/history/roadmaps/roadmap-pre-freeze-2026-10-05.raw.md.txt` with the Task 1
`roadmap.sha256` value.

Expected: exact match.

- [ ] **Step 3: Run the complete stale-reference audit**

Search maintained Markdown for:

- `exec-plans/active/011`;
- `exec-plans/active/013`;
- `docs/estado-fases.md`;
- the removed roadmap section anchors;
- wording that makes the roadmap operational truth;
- any execution order different from the approved sequence.

Exclude raw snapshots and completed historical evidence only when the hit is
intentionally historical. Record each exclusion in the execution ledger.

- [ ] **Step 4: Verify the six reader questions manually**

Starting only from `docs/index.md`, locate and record the document that answers:

1. what Iroko is today;
2. what may change during the freeze;
3. what happens next and in what order;
4. what is deferred;
5. who owns evidence for a claim;
6. where completed and superseded history lives.

Expected: one unambiguous owner per answer, with no need to reconcile two task
orders.

- [ ] **Step 5: Run final automated validation before closure**

Run fresh:

```powershell
pnpm docs:check
pnpm test:docs-check
pnpm exec prettier --check ROADMAP.md README.md SECURITY.md docs/**/*.md
git diff --check
git status --short --branch
$baselineCommit = Get-Content docs/local/plans-archive/documentation-freeze-preflight/baseline-commit.txt
git diff --summary "$baselineCommit..HEAD"
```

If the broad glob is not expanded by the current Windows shell, build the
versioned/untracked Markdown list with Git and pass the paths to Prettier
without shell string interpolation. Expected: all maintained Markdown passes;
no unexplained deletion or untracked current document remains.

- [ ] **Step 6: Review the implementation against every spec criterion**

Read the spec's Acceptance criteria line by line and point each item to a path,
move record, hash comparison or command result. Fix Critical/Important gaps
before closure; record any non-blocking limitation explicitly.

- [ ] **Step 7: Mark the maintenance work complete**

Update `docs/exec-plans/README.md` so its active set contains only Plans 012,
014, 015 and 016. Move this plan to completed. Do not rewrite its unchecked
steps as historical claims; add a short completion record with date, commits
and exact validation commands/results.

- [ ] **Step 8: Commit the completed documentation reorganization**

Stage the execution-plan README, this recorded move and any verified final
fixes. Inspect the staged list, then commit:

```powershell
git commit -m "docs: complete freeze documentation reorganization"
```

- [ ] **Step 9: Verify the committed result**

After the commit, rerun:

```powershell
pnpm docs:check
pnpm test:docs-check
git diff --check
git status --short --branch
```

Expected: checks pass; the branch contains no untracked maintained document or
unexplained modification; local manifests and local history remain ignored.
Report exact outputs and anything not verified.

---

## Completion record — 2026-10-05

This maintenance plan reorganized documentation only. It added no application,
database, provider, vertical or commercial capability.

### Commits

| Commit         | Record                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `92f37b0`      | Approved documentation-freeze structure                                                             |
| `fc1def7`      | Executable reorganization plan                                                                      |
| `cb2fda2`      | Reusable-foundation documentation baseline                                                          |
| `823de6b`      | Exact roadmap archive and freeze roadmap                                                            |
| `d01d2b3`      | Active/deferred/completed plan lifecycle                                                            |
| `8139b34`      | Authority and navigation cleanup                                                                    |
| Closure commit | The commit that moves this record to `completed/`; its hash is intentionally not embedded in itself |

### Fresh pre-closure validation

- `pnpm docs:check` — passed, 102 Markdown files.
- `pnpm test:docs-check` — passed, 4 tests and 0 failures.
- `pnpm exec prettier --check <all 102 versioned/untracked Markdown files>` —
  passed. The first sandboxed invocation failed with `EPERM` while reading the
  installed Prettier binary; the identical command passed outside the sandbox.
- `git diff --check` — passed.
- Raw roadmap SHA-256 —
  `2dd156cd17c5e4c4752acf46f7764d2fc105e0b8f014b4668cea23322ef8291f`,
  identical to the Task 1 value.
- Live stale-reference audit — zero obsolete maintained dependencies after
  excluding the approved migration design, this execution record, raw history
  and completed historical evidence.

Post-commit documentation checks remain required by Step 9. Runtime, Cloud and
provider health were outside this documentation-only plan and remain governed
by their dated evidence records.
