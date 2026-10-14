# Documentation Freeze Structure

- Status: Approved design
- Approved by: Repository owner
- Approval date: 2026-10-05
- Repository baseline: `f82d2fbe381014c80a090ba3c36c99e4778111c3`

## Context

Iroko has accumulated useful product direction, execution plans, audits,
operational evidence, local research, design-system handoffs and historical
working notes. The material records real progress, but the current navigation
mixes active work, deferred ambitions and completed history.

The root `ROADMAP.md` is 664 lines long and combines product direction,
engineering rules, implementation prompts, historical phase checklists,
pricing statements and future ideas. `docs/exec-plans/active/` contains 21
documents even though the approved MVP freeze only executes Plans 012, 014,
015 and 016. Some maintained documents still point to ignored or stale files
or describe the roadmap as a detailed source of truth.

The repository owner has approved a feature freeze: add no new product
capabilities while Iroko repairs, verifies, configures and documents the
foundation it already has. Documentation must make that decision executable
without erasing the history that explains how the current system was built.

## Observed baseline

The design inspection on 2026-10-05 found 422 unique files below `docs/`:

| Class                     | Count | Meaning                                                                                           |
| ------------------------- | ----: | ------------------------------------------------------------------------------------------------- |
| Git tracked               |   241 | Versioned repository documentation and assets                                                     |
| Untracked and not ignored |     8 | Current documentation work that must be preserved and classified                                  |
| Ignored                   |   173 | Local history, private material, screenshots, generated previews and other machine-local evidence |

Counts describe the inspected worktree and are not permanent targets. The
implementation starts by refreshing the inventory because files can change
between design approval and execution.

The ignored set includes `docs/local/`, `docs/private/`,
`docs/estado-fases.md`, screenshots and generated design references. Git does
not protect ignored files. The implementation must inventory them locally
before any move and must not expose their contents or filenames in versioned
documentation when doing so could reveal private material.

The current worktree also contains modified and untracked documentation. An
isolated worktree created directly from `HEAD` would omit those changes.
Execution must therefore either preserve them in an explicit checkpoint first
or continue in the current workspace. It must never assume a clean `HEAD`
contains the approved documentation baseline.

## Objective

Create one clear documentation path from project identity to current evidence,
freeze order, bounded work and historical context:

1. a reader enters through `docs/index.md`;
2. `docs/current-state.md` explains what is implemented and verified;
3. `ROADMAP.md` explains the freeze objective, exact execution order and exit
   gates;
4. `docs/capabilities.md` describes the declared SaaS foundation;
5. active execution plans contain only current freeze work;
6. deferred work remains discoverable without appearing authorized or active;
7. completed plans and archived roadmaps preserve historical decisions and
   evidence;
8. every maintained relative link resolves after the reorganization.

Success means a new maintainer can answer these questions without reconciling
contradictory tables:

- What is Iroko today?
- What may be changed during the freeze?
- What must be done next, and in what order?
- What is explicitly deferred?
- Which document owns evidence for a claim?
- Where is the history of completed or superseded work?

## Authority invariants

ADR 0001 and `AGENTS.md` already define the correct authority hierarchy. This
reorganization implements that decision and does not supersede it:

1. executable code;
2. tests and observed validation evidence;
3. configuration and migrations;
4. `docs/current-state.md`;
5. accepted ADRs and current architecture;
6. active execution plans;
7. `ROADMAP.md`;
8. audits, completed plans and local history.

The new roadmap remains below current state. It owns direction and sequence,
not runtime truth. No new ADR is needed unless a later change alters this
hierarchy or makes another document authoritative.

The following ownership rules prevent duplication:

| Document                           | Owns                                                         | Must not own                                                   |
| ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `docs/index.md`                    | Navigation, read order and lifecycle links                   | A second detailed work queue                                   |
| `docs/current-state.md`            | Verified status, evidence dates and known operational gaps   | Product aspirations or historical checklists                   |
| `ROADMAP.md`                       | Freeze scope, ordered work, exit gates and deferred boundary | Engineering rules, provider evidence or implementation prompts |
| `docs/capabilities.md`             | Declared foundation inventory and evidence boundary          | Execution order                                                |
| `docs/architecture/`               | Durable boundaries and rationale                             | Mutable task status                                            |
| `docs/exec-plans/`                 | Acceptance criteria for bounded work                         | Product-wide strategy                                          |
| `docs/quality/` and `docs/audits/` | Dated evidence and investigation                             | Authorization to implement                                     |
| `docs/history/`                    | Superseded versioned material                                | Current status or instructions                                 |
| `docs/local/`                      | Ignored working history and private local references         | Repository authority                                           |

## Target structure

```text
ROADMAP.md
docs/
├── index.md
├── current-state.md
├── capabilities.md
├── architecture/
├── adr/
├── audits/
├── exec-plans/
│   ├── README.md
│   ├── active/
│   ├── deferred/
│   │   └── 011-billing/
│   └── completed/
├── history/
│   ├── README.md
│   └── roadmaps/
├── modules/
├── quality/
├── runbooks/
├── prompts/
└── design-system/
```

