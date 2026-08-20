# ADR 0001: Documentation Authority and Shared Agent Contract

- Status: Accepted
- Date: 2026-08-20
- Decider: Repository owner

## Context

The repository accumulated useful audits, roadmaps, execution plans, local
notes, and tool-specific instructions. Several sources now disagree about the
active phase, billing providers, architecture coverage, and completion status.
`AGENTS.md` and `CLAUDE.md` were previously kept local, which protected personal
preferences but prevented a fresh human or coding agent from receiving the
same project contract after cloning the repository.

The project needs one durable orientation path without turning a single file
into a large, frequently stale manual.

## Decision drivers

- A fresh human or agent must find current work and operating rules quickly.
- Evidence and current state must be distinguishable from aspiration and
  history.
- Shared project policy must be independent of a particular LLM vendor.
- Personal permissions, hooks, preferences, and machine details must remain
  local.
- The structure must scale without duplicating task checklists.

## Options considered

1. **One comprehensive project manual.** Easy to discover, but likely to grow
   stale and duplicate plans, runbooks, and architecture documents.
2. **Only tool-specific local instructions.** Flexible per developer, but not
   reproducible and unable to establish a shared working contract.
3. **Shared core with thin adapters and linked sources.** Version a neutral
   contract, a current-state page, modular rules, and durable decision records;
   keep machine-specific material local.

## Decision

Adopt option 3:

- `AGENTS.md` is the versioned, tool-neutral operating contract for humans and
  coding agents.
- `CLAUDE.md` is a thin Claude Code adapter that imports `AGENTS.md`; it does
  not duplicate repository policy.
- `docs/current-state.md` is the operational status entry point.
- `docs/architecture/` explains durable system boundaries.
- `docs/exec-plans/active/` owns bounded pending work and acceptance criteria.
- `docs/adr/` preserves significant decisions and their trade-offs.
- Tool-specific rules, agents, hooks, settings, permissions, and skills remain
  local and are not project authority.

When sources conflict, use this authority order:

1. executable code;
2. tests and observed validation evidence;
3. configuration and database migrations;
4. `docs/current-state.md`;
5. accepted ADRs and current architecture documents;
6. active execution plans;
7. `ROADMAP.md` and product direction;
8. audits, completed plans, and ignored/local notes as historical evidence.

Higher authority does not turn code into proof of production health. Runtime or
cloud claims still require fresh evidence and must otherwise be marked
`[NO VERIFICADO]`.

## Consequences

### Positive

- Every clone receives the same minimum project contract.
- Current status, implementation work, architecture, and historical evidence
  have explicit owners.
- Tool adapters remain small and are less likely to contradict each other.
- Local secrets, permissions, and machine behavior stay outside version control.

### Negative

- Changes to active priorities require updating `docs/current-state.md` in the
  same pull request.
- Tool-specific local instructions can differ between machines and require
  their owners to maintain them.
- Existing local agents, hooks, rules, skills, and stale documents are not
  corrected automatically by this decision.

### Risks and mitigations

- **Risk:** another status file becomes authoritative by habit. **Mitigation:**
  link this hierarchy from `docs/index.md` and keep historical/local files
  explicitly non-authoritative.
- **Risk:** tool-specific rules override the shared contract. **Mitigation:**
  keep adapters thin and treat `AGENTS.md` as the shared baseline.
- **Risk:** documentation claims exceed evidence. **Mitigation:** require exact
  validation evidence or the `[NO VERIFICADO]` label.

## Superseded policy

This decision supersedes the earlier repository policy that kept both
`AGENTS.md` and `CLAUDE.md` ignored. It does not authorize versioning
credentials, machine preferences, or other local tooling.

## Related documents

- [Current state](../current-state.md)
- [System overview](../architecture/system-overview.md)
- [Documentation index](../index.md)
- [Definition of Done](../quality/definition-of-done.md)
