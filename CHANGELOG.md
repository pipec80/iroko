# Changelog

All notable changes to Iroko are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

---

## [1.5.0](https://github.com/pipec80/iroko/compare/iroko-v1.4.1...iroko-v1.5.0) (2026-07-18)


### Features

* move webhook secrets to Supabase Vault, add nightly db advisors (3H-3) ([#56](https://github.com/pipec80/iroko/issues/56)) ([659287e](https://github.com/pipec80/iroko/commit/659287efc506202a7c779266235bbd3b8284f2a4))

## [1.4.1](https://github.com/pipec80/iroko/compare/iroko-v1.4.0...iroko-v1.4.1) (2026-07-18)


### Bug Fixes

* add missing SELECT policy for org-assets storage bucket ([#57](https://github.com/pipec80/iroko/issues/57)) ([7dc47fc](https://github.com/pipec80/iroko/commit/7dc47fc1b2345839f678f1ef53bb94ee7f5fd0e4))

## [1.4.0](https://github.com/pipec80/iroko/compare/iroko-v1.3.0...iroko-v1.4.0) (2026-07-18)


### Features

* add organization logo and member presence (3H-2) ([#54](https://github.com/pipec80/iroko/issues/54)) ([f41ca39](https://github.com/pipec80/iroko/commit/f41ca392b494fcf5b9f7989a46924530279ca5f3))

## [1.3.0](https://github.com/pipec80/iroko/compare/iroko-v1.2.2...iroko-v1.3.0) (2026-07-15)


### Features

* enforce plan entitlements in RPCs, delivery worker and org settings UI (3H-1) ([34994a2](https://github.com/pipec80/iroko/commit/34994a20182607dd56d86ee5dbb050e464c28c18))

## [1.2.2](https://github.com/pipec80/iroko/compare/iroko-v1.2.1...iroko-v1.2.2) (2026-07-13)


### Bug Fixes

* tag sentry environment and filter next prerender noise ([#47](https://github.com/pipec80/iroko/issues/47)) ([7cca32f](https://github.com/pipec80/iroko/commit/7cca32f31753e796f81528aa2f993382a4bdfad4))

## [1.2.1](https://github.com/pipec80/iroko/compare/iroko-v1.2.0...iroko-v1.2.1) (2026-07-13)


### Bug Fixes

* cache pg_prove/postgres-meta images and harden CI workflows ([#42](https://github.com/pipec80/iroko/issues/42)) ([f9ba5c1](https://github.com/pipec80/iroko/commit/f9ba5c1e923c800fb355b1283d61e78080c47851))

## [1.2.0](https://github.com/pipec80/iroko/compare/iroko-v1.1.0...iroko-v1.2.0) (2026-07-13)


### Features

* add pgmq + pg_cron + edge function jobs pattern (2F) ([#40](https://github.com/pipec80/iroko/issues/40)) ([5fb2148](https://github.com/pipec80/iroko/commit/5fb21481fc4e6919695575aa69b82291a6bb09c6))

## [1.1.0](https://github.com/pipec80/iroko/compare/iroko-v1.0.0...iroko-v1.1.0) (2026-07-11)


### Features

* add Stripe and MercadoPago payment provider adapters ([#38](https://github.com/pipec80/iroko/issues/38)) ([7175204](https://github.com/pipec80/iroko/commit/71752046ba550592f9a744155418baa291fad168))

## [1.0.0](https://github.com/pipec80/iroko/compare/iroko-v0.1.0...iroko-v1.0.0) (2026-07-10)


### ⚠ BREAKING CHANGES

* **db:** hashear tokens de invitación con SHA-256; invite_members retorna TABLE(email,token)

### Features

* add bio, birth_date, website_url, company columns to profiles ([9a10ada](https://github.com/pipec80/iroko/commit/9a10ada47259b027933c79d38804d65ab70e728e))
* add sentry tunnel route to avoid ad-blockers ([6fbe59f](https://github.com/pipec80/iroko/commit/6fbe59f8a8d6359a6ea78ac2e0aad6a96b22f62f))
* add Sentry wrapper, dashboard action tests, and E2E auth fixture ([de10d07](https://github.com/pipec80/iroko/commit/de10d07fb589cb53f08ee8ee7bb07eb12b9511ec))
* add SVG bar chart to dashboard and complete color palette ([fca6f20](https://github.com/pipec80/iroko/commit/fca6f2060b4d01eb7bdb91fae7cc8073a4a1d65a))
* **analytics:** add vercel analytics and speed insights to root layout ([31e6b17](https://github.com/pipec80/iroko/commit/31e6b17418f8526fed1d1a557b1fac441312688d))
* **billing:** env vars y firma HMAC del mock provider (F2-2A-core) ([3d77592](https://github.com/pipec80/iroko/commit/3d77592c2c556e604b6b7db9320a2f75b28f1330))
* **billing:** eventos subscription en el catalogo de webhooks salientes (F2-2A-core) ([3079ee2](https://github.com/pipec80/iroko/commit/3079ee222ebf8da9c4bde2cfb7d35d6f0d65d630))
* **billing:** mock provider y registry factory de proveedores (F2-2A-core) ([9de3d97](https://github.com/pipec80/iroko/commit/9de3d978f2d80de4047fbdb23e7912dc818a6a66))
* **billing:** plan-gating hasFeature getLimit withinLimit (F2-2A-core) ([c9d8874](https://github.com/pipec80/iroko/commit/c9d8874014660dd874c85d8580964c06b3ec0c31))
* **billing:** server actions de checkout y hosted-page mock (F2-2A-core) ([631cb39](https://github.com/pipec80/iroko/commit/631cb39b86efc8953867350adfff78046f2b2d6d))
* **billing:** tipos del provider y maquina de estados pura (F2-2A-core) ([91f05fd](https://github.com/pipec80/iroko/commit/91f05fd641dbdfc74a1abffee7b6f7eb717299c7))
* **billing:** ui real de planes estado de suscripcion e historial (F2-2A-core) ([ad5d7b9](https://github.com/pipec80/iroko/commit/ad5d7b985d4a2026394d2878fc57d25b50c1d157))
* **billing:** webhook handler y route webhooks provider (F2-2A-core) ([ac7a4fc](https://github.com/pipec80/iroko/commit/ac7a4fcd5d3bbe648ee3a8f7f1000fd3f4e3ecb9))
* brand email templates with IROKO design system ([423ed6b](https://github.com/pipec80/iroko/commit/423ed6bb2f772abcf4fbf11d445e032f94dd9105))
* **ci:** add production/preview environments, use environment secrets in build job ([47139f7](https://github.com/pipec80/iroko/commit/47139f7ec191e64ee21fa9de6c4d906fca91ddcd))
* **db:** activar audit triggers en 6 tablas core ([3c2a277](https://github.com/pipec80/iroko/commit/3c2a27792295b5f5a7f37a40ed9f887811e5ae23))
* **db:** add advanced extensions and fix gen_random_bytes qualification ([6fffccf](https://github.com/pipec80/iroko/commit/6fffccf64c81dc7a07c01f1e6997f1a389f729dd))
* **db:** agregar columna pending_deletion a profiles; eliminar de metadata JSONB ([a05d94a](https://github.com/pipec80/iroko/commit/a05d94a67b0c3cde097e9c5e0bc785bf48a5d9a0))
* **db:** agregar jobs pg_cron de limpieza de notificaciones (30d leídas, 90d todas) ([d29a5b2](https://github.com/pipec80/iroko/commit/d29a5b222a7f8b61770c1fe181b8e11548c9bd10))
* **db:** agregar memberships_history con trigger de captura append-only ([099ec86](https://github.com/pipec80/iroko/commit/099ec868a759cb7f0042f5d3389081675c5ec53c))
* **db:** agregar validación de locale y timezone en profiles via trigger ([34ace7f](https://github.com/pipec80/iroko/commit/34ace7f3be7912c4479abb8e866d6ab1ca39210d))
* **db:** apply_subscription_event idempotente con emision a webhooks (F2-2A-core) ([8fd8130](https://github.com/pipec80/iroko/commit/8fd8130d1ca22f2ff8ddeb194ce74a5667233a35))
* **db:** convertir subscription_items.type de text a ENUM billing.subscription_item_type ([33f906c](https://github.com/pipec80/iroko/commit/33f906c31eeb1ff5c448eb5a0257a3767335f795))
* **db:** hashear tokens de invitación con SHA-256; invite_members retorna TABLE(email,token) ([f60011d](https://github.com/pipec80/iroko/commit/f60011d31b240c965fec968409cbdb4d0c8a454f))
* **db:** rpcs de lectura de billing entitlements overview invoices (F2-2A-core) ([e5ea074](https://github.com/pipec80/iroko/commit/e5ea0740b3150ec253cbf24e063e2be26538fb6d))
* **db:** seed de planes Free/Pro/Scale mensual+anual y unique (slug,interval) (F2-2A-core) ([56be71d](https://github.com/pipec80/iroko/commit/56be71d1cc1ef39115740d17f14b0f598d5ad6c1))
* **db:** trigger que previene eliminar o degradar al último owner de un account ([dd9ba2e](https://github.com/pipec80/iroko/commit/dd9ba2ea3e85d37b5208b71cf72e728023db00c2))
* design system pass — card class, dashboard layout y visual fidelity ([13aac67](https://github.com/pipec80/iroko/commit/13aac67e0784ac0e5787c2cd91a0d78a5b19d272))
* **devops:** ci pipeline, testing, sentry y vercel — hito 2 ([d965a2f](https://github.com/pipec80/iroko/commit/d965a2f0d2e2a94396e3d032532b57fed7edbdf0))
* **email:** add Resend sendEmail helper and typed email functions ([13931ac](https://github.com/pipec80/iroko/commit/13931ac7daf675622b5fb0edfe16ac504c42bea9))
* **email:** add Welcome, Invitation, and Notification React Email templates ([40bfef0](https://github.com/pipec80/iroko/commit/40bfef0ac2a223f8e4f09a3666436ca01494a98b))
* **email:** extend notify() with optional email delivery via emailDelivery flag ([b9b71e2](https://github.com/pipec80/iroko/commit/b9b71e2efdd7a978194ae165bf988ca366b7c435))
* **email:** f2-2b email transaccional con Resend y React Email ([38a2d04](https://github.com/pipec80/iroko/commit/38a2d0407344fd68fdc1d816061929a7672c034b))
* **email:** redesign templates with brand design system and add react-email preview server ([0a9625c](https://github.com/pipec80/iroko/commit/0a9625c8f036f1a5bb9732fc2072495600fd3e07))
* **email:** wire welcome email on signup confirm and invitation emails on team invite ([234df13](https://github.com/pipec80/iroko/commit/234df13bd9bb57fb3629cc0389a90744b5566a52))
* extend profile page with phone selector, bio, birth_date, company, website ([516949d](https://github.com/pipec80/iroko/commit/516949daaae1b6027a3d6a1afac4ce93b0a1ea13))
* F1 — Fundacion limpia + DX ([#25](https://github.com/pipec80/iroko/issues/25)) ([941f453](https://github.com/pipec80/iroko/commit/941f45378fd8a44c0c0e7ac5d5a17649b1bf8c46))
* F2-2D — Webhooks salientes + API keys ([#32](https://github.com/pipec80/iroko/issues/32)) ([803de8e](https://github.com/pipec80/iroko/commit/803de8ee0c2c885c5a6de28858ee68ef9f936bdf))
* **f2-2e:** feature flags — tables, RLS, resolve_flag RPC, isEnabled() helper ([3263989](https://github.com/pipec80/iroko/commit/3263989a7c48a31e3667700be2103be9a9adb962))
* F2-2G — Audit Log Viewer ([#31](https://github.com/pipec80/iroko/issues/31)) ([cf3d182](https://github.com/pipec80/iroko/commit/cf3d18234e47077c084676e40b2853f1945e7616))
* **f2:** merge fase-2 — notifications, email, feature flags, DB audit ([e59185d](https://github.com/pipec80/iroko/commit/e59185d8ef2ef72975d2139d62ba88147be6bf4c))
* Fase 2 — Feature Flags, Notificaciones en tiempo real y Email transaccional ([#26](https://github.com/pipec80/iroko/issues/26)) ([7fcf74b](https://github.com/pipec80/iroko/commit/7fcf74bb241fca183a07b3b64ce4e8da4221f63a))
* **flags:** add feature_flags schema, RLS, and resolve_flag RPC ([333eece](https://github.com/pipec80/iroko/commit/333eecef5bd06702640bf734a4b3d1a156cef54d))
* **flags:** add isEnabled() helper with FlagContext type ([653d2a0](https://github.com/pipec80/iroko/commit/653d2a08ca40b12e5f20201900bcf97a7e8a9a13))
* implement SaaS foundation — Supabase auth, Google OAuth, dashboard ([e54b81e](https://github.com/pipec80/iroko/commit/e54b81e28ab3e2dc527b26ad0ec9fd9b13a6e353))
* iroko phase 1 — tokens, fonts, lucide, favicons ([111eb0f](https://github.com/pipec80/iroko/commit/111eb0f3dd3dd01636a477f9046762b633e560c1))
* iroko phase 2 — marketing site ([a1c1eed](https://github.com/pipec80/iroko/commit/a1c1eed29bc5618c6625bde3c26a05dde25c5e37))
* iroko phase 3 — auth screens ([908b9a4](https://github.com/pipec80/iroko/commit/908b9a47188ae6096e9fa088bc43a89f575bef25))
* iroko phase 4a — dashboard shell ([949c8a2](https://github.com/pipec80/iroko/commit/949c8a2f27d20e3664dd268b60c98f8e453ce372))
* iroko phase 4b — dashboard screens ([5ef55e4](https://github.com/pipec80/iroko/commit/5ef55e42412c707a1303b75819a7715d8441d79b))
* iroko phase 5 — shadcn re-skin ([fae2cfe](https://github.com/pipec80/iroko/commit/fae2cfe5158df953154004a09ebd1818f408bdf7))
* iroko phase 6 — copy + i18n ([48f64c2](https://github.com/pipec80/iroko/commit/48f64c27e66a73f4ad0b3d905c55e932ad2efd46))
* **iroko:** add robot config upload, data viewer, and fix tests ([1bb8344](https://github.com/pipec80/iroko/commit/1bb8344c7ed999b5bac8c03c3a6c0ea8ab911c89))
* **logger:** add logClient for Client Components — dev console + prod Sentry ([2f939ae](https://github.com/pipec80/iroko/commit/2f939ae460c6fe5f725d42f459581af41c7e1ef0))
* **notifications:** add NotificationBell UI and wire into topbar ([d8d0cad](https://github.com/pipec80/iroko/commit/d8d0cad6ffa45d89cb8459f43047b4ca65c9e465))
* **notifications:** add notifications table, RLS, realtime trigger, mark_read RPC ([0416713](https://github.com/pipec80/iroko/commit/0416713efcc2651b027520c8c5411ac447330df9))
* **notifications:** add server-side notify() helper with unit tests ([11b6709](https://github.com/pipec80/iroko/commit/11b6709a55cc0df9211f3dc163b32a1219152495))
* **notifications:** add useNotifications hook and i18n keys ([e7ebfa9](https://github.com/pipec80/iroko/commit/e7ebfa9c1fb1fd75d0c8890a2ee937d898bfb545))
* phase 0 — SaaS foundation structure ([b28b11e](https://github.com/pipec80/iroko/commit/b28b11e6322182b52ca6ce4f039f1033e38052fd))
* phase 7 — projects table, queries and dashboard page ([eca41e6](https://github.com/pipec80/iroko/commit/eca41e6e454f898625cfa3ad05c5563c3cc45c82))
* theme/language switchers, dark mode header, keyboard shortcuts, exceljs migration ([a61b441](https://github.com/pipec80/iroko/commit/a61b441fd8daf3acd471296b6d6707c3c74197b6))
* **topbar:** mostrar avatar foto si existe, iniciales como fallback ([55ba5fd](https://github.com/pipec80/iroko/commit/55ba5fd610d8b52765c55df17c006dbe6379e12a))
* **ux:** loading skeletons, a11y, rpc fix, zod validation — hito 4 ([50b6bd0](https://github.com/pipec80/iroko/commit/50b6bd08fc21e6249bd418b585aedd598aefd78a))


### Bug Fixes

* a11y & UX audit — touch targets, focus-visible, phantom classes, ARIA ([8d8c9f2](https://github.com/pipec80/iroko/commit/8d8c9f290a255e13b1a0abbf11aceeeff18b5903))
* add explicit vitest include glob to avoid bracket interpretation on Windows ([6105430](https://github.com/pipec80/iroko/commit/6105430522ffd1c34320d7fc5b1f03926d8144ee))
* add MOCK_BILLING_SECRET placeholder to CI e2e and build jobs ([1a0bfa7](https://github.com/pipec80/iroko/commit/1a0bfa7f874051f89bf2a3e353ab0fdeaefabf8f))
* add retry logic to supabase start steps (Docker networking flakiness) ([090ac02](https://github.com/pipec80/iroko/commit/090ac0235fbe1358402e1aacdd9bd68a4f10a608))
* add SKIP_ENV_VALIDATION to codeql build step ([8726a53](https://github.com/pipec80/iroko/commit/8726a53b84bae6fb6144d05dc105e2a3aedba32b))
* add unsafe-inline to production script-src for RSC compatibility ([f3eaffa](https://github.com/pipec80/iroko/commit/f3eaffae7e44a59b483533d43fad463f08cb1d22))
* apply LOG_LEVEL default in runtimeEnv for SKIP_ENV_VALIDATION builds ([0675c66](https://github.com/pipec80/iroko/commit/0675c66d04ec530afa8f7e2fc94e727639af9cb4))
* attach native input listener to profile form for dirty state ([b3f95f5](https://github.com/pipec80/iroko/commit/b3f95f5ba053f5fd0260cc5c75949e67e1d95991))
* **auth:** protect reset-password route, fix e2e tests and add missing translations ([e6d8c95](https://github.com/pipec80/iroko/commit/e6d8c95f7b3251514511bc5e6a91bf7d283622aa))
* **billing:** usage en schema billing para postgrest y e2e checkout mock (F2-2A-core) ([147e4ee](https://github.com/pipec80/iroko/commit/147e4eebe899741a731209269c7be67080f12edb))
* check_request missing read_only_sql_transaction handler (25006) ([22665e0](https://github.com/pipec80/iroko/commit/22665e047f4c21a29841822a2661a7d20690f879))
* check_request service_role grant, non-null assertion, sync db types ([c307f8d](https://github.com/pipec80/iroko/commit/c307f8d4d200ac26878af511abeffeef623802f0))
* **ci:** add RESEND_API_KEY and FROM_EMAIL to E2E and build jobs ([8c74daa](https://github.com/pipec80/iroko/commit/8c74daadf6e3e5ddc1c8979d0877e9a182da05dd))
* **ci:** add skipValidation for dependabot prs where secrets are unavailable ([27cc57c](https://github.com/pipec80/iroko/commit/27cc57ccf10c3e7ae04f7b1dd0d8fc4f9958fec6))
* **ci:** allow dependabot pnpm install without frozen-lockfile ([#23](https://github.com/pipec80/iroko/issues/23)) ([b7d283b](https://github.com/pipec80/iroko/commit/b7d283b0be1841de4447f7e674c6d8cde426d8c6))
* **ci:** fallback placeholder for RESEND_API_KEY and FROM_EMAIL in build job ([5fc2558](https://github.com/pipec80/iroko/commit/5fc2558ecb556350632b8c52c9fbbda4704a8e4f))
* **ci:** format 6 files with prettier, lower functions coverage threshold to 3% ([7ff66f4](https://github.com/pipec80/iroko/commit/7ff66f4a87033c012aec6f881b0d4a16ba751a4a))
* **ci:** node 24, workflow_dispatch, skip prettier for dependabot, lower coverage threshold ([617e1f1](https://github.com/pipec80/iroko/commit/617e1f17eeb2535e05b18e92cc686f2f57abf073))
* **ci:** skip build entirely for dependabot prs (secrets unavailable by design) ([73b9093](https://github.com/pipec80/iroko/commit/73b9093c460a787cc798b89c4dbcd49b9f21675a))
* **ci:** skip build for dependabot prs, update sentry deprecated config api ([bdc40fb](https://github.com/pipec80/iroko/commit/bdc40fb3c8295850b6faa6b8a3aae5a2503e9f60))
* correct email URL regex (/auth/click) and settings route (/account) ([d384178](https://github.com/pipec80/iroko/commit/d38417856d5a7eacb1b4406be9a1e490b32b2d12))
* correct invite_members email ambiguity and revalidatePath paths ([055f5fb](https://github.com/pipec80/iroko/commit/055f5fb4f4410cd849c654a4f2070b357459dc51))
* **csp:** add Sentry report-uri, Report-To and Reporting-Endpoints for CSP violation reporting ([7fca9c1](https://github.com/pipec80/iroko/commit/7fca9c17c0341e7dda621f1ee03395cbd0faa0af))
* **csp:** add WebSocket origin for local Supabase Realtime in dev ([115e504](https://github.com/pipec80/iroko/commit/115e504eba1220e1ca2b39f8da70a7e8573ba98f))
* **csp:** add worker-src blob for Sentry Replay and Vercel endpoints to connect-src ([6d9a5ea](https://github.com/pipec80/iroko/commit/6d9a5ea9a29bf8c3defd72466ec95b803e17e880))
* **csp:** propagate nonce to html element so Next.js applies it to streaming inline scripts ([dce6f4d](https://github.com/pipec80/iroko/commit/dce6f4ded1618674263d99d1bbdbc022268181a2))
* dark mode select y check icon en locale switcher ([d07cf6f](https://github.com/pipec80/iroko/commit/d07cf6fdfcefc21cb0aa69b8e24672388736d03e))
* **db:** agregar límite de 10 MB a documents.content ([6779e25](https://github.com/pipec80/iroko/commit/6779e25a7b5b0182618d0ff918b96429e87ab7a0))
* **db:** agregar ON DELETE SET NULL a FKs de created_by/invited_by ([6bed629](https://github.com/pipec80/iroko/commit/6bed6290563c2dae184227cbef47dd752440eb9a))
* **db:** corregir cálculo de MRR para planes anuales en v_mrr_by_plan ([087d030](https://github.com/pipec80/iroko/commit/087d030f4381fba387835c1a4944a7797af0c819))
* **db:** drop orphaned public.rls_auto_enable() duplicate ([b20017b](https://github.com/pipec80/iroko/commit/b20017bb781b0001a913b9e388718ae6398521a6))
* **db:** hard-delete con orden correcto + FK billing.events SET NULL para GDPR compliance ([57ae4da](https://github.com/pipec80/iroko/commit/57ae4da5b40710c1a663a17dc3c296572a9954d5))
* **db:** reemplazar unique constraint invitations por índice parcial pending-only ([eac7005](https://github.com/pipec80/iroko/commit/eac70050130509106c4cdd16c285f3efec679cf4))
* **db:** restore counter-based rate limiting clobbered by trusted-ip fix ([#30](https://github.com/pipec80/iroko/issues/30)) ([3324227](https://github.com/pipec80/iroko/commit/332422700e7a98955b67be5ca71bd8bc961dc888))
* deny_mutation allows FK SET NULL cascades (pg_trigger_depth &gt; 1) ([d2d8f94](https://github.com/pipec80/iroko/commit/d2d8f9410eb042f1173d39426a55a623b5871c95))
* **deps:** replace xlsx SheetJS CDN with npm package 0.18.5 ([8c01184](https://github.com/pipec80/iroko/commit/8c011842f8950ecca6f48485ef1ec481cd7d49ac))
* disable captcha in local Supabase (root cause of E2E login failures) ([edeae43](https://github.com/pipec80/iroko/commit/edeae432b1ed39207473af1b0de51c85222040b5))
* disable Turnstile in CI E2E, fix login heading and ambiguous selectors ([b1d0d21](https://github.com/pipec80/iroko/commit/b1d0d2170151ff1925e39692b0d56f4d6c2f87e5))
* e2e timeout-minutes, webServer timeout, fix gen types command in CI ([55c1ebe](https://github.com/pipec80/iroko/commit/55c1ebe0e55355f122f24c0c123727854d78f75d))
* **editor:** set textarea placeholder client-side to avoid SSR hydration mismatch ([7c0a1d1](https://github.com/pipec80/iroko/commit/7c0a1d1aab09c37dea374c608e065df4704730c8))
* **email:** add default exports for react-email preview server compatibility ([ef31dc2](https://github.com/pipec80/iroko/commit/ef31dc26a5e355d29efebb0c1f8684e2f1289cc3))
* **email:** apply vi.hoisted pattern in template tests and use Link in welcome footer ([fa44d35](https://github.com/pipec80/iroko/commit/fa44d35a19bceda7349c97baa2d687b0b0d30f2d))
* **email:** contain getUserById errors in notify() fire-and-forget block ([780d782](https://github.com/pipec80/iroko/commit/780d782f944802de65a4d831a7b1b901f3340e18))
* **email:** lazy-initialize Resend client to avoid module-level failure during build ([93415b6](https://github.com/pipec80/iroko/commit/93415b60454c5093a15044409dcb5be23839219a))
* **email:** rename role to teamRole in InvitationEmail; remove server logger from NotificationBell ([547b7ca](https://github.com/pipec80/iroko/commit/547b7ca863baf4bda06b9bfbef2f2b2db7077f9b))
* **email:** use after() for serverless safety and fix invitation over-send ([5c7cdde](https://github.com/pipec80/iroko/commit/5c7cdde5e8a696535d229c602b363a990fe7ce3a))
* **env:** replace direct process.env access with validated env from @/env ([56d8039](https://github.com/pipec80/iroko/commit/56d8039c8de0927a58e6bf3c9e5c47e2ea5757b8))
* **errors:** log errors in RSC data fetches before returning fallback ([0213638](https://github.com/pipec80/iroko/commit/0213638a5b38091ea094fc9a3dda0e6f589eddee))
* **flags:** add missing COMMENT ON COLUMN, REVOKE on resolve_flag, remove redundant index ([a04a62e](https://github.com/pipec80/iroko/commit/a04a62ef67b01466acca021ddd2d0046d1569687))
* **flags:** revoke anon on feature_flags, safe jsonb cast in resolve_flag ([7079404](https://github.com/pipec80/iroko/commit/7079404d87290cc51e95d471dff9a9950e8c73ff))
* implement nonces correctly using NextResponse.next() pattern ([eaca25d](https://github.com/pipec80/iroko/commit/eaca25d23bdf22ca52afc1bff72521dba752b255))
* install Playwright before Docker/Supabase to avoid resource contention ([c43d483](https://github.com/pipec80/iroko/commit/c43d483c6cc221aeb3620302d6ca75a66e62dd8c))
* logger server-only, client hooks, after() promises, team page design ([7341a93](https://github.com/pipec80/iroko/commit/7341a93f53c2980dee4eb77f4ba9a286bb025be6))
* **logging:** migrate console.* in client components to logClient ([5ec7771](https://github.com/pipec80/iroko/commit/5ec77714b02030f1fe00a37d5c70dd76eefae87e))
* lower branch coverage threshold to 4% and use onInput for profile dirty state ([750c5a8](https://github.com/pipec80/iroko/commit/750c5a8c07fb53ff617d7751081c9d96cf9b650d))
* make topbar search input white against bone header background ([50f9ab6](https://github.com/pipec80/iroko/commit/50f9ab61b1673dfacc40bd7176b54a30708ec03b))
* move themeColor from metadata to viewport export ([488ee9b](https://github.com/pipec80/iroko/commit/488ee9b2393f43a8072e500c7c2846b11dcb89da))
* narrow email selector in auth fixture to avoid hidden magic-link input ([5f01fc6](https://github.com/pipec80/iroko/commit/5f01fc625a59d99db1ec576582b0cfe4602acbe7))
* nav hover red, avatar square, kbd badge with background ([b9dd049](https://github.com/pipec80/iroko/commit/b9dd049669c9761970b7f9c9089933d30805c3e9))
* **notifications:** correct realtime.send arg order, drop UPDATE policy, handle mark_all_read errors ([1f4110c](https://github.com/pipec80/iroko/commit/1f4110c798cb21582e66b7919b7aef36a8430352))
* **notifications:** grant SELECT and INSERT on notifications to authenticated role ([a052397](https://github.com/pipec80/iroko/commit/a05239761d2acd09b308cd64b276804f9da4d322))
* **notifications:** surface RPC and query errors in useNotifications hook ([aedcd51](https://github.com/pipec80/iroko/commit/aedcd51038a109652c9e97c6c8f922d181655e52))
* point email templates to /auth/click intermediate page ([6fbe59f](https://github.com/pipec80/iroko/commit/6fbe59f8a8d6359a6ea78ac2e0aad6a96b22f62f))
* pre-build quality pass — db lint, FK index, no-null assertions ([f15c54c](https://github.com/pipec80/iroko/commit/f15c54cd49a686dc9c9e32ec487de596348550c3))
* qa pass — auth ux, phone input, sessions icon, avatar pgrst203 ([d3ed0d7](https://github.com/pipec80/iroko/commit/d3ed0d75702f2dc6d41f192d2b19733c0454093d))
* remove --with-deps from playwright install (fc-cache hangs 15-20min) ([d357ec0](https://github.com/pipec80/iroko/commit/d357ec094fbb855a819f1a33c3e6ed77911e86d9))
* remove dirty-state guard from profile submit button ([cee1a22](https://github.com/pipec80/iroko/commit/cee1a22060651bc8915fd447770ffe98fbaabb22))
* remove docs/changelog nav links (pages not yet created) ([4e958f6](https://github.com/pipec80/iroko/commit/4e958f6f906bdb71571d78087e6197b49228206b))
* remove flag emojis from phone country selector, show dial code + name ([abde597](https://github.com/pipec80/iroko/commit/abde597695c9d92617cb3ce7fd41df0b8fb2d1f0))
* remove nonce/connection() to fix Vercel prerender build error ([e95daff](https://github.com/pipec80/iroko/commit/e95daff793e287ef805a4bf66aff8aa7b8b8427e))
* replace Material Symbols with Lucide icons in account tabs ([66d5107](https://github.com/pipec80/iroko/commit/66d51070698fa8d4365523fd37cc065f126e3261))
* replace Material Symbols with Lucide icons in security and billing ([6c96f34](https://github.com/pipec80/iroko/commit/6c96f34216a652500c050aa4e79f892738158684))
* replace timezone text input with grouped IANA select ([ce4ce5a](https://github.com/pipec80/iroko/commit/ce4ce5ad532a587fcccbd09bdde2bee95237ac4a))
* resolve all eslint warnings ([4e99799](https://github.com/pipec80/iroko/commit/4e997995fdff12a21b9c92977a5350de7d46fe59))
* resolve e2e timeout and Node.js 20 warning in CI ([fa6b4de](https://github.com/pipec80/iroko/commit/fa6b4dec6da0f6702092b718639793f335335047))
* resolve Phase 8 QA issues ([5c56953](https://github.com/pipec80/iroko/commit/5c56953f80137647af7ce6c87e7dc7d4bcfb17ed))
* resolve Turnstile captcha integration and RPC 405 rate limit conflict ([c61c791](https://github.com/pipec80/iroko/commit/c61c791d706d834890cf3d659443a7c0d8e9f458))
* **security:** audit hardening — F1-01, F2-01, F2-02, F3-02 ([228b93d](https://github.com/pipec80/iroko/commit/228b93d3655181d4bedb6b7f91c66f6866d3ea67))
* **security:** close MFA bypass, cross-tenant PII leak + hardening batch ([#29](https://github.com/pipec80/iroko/issues/29)) ([5aa5fbe](https://github.com/pipec80/iroko/commit/5aa5fbef4117705f331d7471a50c00e1aff86b56))
* **sentry:** update project slug to iroko in withSentryConfig ([cdd510e](https://github.com/pipec80/iroko/commit/cdd510e8007cf08dac6c42bd5d85575959f6aacb))
* separate sidebar (gray) from topbar (bone) colors ([f363d77](https://github.com/pipec80/iroko/commit/f363d777047b890e5cb38885a1fd9d5a90ab940d))
* set session cookies directly on OTP confirm redirect response ([d8bfb34](https://github.com/pipec80/iroko/commit/d8bfb3496b211a62c372a3bbd0526a5f264ebb3a))
* simplify CSP to resolve script blocking in production ([e0531fc](https://github.com/pipec80/iroko/commit/e0531fce291d3383bd3e475d8f8cba5d53620d75))
* **styles:** replace className template literals with cn() utility ([e6b6058](https://github.com/pipec80/iroko/commit/e6b60586b8e648d191aee23674cad3649681f107))
* **test:** update teamRole assertion in inviteMembers test ([214444c](https://github.com/pipec80/iroko/commit/214444c9049ced9514bfb6e6ba386ff5d91b8f7c))
* **topbar:** avatar priority LCP + revert Trusted Types header ([f156b11](https://github.com/pipec80/iroko/commit/f156b11936d0486d92d98f63f0121e2fc2adcf20))
* **ui:** apply danger zone red border — fix CSS selector + revalidatePath type param ([b297027](https://github.com/pipec80/iroko/commit/b297027b7a9c916948290ad0556c7f9db4fa98cf))
* **ui:** danger zone visible en org/settings — reordenar regla CSS tras .card ([73997b4](https://github.com/pipec80/iroko/commit/73997b434c0be6ebcbaf319911b038b817f38112))
* **ui:** h-screen layout para sidebar fijo + transicion fadeInDown ([109a946](https://github.com/pipec80/iroko/commit/109a946d5a9e4d53f1027dbb5a5d782f916c191d))
* use channel:chrome in CI for Playwright and fix stale test assertion ([91f4d04](https://github.com/pipec80/iroko/commit/91f4d048425df7ba9cf1805af9a177937570c0fb))
* use connection() in locale layout to allow dynamic headers access ([054a12f](https://github.com/pipec80/iroko/commit/054a12f9d42c3a5fc0bb1030954485b77a72b404))
* use pre-installed Chrome on runner instead of downloading Playwright browser ([1bfd79b](https://github.com/pipec80/iroko/commit/1bfd79be6d1c60f60802365c61267e4330f041a1))


### Performance Improvements

* **db:** rediseñar rate limiting con contadores por ventana de 1 minuto ([d731b0c](https://github.com/pipec80/iroko/commit/d731b0c9407412c324133d394efde7c29518ffcb))
* fix Playwright cache key and skip browser download on cache hit ([274c401](https://github.com/pipec80/iroko/commit/274c401ecc81b204c3baf8bc925d5cb9e145ad9e))
* remove Playwright browser cache (docs advise against it) ([d770b0e](https://github.com/pipec80/iroko/commit/d770b0ed5948e2ca20ea9046eeb08fea03aecceb))

## [Unreleased]

### Security

- Update Next.js 16.2.4 → 16.2.7 (closes CVE proxy bypass, SSRF, DoS in Cache Components)
- Update @vitest/browser 4.1.5 → 4.1.8 (closes otelCarrier XSS in devDep)
- Update next-intl 4.9.1 → 4.13.0 (closes icu-minify moderate vuln)
- Anti-enumeration: `signUpAction` returns generic confirmation for existing emails (F3-02)
- `createDocument`: derive `accountId` server-side via RPC, never from client input (F2-01)
- UUID validation on `saveDocument` and `revokeSessionAction` before Postgres round-trip (F2-02)
- `get_account_subscription` RPC: add membership check via `private.user_is_member()` (F2-03)

### Added

- GitHub Actions CI pipeline: 4 parallel jobs (quality / security / test / build)
- Vitest coverage config with 20% thresholds
- Auth actions unit tests: 13 cases covering anti-enum and MFA flow
- Vercel Analytics and Speed Insights in root layout
- Sentry integration: DSN in env.ts, `captureException` in all 3 error boundaries
- `withSentryConfig` wrapper in next.config.ts (org: iroko, source maps)
- `vercel.json` with cache headers for auth routes and static assets
- Loading skeletons for projects, reports, billing, and operations routes
- Skip-to-content accessibility link in locale layout
- `LICENSE` (Proprietary), `SECURITY.md`, `CONTRIBUTING.md`
- GitHub templates: PR template, bug report, feature request
- Dependabot for weekly npm + monthly GitHub Actions updates

### Changed

- `<html lang>` is now dynamic per locale (was hardcoded `"es"`)
- Move `html/body` to `[locale]/layout.tsx` — root layout is now minimal
- Extract `strongPassword` Zod schema to `lib/validation/shared.ts` (DRY)
- Replace `process.env.SITE_URL` with `env.SITE_URL` in all server-side code
- Google OAuth `client_id` moved from hardcoded to `env(GOOGLE_CLIENT_ID)` in config.toml
- Remove `/es/` locale prefix from all 5 email templates
- `resendConfirmationAction`: replace `typeof` check with `emailSchema.safeParse()`
- Rewrite README.md with project name, stack, setup guide, and scripts

### Removed

- Unused production dependencies: `ai`, `jose`, `react-hook-form`, `@hookform/resolvers`, `zustand`, `nanoid`

---

> **Note:** This project uses [conventional commits](https://www.conventionalcommits.org/).
> Future releases will be auto-generated from the commit history.