The design-system tree stays under the authority and classification already
accepted in ADR 0002. Private, generated and screenshot material retains its
existing ignore policy.

## Freeze roadmap contract

The new root `ROADMAP.md` is concise and contains only:

1. Iroko's internal-first reusable SaaS objective;
2. the feature-freeze rule;
3. allowed work: repair, verification, coherent configuration,
   documentation and removal of misleading surface area;
4. prohibited scope: new providers, verticals, commercial modules and
   catalogue expansion;
5. the exact ordered queue;
6. MVP exit gates;
7. deferred work and its reactivation conditions;
8. links to current state, capabilities, product strategy, active plans and
   preserved history.

The approved execution order is:

```text
Plan 011 freeze scope satisfied; remaining scenarios deferred
→ Plan 016 T0/T1
→ Plan 014 T1
→ Plan 012.1 Grants
→ Plan 012.3 rate-limiting investigation
→ Plan 012.2 SSRF
→ Plan 012.4 CSP and secrets
→ Plan 012.5 pricing truth
→ Plan 014 T2/T3
→ Plan 016 T2/T3
→ Plan 015
→ solid MVP candidate
```

This ordering is the single roadmap sequence. Other documents may link to it
but must not restate a competing order.

Plan 015 remains last because the owner approved proving independent reuse
after the candidate has passed review, known corrections and consolidated
validation. A later finding can route back to the owning plan without silently
reordering the roadmap.

## Plan classification

`docs/exec-plans/README.md` defines lifecycle semantics and points to the
roadmap for order. It does not duplicate current-state evidence.

### Active

Only bounded work in the approved freeze queue remains under
`docs/exec-plans/active/`:

- Plan 012 — security hardening and pricing truth;
- Plan 014 — reference-surface correctness;
- Plan 015 — reusable-foundation acceptance;
- Plan 016 — Next.js and Supabase code review.

### Deferred

Deferred work is preserved and discoverable but is neither authorized by its
location nor part of the freeze queue:

- the complete Plan 011 family, grouped below
  `docs/exec-plans/deferred/011-billing/`;
- Plan 013 commercial preparation;
- Stripe, Paddle and Lemon Squeezy certifications;
- remaining Mercado Pago scenarios that depend on provider timing, productive
  credentials or later operational drills;
- other explicitly post-freeze product work already recorded in maintained
  documents.

The Plan 011 index must state precisely:

> The scope required by the current freeze is satisfied. Implemented and
> verified evidence remains valid only for its recorded scenario and date.
> Remaining provider and operational scenarios are deferred; they are not
> erased, completed or implied by the freeze decision.

Moving Plan 011 does not rewrite its completed checklists or acceptance
evidence. Relative paths are updated only as needed to keep maintained links
valid.

### Completed

Plans 001–010 stay under `docs/exec-plans/completed/`. Future plans enter this
directory only after their own Definition of Done and exact acceptance
evidence are satisfied. Directory movement alone never changes a plan's
status.

### Conditional reactivation

Deferred work returns to active only through an explicit product decision and
an updated roadmap/current-state entry. Examples include choosing to sell the
boilerplate, certifying another provider or acquiring the external conditions
needed for a deferred Mercado Pago drill.

## Historical preservation

### Root roadmap

Before replacing `ROADMAP.md`, implementation records its byte length and
SHA-256 hash. The exact bytes are then preserved as:

`docs/history/roadmaps/roadmap-pre-freeze-2026-10-05.raw.md.txt`

The `.txt` suffix is intentional. It keeps the snapshot byte-for-byte while
preventing the maintained Markdown link checker from interpreting relative
links using the archive's new directory. `docs/history/README.md` records the
source path, capture date, baseline commit, hash and non-authoritative status.
Git history remains the canonical record of the original Markdown revisions.

No historical content is silently copied into the new roadmap. Still-relevant
rules move by authority:

- engineering conventions link to `AGENTS.md`;
- testing rules link to `TESTING-PLAN.md`;
- product scope links to product strategy and capabilities;
- pricing and provider truth link to current state, Plan 012 and provider
  evidence;
- superseded implementation prompts remain in the raw snapshot.

### Ignored and local material

Before touching ignored documents, implementation writes a local-only manifest
under `docs/local/` with relative paths, sizes and hashes. The manifest remains
ignored and must not print file contents or secrets.

`docs/estado-fases.md` is moved into the local plan archive with a date-bearing
name after its hash is recorded. Maintained versioned documents must stop
depending on it. Other ignored content remains in place unless a specific move
is listed in the implementation plan.

No file under `docs/private/`, no screenshot and no generated design handoff is
made versioned by this work.

## Migration sequence

The implementation plan lives temporarily at
`docs/exec-plans/active/documentation-freeze-reorganization.md`. It has no
product-plan number because it adds no product scope. Its final task moves the
record to `docs/exec-plans/completed/`; therefore the accepted end state still
contains only Plans 012, 014, 015 and 016 as active product plans.

