# 017 P1 — independent directed review

## Root implementation — 017.4-T1/T2 and 017.1-T1

Reviewer: billing implementer, distinct from the root implementer. Candidate: dirty working tree based on `a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`; no commit/PR was created. Review date 2026-10-21. The requested review focus in 017.4 and the current-password requirements in 017.1 were read before inspection. This is a directed review of draft lifecycle/navigation, identity transitions, CAS/RLS and password payload/evidence, not a complete re-audit of every P1 surface.

### Findings and required actions

| ID        | Severity     | Finding and consequence                                                                                                                                                                                                                                                                                                                       | Required correction / current disposition                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-ROOT-01 | P1           | `DocumentDraftProvider` effect cleanup called `registry.clear()`, incrementing the generation during **root React StrictMode effect replay**. The mounted hook retained the earlier generation; `setContent` and `flush` then rejected legitimate edits. The initial nested `<StrictMode>` test did not actually exercise root effect replay. | Independently reproduced: configure RTL root `reactStrictMode:true`; 4/5 hook tests failed, including expected `edited` vs empty content. Temporary diagnostic files were removed. Root changed the persisted test to `{wrapper, reactStrictMode:true}` and removed `clear` from the listener effect cleanup, retaining keyed lifetime and explicit identity clear. Root reports its own RED reproduction; post-fix verification must be appended below. |
| R-ROOT-02 | P1           | Identity transition had an edit-loss window: `confirmTransition()` completed flush A, then awaited `signOut`, account switch or impersonation while the textarea still accepted edit B. Successful clear/key remount could discard B without saving it or allowing cancellation.                                                              | Root confirmed the lifecycle issue and is implementing an identity-transition lock before flush/operation, rejecting/disabling edits while pending, releasing it on failed/cancelled transitions and retaining it until confirmed clear/remount. Deferred-operation regression and fresh checks required before closing this finding.                                                                                                                    |
| R-ROOT-03 | Evidence gap | The editor browser fixture creates a second document but inspected tests did not exercise old save A pending → navigate/open document B → resolve A. The hook/component suite likewise lacked that exact stale-completion/unmount control at review time.                                                                                     | Root was asked to add a deferred/keyed component and/or browser control showing B remains unchanged and A's draft is preserved safely. Do not infer this executed scenario from the correct static `userId:accountId:docId` React key.                                                                                                                                                                                                                   |

### Positive checks from source inspection

- Draft edits are entered into the per-provider Map immediately, ahead of the 800 ms autosave. Own project navigation awaits the serialized `flush`; failed saves preserve content/error state. A save snapshot removes a registry entry only if its content still matches; newer edits are not removed by an older result.
- The dashboard provider is mounted outside route/page transitions and keyed by verified server user/account/impersonator identity. Editor instances are additionally keyed by user/account/document. Registry storage is component-instance memory; no browser durable storage or auxiliary server persistence was introduced. The explicit memory-only notice correctly warns about forced reload/close.
- CAS uses a single invoker UPDATE with expected revision and live-document predicates. The BEFORE UPDATE trigger derives the new revision from OLD on every write, so generic updates also fence stale snapshots and forged incoming revisions are ignored. The action returns `conflict_or_unavailable` for zero rows, without returning hidden content; normal errors remain `save_failed`. Function grants exclude PUBLIC/anon and preserve authenticated RLS rather than using definer authorization.
- SQL `0174_document_revision.test.sql` contains controls for a stale second snapshot, generic external update, ignored client revision, readable viewer denied write, foreign actor denied live write, deleted/missing rows, invoker mode and ACL. Those source assertions are distinct from executed SQL evidence.
- Password settings send exact `{password,current_password}` to the installed Auth SDK, validate input and authenticated actor first, and log only the error code/user/action. No password payload is logged. The local Auth precondition is documented separately from recent-session reauthentication, without claiming Cloud configuration. The E2E source verifies a wrong current password leaves old/new login behavior unchanged, then verifies the correct positive change through an independent request context; trace/video/screenshot are disabled and shared fixture finally-cleanup is used.

### Evidence executed by this reviewer

