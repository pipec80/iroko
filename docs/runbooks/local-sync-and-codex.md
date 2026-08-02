# Runbook — Synchronize the Documentation Branch and Start Codex

This runbook assumes the local repository is at:

```text
C:\_PROYECTOS_DOCKERS\saasboilerplate
```

Adjust the path if the clone is elsewhere.

## 1. Protect current local work

Open PowerShell in the repository:

```powershell
Set-Location C:\_PROYECTOS_DOCKERS\saasboilerplate
git status --short --branch
```

If the working tree has changes, do not switch branches until they are committed to an appropriate branch or stashed deliberately:

```powershell
git diff
git diff --cached
```

Preferred: create a local branch and commit meaningful work. Use `git stash -u` only when you understand that it also stores untracked files.

## 2. Fetch the remote documentation branch

```powershell
git fetch --prune origin
git branch --remotes | Select-String 'docs/iroko-stabilization'
```

Create a local tracking branch:

```powershell
git switch --track origin/docs/iroko-stabilization
```

If it already exists locally:

```powershell
git switch docs/iroko-stabilization
git pull --ff-only
```

Confirm:

```powershell
git status --short --branch
git log -5 --oneline
```

## 3. Verify ignored local documentation

The branch versions public documentation while keeping local/private material ignored.

Check the rules:

```powershell
git check-ignore -v docs\local\example.md
git check-ignore -v docs\private\example.md
git check-ignore -v docs\index.md
```

Expected:

- `docs/local/example.md` and `docs/private/example.md` are ignored;
- `docs/index.md` is not ignored and is tracked.

Create local-only notes safely if needed:

```powershell
New-Item -ItemType Directory -Force docs\local | Out-Null
@'
# Local notes

Do not commit credentials or personal data.
'@ | Set-Content docs\local\notes.local.md
```

Verify Git does not show it:

```powershell
git status --short
```

## 4. Review the documentation before merging

Read:

```powershell
Get-Content AGENTS.md
Get-Content docs\index.md
Get-Content docs\audits\2026-08-02-full-platform-audit.md
Get-ChildItem docs\exec-plans\active
```

Review the Git diff against `main`:

```powershell
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
git diff origin/main...HEAD -- .gitignore AGENTS.md docs
```

The branch is documentation-only except for the selective `.gitignore` change.

## 5. Merge strategy

Review and merge through the GitHub pull request. Do not merge locally before CI/review unless there is an intentional emergency process.

After the PR is merged:

```powershell
git switch main
git pull --ff-only origin main
```

Your ignored `docs/local/` files remain on disk when switching branches because Git does not manage them. Still keep a private backup of valuable local-only notes.

## 6. Start Codex from the repository root

Confirm the clean branch to be inspected:

```powershell
git status --short --branch
```

Start Codex using the installed client, then paste the contents of:

```text
docs/prompts/codex-remediation-orchestrator.md
```

The first Codex run must be reconnaissance only. It should finish by recommending one plan and asking permission, without editing files.

## 7. Begin an approved remediation

After Codex reports the reconnaissance and the selected plan is approved:

```powershell
git switch main
git pull --ff-only origin main
git switch -c fix/<bounded-plan-name>
```

Then give Codex a task based on:

```text
docs/prompts/codex-task-template.md
```

Use one branch and one pull request per bounded problem.

Recommended order:

```text
001 migration drift
002 Cloud email worker
003 Sentry observability
004 Next.js alignment
005 quality hardening workstreams
006 PostHog
```

## 8. Local validation before push

Codex must discover actual scripts from `package.json`. Typical checks:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```

Add Supabase local/pgTAP/type generation and Playwright checks when relevant.

Review changes manually:

```powershell
git status --short
git diff --check
git diff
```

Search for accidental secrets using the repository security tooling before committing.

## 9. Commit and push

```powershell
git add <explicit-files>
git diff --cached --check
git diff --cached
git commit -m "fix(scope): concise description"
git push -u origin HEAD
```

Avoid `git add .` for security-sensitive or migration work. Stage explicit files.

## 10. Stop conditions

Stop Codex and request human review if it proposes:

- a production migration/deployment;
- a secret creation or rotation;
- reconstructing unknown migration SQL;
- `db push --linked` while drift remains;
- deleting production data or indexes;
- merging directly to `main`;
- starting PostHog before P0 completion;
- committing anything under `docs/local/` or `docs/private/`.
