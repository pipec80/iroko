@AGENTS.md

# Claude Code adapter

`AGENTS.md` is the shared project contract. This file only defines how Claude
Code discovers the rest of that contract.

- Current verified snapshot: `docs/current-state.md`
- Documentation map: `docs/index.md`
- Task-specific instructions belong in the approved execution plan or an
  explicitly invoked skill, not in this always-loaded file.
- Claude-specific rules, permissions, personal preferences, local service
  details and secrets belong in local or user-level configuration; they are
  not project authority.