1. `node node_modules/vitest/vitest.mjs run src/hooks/__tests__/use-document-draft.test.tsx src/components/providers/__tests__/document-draft-provider.test.tsx src/components/dashboard/projects/__tests__/markdown-editor.test.tsx --pool=threads --maxWorkers=1`: **3 files / 14 tests passed**, exit 0, on the pre-review-fix sources. This pass did not detect root StrictMode replay because the original test nested its StrictMode boundary inside the wrapper.
2. Temporary diagnostic config extended `vitest.config.ts` with a setup calling `configure({reactStrictMode:true})`, then ran `node node_modules/vitest/vitest.mjs run src/hooks/__tests__/use-document-draft.test.tsx --config .tmp-review-root-strict.config.ts --pool=threads --maxWorkers=1`: **4 failed / 1 passed**, exit 1. The actual edit, latest-draft, failed-flush and serialization assertions failed under real root replay. Both temporary config/setup files were deleted in finally; no product implementation was edited by the reviewer.

SQL/CAS and browser/Auth execution are being performed by their responsible agents. Counts from their messages or reports are collaborator evidence, not a fresh rerun by this reviewer. Browser editor acceptance (including two independent sessions, reload warning behavior, failed navigation, identity transition and pending old save) and real current-password policy acceptance remain **[NO VERIFICADO]** in this review until exact execution evidence is linked. Cloud/linked migration/provider acceptance remain **[NO VERIFICADO]** and outside this local authorization.

### Interim verdict

**Changes required** for R-ROOT-01/R-ROOT-02 until the corrected tree and fresh regression results are re-reviewed. R-ROOT-03 also requires an explicit evidence disposition. Confidence is high in the independently reproduced StrictMode defect and the reviewed CAS/password mappings; no blanket P1 completion or final 016 acceptance is implied.

## Directed follow-up review — 2026-10-21

Reviewer: `closing_review`, independent of the root editor implementer and the Auth/privacy implementer. Reviewed the current dirty worktree based on the same `a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`, using Superpowers requesting-code-review and verification-before-completion. This section supersedes the interim required-change verdict only for the findings and sources explicitly inspected below; it preserves the earlier reproduction evidence.

### Disposition of required changes

| ID        | Directed verdict                              | Evidence and limits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-ROOT-01 | Corrected; no remaining required change found | `DocumentDraftProvider` listener-effect cleanup now removes only its listener. Keyed provider lifetime and explicit identity clear own draft invalidation. The persisted hook regression uses RTL `reactStrictMode:true`, exercising root effect replay rather than a nested boundary. The reviewer reran it with the hook/provider/editor suite on the corrected tree, GREEN.                                                                                                                                                                                                                                                      |
| R-ROOT-02 | Corrected; no remaining required change found | `confirmTransition` sets the registry lock synchronously before awaiting flush or the identity operation; a second transition is rejected. `setContent` checks the live lock and the textarea consumes its subscribed snapshot. A failed flush releases the lock; inspected logout, org switch, team creation and impersonation entry/exit paths cancel on returned or thrown failure. Next redirect control flow retains the lock until remount. The hook regression verifies a post-flush edit is rejected while locked and accepted after cancellation. This is source/unit evidence; browser acceptance is recorded separately. |
| R-ROOT-03 | Component evidence gap addressed              | The keyed editor regression starts an A save, mounts B before resolving A, then verifies B content/status, one save and no navigation. Hook cleanup marks A inactive, so its completion returns before mutating the registry or hook confirmation state; the retained A entry is consistent with the separate provider restoration regression. The new test does not itself assert A restoration after that exact pending-save sequence. No required product correction was found; do not label this component test as an executed two-browser scenario.                                                                            |

### Fresh verification by this reviewer

`node node_modules/vitest/vitest.mjs run src/hooks/__tests__/use-document-draft.test.tsx src/components/providers/__tests__/document-draft-provider.test.tsx src/components/dashboard/projects/__tests__/markdown-editor.test.tsx --pool=threads --maxWorkers=1` — **3 files / 16 tests passed**, exit 0. The initial sandbox attempt failed to read the already installed Vitest with EPERM before executing tests; the authorized local retry completed. No dependency installation, product edit, commit, PR or provider action was performed by this reviewer.

### Auth/privacy and identity source cross-check

- Current-password contract and local-policy precondition retain the dispositions above; this reviewer did not rerun browser/GoTrue acceptance.
- Analytics sanitization drops query/fragment/origin/credentials, normalizes project/UUID path segments, sanitizes initial/session-entry URL copies and plain `$set`/`$set_once` objects, and removes SDK campaign/referrer/search attribution copies. Same-person account changes update group without duplicate identify; different users reset before identify. Consent import races and consent persistence retry belong to deferred 017.1-T5 and are not added to this P1 review.
- Query state is partitioned by verified user/account/impersonator; the boundary hides the stale server subtree while claims and server identity disagree and refreshes the server tree. Scoped consumers disable queries without claims and key their invalidations consistently. Notifications gate visible items by owner and reject retired-channel callbacks. The identity-keyed subtree remount also removes MFA/reveal local state across an actual identity transition. Source inspection found no new required P1 correction in these inspected paths; this is not fresh browser or SQL authorization evidence.