The implementation plan must divide the reorganization into independently
reviewable tasks:

1. **Preflight and recovery point** — capture branch, commit, staged state,
   complete inventory, hashes and all incoming references. Preserve current
   untracked documentation before choosing a worktree strategy.
2. **History foundation** — create the history index and exact roadmap raw
   snapshot; verify its hash before replacing the root file.
3. **Freeze roadmap** — replace the root roadmap with the approved contract and
   links, without migrating old checklists into it.
4. **Plan lifecycle** — create the execution-plan index and deferred tree, then
   move Plan 011 and Plan 013 as recorded moves.
5. **Authority cleanup** — simplify duplicated plan/status sections in the
   index and current state; update architecture, security, modules, prompts and
   quality references.
6. **Local history cleanup** — archive `docs/estado-fases.md` locally and remove
   maintained dependencies on ignored documents.
7. **Repository-wide validation** — compare manifests, search stale paths,
   validate links and formatting, and review every acceptance criterion.

Each task records its move map. A later task updates consumers of interfaces
produced by earlier tasks; it must not rediscover destination names.

## Failure handling and rollback

- No source document is deleted as part of this reorganization.
- A move is complete only after its destination exists, its recorded hash or
  Git similarity is confirmed, and incoming maintained links are updated.
- If a validation step fails, stop the current task and fix the move map or
  references before continuing to another group.
- Ignored files are copied or hashed before any local move because Git cannot
  restore them.
- Existing unrelated worktree changes remain untouched and unstaged.
- If isolation is used, the checkpoint must contain the eight untracked
  documentation files and relevant modified documentation; a worktree created
  from the original `HEAD` is invalid for this task.
- No push, merge, deployment, provider operation or Cloud mutation belongs to
  this work.

## Validation contract

Fresh evidence is required before claiming the reorganization complete:

1. compare the preflight and final manifests and account for every changed path
   as unchanged, created or moved;
2. verify the raw roadmap snapshot SHA-256 matches the pre-replacement hash;
3. run `pnpm docs:check` and read the complete successful output;
4. run `pnpm test:docs-check` and confirm all tests pass;
5. run Prettier check on every changed Markdown file;
6. run `git diff --check`;
7. search for references to old `exec-plans/active/011*`, active Plan 013,
   `docs/estado-fases.md`, obsolete roadmap authority statements and the old
   phase order;
8. inspect `git diff --summary` and `git status --short` to ensure recorded
   moves and unrelated work are distinguishable;
9. review the final documentation against the six reader questions in the
   objective;
10. report anything not verified instead of inferring completion.

The current `scripts/check-docs.mjs` validates relative target existence and
forbidden stale patterns for versioned and untracked Markdown. It does not
validate anchors, orphan discovery or ignored files. The execution plan must
therefore include targeted searches and manual checks for those boundaries;
expanding the checker is optional maintenance and is not required for this
reorganization.

## Acceptance criteria

- `ROADMAP.md` contains the approved freeze order and no historical phase
  implementation prompts.
- The exact previous roadmap bytes are preserved with a matching hash and a
  documented provenance record.
- Only Plans 012, 014, 015 and 016 remain active product plans.
- The Plan 011 family and Plan 013 are available under deferred documentation
  with accurate conditions and without false completion claims.
- Plans 001–010 remain intact as completed evidence.
- `docs/index.md`, `docs/current-state.md`, `ROADMAP.md`,
  `docs/capabilities.md` and `docs/exec-plans/README.md` have distinct stated
  responsibilities.
- Maintained documentation no longer relies on `docs/estado-fases.md` or other
  ignored files for current truth.
- Private, local, generated and screenshot material remains ignored.
- All file movements are accounted for and no source document disappears.
- All validation commands in the contract pass with fresh output.
- No product capability, provider, vertical or commercial module is added.

## Non-goals

- implementing Plans 012, 014, 015 or 016;
- completing deferred Mercado Pago provider scenarios;
- adding Stripe or another payment provider;
- changing application code, database schema or Cloud resources;
- commercial packaging, licensing, landing pages or customer support;
- rewriting historical evidence to match current terminology;
- publishing private or ignored local material;
- redesigning the accepted design-system authority.

## Consequences

The active documentation becomes smaller and easier to operate. Historical
material remains available but cannot accidentally authorize work. Moving the
Plan 011 family requires a broad reference update, and ignored history still
needs an external/private backup because Git cannot protect it. The clearer
lifecycle adds a small maintenance obligation: every plan must be explicitly
active, deferred or completed, and each transition must update the roadmap or
current state that owns its meaning.

## Related documents

- [Documentation authority ADR](../adr/0001-documentation-authority-and-agent-contract.md)
- [Documentation index](../index.md)
- [Current state](../current-state.md)
- [Capability inventory](../capabilities.md)
- [Product strategy](product-strategy.md)
- [Competitive landscape](../audits/2026-10-05-saas-template-competitive-landscape.md)