**Directed verdict:** no outstanding critical/required source changes found in this follow-up scope; R-ROOT-01/02 fixes and the R-ROOT-03 component evidence are accepted. Confidence: high for the reproduced root StrictMode regression and lock mechanics, moderate for wider Auth/identity behavior because this reviewer performed static inspection rather than its browser scenarios. Overall P1 acceptance remains conditional on the coordinator's fresh SQL/browser/general checks and cleanup evidence. Browser/Auth, full-suite/build and Cloud results are **[NO VERIFICADO]** by this reviewer; separate agents' exact results must be linked before any broader closure claim. Completing P1 does not close 017 or replace integrated 016 validation.

## Isolated browser runner review — resumed 2026-10-21

Independent reviewer `runner_review` inspected the current 0124/017 runner and
guard changes statically, without running heavy checks or editing implementation.
One important finding was assigned for correction: the development branch must
check `PLAN0124_EGRESS_LOG` after `runE2e` returns, because its internal check
precedes server teardown. A blocked attempt during teardown must also reject
acceptance. Corrected by `finish_browser` through `completeIsolatedDevelopment`, which awaits the run and rejects a post-teardown guard log. Regression `development acceptance rejects guard events written during server teardown`: RED (missing helper), then GREEN in the 9/9 runner tests. This closes the source finding; it does not establish browser acceptance.

No other required change was found in the inspected synthetic Next metadata and
Vercel responses, exact Rollup probe, preserved child preload/environment or
per-file scenario acceptance. Synthetic responses authorize no remote egress.
A selected subset is evidence only for that subset, never all 19 scenarios.
This is source review, not browser/build acceptance; those remain
**[NO VERIFICADO]** until their exact execution is recorded.

## Selected-account follow-up — 2026-10-22

Independent reviewer `selected_account_review` found that the sidebar's fallback
label also marked its first row selected when `activeAccountId` was null or
unknown. The new no-op would then prevent recovering the account context.
Root reproduced both cases: **2 failed / 2 passed** in the sidebar suite.
The consumer now derives `isSelected` from the actual `activeAccountId`, keeping
the fallback label but avoiding a false active-row state. Both null and unknown
contexts can activate the first account; an actually active account still avoids
locking drafts or switching. Combined sidebar/switch suite: **2 files / 9 tests
passed**, exit 0. This closes the required source finding through RED/GREEN;
browser and final general checks remain separate.

## Next development tooling — 2026-10-22

Independent source investigator `npm_post_source` confirmed the installed
Next 16.4.1 default `experimental.agentUpgrade: 'security'` and its advisory
POST to `registry.npmjs.org/-/npm/v1/security/advisories/bulk` in
`dist/lib/upgrade/prepare-upgrade.js`. The observed blocked method/header/body
shape is consistent with this consumer; the earlier log did not contain a
call stack or endpoint path, so it is not a retrospective proof of the caller.

The installed type admits `false`; `assessUpgrade` and `nudgeUpgrade` return
before advisory queries when disabled. Directed static verdict: applying
`experimental.agentUpgrade: false` only in the isolated development snapshot is
accepted. Do not permit the POST or synthesize a clean security audit. The
project's source configuration remains unchanged; runtime acceptance is separate.

## Additional harness surface — 2026-10-22

Independent `harness_final_review` inspected the new bounded environment markers,
synthetic metadata, snapshot upgrade option, budget helpers and fixture cleanup.
One required finding: `writeE2eHarness` guarded only the primary context while
the CAS E2E creates `browser.newContext()` for its second session. All contexts
must receive the same routing/stubs before navigation and share forbidden-request
accounting. A regression must reject acceptance for a remote attempt from context
two. Corrected by `browser_resume`: a shared guard is installed before each new context is returned, with common accounting and method restoration. The mock two-context regression observed RED (missing helper), then GREEN in the 45/45 runner suite; generated TypeScript fixture compilation is included. This closes the source finding, while real CAS browser acceptance remains pending. Chromium DNS
rules alone do not replace this control or cover literal remote IP targets.

The remaining inspected surface received bounded static acceptance. Local markers
do not disable Auth, identity isolation or PostHog sanitation; they disable Sentry
instrumentation/reporting. Budget overrides require explicit local development,
and original 0124 defaults remain. No E2E result is implied by this review.
