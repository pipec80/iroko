# Iroko Capability Inventory

## Matriz de oferta y evidencia — 2026-11-18

Base revisada: `main` en `66bc3f7`. Iroko usa Supabase para identidad, datos,
permisos, archivos, eventos y tareas de backend. Next.js presenta y conecta
los recorridos de la aplicación. La evidencia sostiene esta arquitectura y una
aceptación técnica acotada del núcleo. La suficiencia global para MVPv1 queda
**parcial** hasta completar las validaciones indicadas por escenario.

**Cumple** se refiere al contrato y entorno citados. **Parcial** indica que una
parte está demostrada y otra tiene una brecha o una validación pendiente.
**No cumple** requiere un defecto comprobado frente al requisito.
**No verificado** identifica una prueba faltante. **No aplica** corresponde a
una exclusión de la oferta. Esta pasada combina lectura de fuentes y evidencia
previa. Los resultados conservan el entorno y la fecha de su ejecución.
Alcance y método en [ADR0005](adr/0005-replicable-saas-mvp-and-bounded-acceptance.md)
y [reorganización de la auditoría](audits/2026-11-18-capability-audit-reorganization.md).

### Supabase y recorridos del núcleo

| Capacidad                                 | Oferta e implementación                                                                                                                    | Evidencia y veredicto                                                                                                                                                     | Pendiente o referencia                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth y sesión                             | Registro, acceso, confirmación, recuperación y sesión SSR. Rutas `(auth)`, callback en `auth/`, `src/lib/supabase/middleware.ts`.          | **Parcial**. CI cubre recorridos base. El 18 nov ambos redirects conservaron las cookies renovadas en Cloud. El propietario confirmó login normal.                        | A-ACCESS-02 corregido en Cloud. Google configurable y confirmación/recuperación por correo Cloud requieren evidencia por flujo. SSO queda fuera de la selección. |
| MFA y sesiones de cuenta                  | TOTP, códigos de recuperación, consulta y revocación de sesiones. `dashboard/account/`, `src/lib/auth/recover-mfa.ts` y RPC.               | **Parcial**. SQL, GoTrue y navegador aprobaron en CI. La prueba Cloud del 18 nov quedó bloqueada por Turnstile antes de recuperar.                                        | A-ACCESS-01 y QA-AUTH-02. Recorrido humano con fixture propio.                                                                                                   |
| Perfil de usuario                         | Perfil vinculado a Auth y edición desde cuenta. `public.profiles`, trigger de alta y acciones de cuenta.                                   | **Parcial**. 016 demostró actualización propia y separación entre usuarios en local. DB-01 confirma una brecha en permisos de columnas internas.                          | DB-01 P2 en el registro. Mantener esa brecha visible al evaluar el ciclo de datos.                                                                               |
| Cuentas, equipos y onboarding             | Cuenta personal, equipos y selección de cuenta. `dashboard/actions.ts`, `dashboard/onboarding/` y RPC `create_team`/`switch_account`.      | **Cumple en el alcance local**. 015 demostró alta, onboarding y dashboard en la instancia derivada. SQL y E2E cubren el recorrido base.                                   | Crear y cambiar equipo en el recorrido humano del candidato estable.                                                                                             |
| Membresías, roles y aislamiento           | Invitaciones, gestión de miembros y permisos por cuenta. Pantallas de miembros, `accounts_memberships`, RPC y RLS con pertenencia vigente. | **Cumple en los escenarios locales cubiertos**. pgTAP 23/28–32 y matriz RBAC. 016 conserva los límites por operación.                                                     | Aislamiento en Cloud **[NO VERIFICADO]** para la matriz completa de roles.                                                                                       |
| Administración, actividad e impersonación | Administración de plataforma, actividad por rol e impersonación acotada. `dashboard/admin/`, `audit.logs` y RPC protegidas.                | **Parcial**. Filtros, paginación y recuperación de error aceptados localmente en 014-T3. Límite web y expiración natural de impersonación comprobados en Cloud el 16 nov. | FOLLOW-TTL conserva su evidencia. La cobertura de administración Cloud sigue acotada.                                                                            |
| Storage de avatar y logo                  | Carga desde cuenta y organización con políticas del bucket y validación de archivo.                                                        | **Cumple en local**. 014-T2 y 016 demostraron imagen, persistencia y controles de tamaño y tipo.                                                                          | Confirmar carga y visualización Cloud en el candidato de QA.                                                                                                     |
| Storage privado reutilizable              | Archivos privados y enlaces firmados disponibles como patrón. `src/lib/storage.ts` y políticas de Storage.                                 | **Parcial**. Derivado 015 conservó bytes y acceso autorizado. 016 demostró en local el límite de expiración del enlace previo y el control tras revocar acceso.           | TTL de descarga privada en Cloud **[NO VERIFICADO]**. El editor de documentos queda diferido.                                                                    |
| Realtime                                  | Notificaciones, presencia de equipos y anuncios. Hooks en `src/hooks/`, canales privados y políticas SQL.                                  | **Cumple en los escenarios locales cubiertos**. 016 N-07 demostró notificación y presencia. pgTAP 18/22 cubre políticas y anuncios según escenario.                       | Entrega, reconexión y salida de canal en Cloud conservan su límite de evidencia.                                                                                 |
| Claves API, cuotas y flags                | Gestión de claves y flags por cuenta. `src/lib/api-keys/`, tablas y RPC de flags, configuración y pantallas de organización.               | **Parcial**. Cuota concurrente de claves probada en 017 y configuración mínima en 015.                                                                                    | D-03.API y seguimiento 012/017 de admisión y límites. Verificar sólo límites Cloud relevantes al uso efectivo.                                                   |
| Ciclo de datos                            | Exportación y eliminación desde cuenta. `supabase/schemas/gdpr.sql` y acciones de cuenta.                                                  | **Parcial**. SQL 24 aporta cobertura local.                                                                                                                               | Ejecución Cloud **[NO VERIFICADO]** para el ciclo completo.                                                                                                      |

### Next.js, operación e integraciones

| Capacidad                                        | Oferta e implementación                                                                                                                                                                                    | Evidencia y veredicto                                                                                                             | Pendiente o referencia                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Capa web Next.js                                 | App Router, rutas públicas y dashboard, cuatro locales, configuración de marca y módulos. `src/app/[locale]/`, `src/i18n/`, `app.config.ts`.                                                               | **Cumple en el núcleo revisado**. 015 demostró composición y adaptación. 016 cerró el alcance técnico según ADR0005.              | Diseño gráfico y revisión web ampliada conservan su propio alcance.                                                                |
| Frontera web y consentimiento                    | Proxy, CSP, acciones y rutas server, consentimiento y políticas de acceso. `src/proxy.ts`, rutas y componentes de consentimiento.                                                                          | **Parcial**. 012.4 y CI de noviembre aportan evidencia CSP y consumidores. El acceso por rol también se valida en backend.        | Excepciones CSP documentadas y RL-F01 para confianza IP Cloud.                                                                     |
| Correo de identidad                              | Confirmación y recuperación con Supabase Auth. Mailpit local y SMTP según destino.                                                                                                                         | **Parcial**. 015 demostró confirmación en Mailpit y la suite de Auth cubre recuperación local.                                    | Entrega al destinatario, enlace y finalización del flujo Cloud **[NO VERIFICADO]**. QA-AUTH-03.                                    |
| Correo transaccional Resend                      | Mensajes de aplicación como invitaciones. Componentes de correo en `src/lib/email/` y acciones que los consumen.                                                                                           | **Parcial**. Implementación y pruebas de aplicación.                                                                              | Entrega real por flujo y fuera del sandbox **[NO VERIFICADO]**.                                                                    |
| Trabajo asíncrono                                | PGMQ y Edge Function `process-email-queue`. Cron y `pg_net` llaman a workers con configuración gestionada en Vault. Billing usa rutas Node separadas.                                                      | **Parcial**. SQL 14, pruebas Edge y monitor nocturno documentado el 17 nov.                                                       | Medir efecto durable, reintento y archivo en destino cuando el escenario lo requiera. El monitor tiene alcance y vigencia propios. |
| Webhooks salientes                               | Suscripciones y entregas de la aplicación. `supabase/schemas/webhooks.sql`, acciones de organización y `/api/internal/webhooks/worker`.                                                                    | **Parcial**. Aceptación acotada 012.2 y cuota serializada en SQL.                                                                 | D-03.WEBHOOKS conserva regresión local. Entrega programada actual y casos no cubiertos **[NO VERIFICADO]**.                        |
| Billing y Mercado Pago                           | Planes, precios, checkout alojado, persistencia y reconciliación. `src/lib/billing/`, esquema `billing` y entrada `/api/webhooks/mercadopago`.                                                             | **Parcial**. MP-01 abrió checkout sin pago el 16 nov. Existe evidencia histórica acotada de sandbox.                              | 011 conserva ingreso autenticado, pago/callback y escenarios financieros pertinentes.                                              |
| Turnstile                                        | Protección configurable en formularios de Auth. `captcha-field.tsx` y configuración Auth.                                                                                                                  | **Parcial**. Cloud del 18 nov mostró el bloqueo de automatización y el propietario confirmó acceso humano normal.                 | QA humano por recorrido.                                                                                                           |
| PostHog y analítica                              | Integración configurable con consentimiento. `src/lib/analytics/` y componentes de consentimiento.                                                                                                         | **Parcial**. Recepción consentida acotada en 012.4 y controles de privacidad en 017.                                              | Recepción y eventos del candidato actual **[NO VERIFICADO]** fuera de la evidencia fechada.                                        |
| Sentry y Pino                                    | Monitoreo de errores y logging de servidor saneado. Configuración Sentry y `src/lib/logger.ts`.                                                                                                            | **Parcial**. Recepción acotada 012.4. S-12 tiene controles locales de serialización y privacidad.                                 | Señales operativas del candidato actual según escenario y vigencia.                                                                |
| Vercel y GitHub Actions                          | Despliegue, build, calidad, SQL, tipos, Edge y navegadores. `.github/workflows/` y configuración Next.                                                                                                     | **Cumple para la entrega observada**. PR 261–263 aprobaron sus controles y Vercel confirmó `66bc3f7`.                             | La base persistida del PC queda pendiente por RAM. El alcance de cada prueba se conserva por entorno.                              |
| Instalación y adaptación                         | Núcleo configurable y extensible, con marca y módulos por producto.                                                                                                                                        | **Cumple para el derivado local ensayado** en 015. Alta, persistencia, cambio de marca, actualización y restauración verificadas. | Uso por otro equipo o distribución comercial requiere evidencia específica.                                                        |
| Projects/editor, Robot, IoT, Stripe y mock Cloud | Projects y Robot tienen flags desactivados y fronteras de aplicación verificadas en el alcance registrado. Stripe queda diferido. Mock se reserva a fixtures locales confinados. IoT es consumidor futuro. | **No aplica** a la oferta actual. Las referencias y pruebas conservan sus resultados históricos.                                  | Reevaluar únicamente si se decide incorporarlos.                                                                                   |

### Evidencia y trabajo pendiente

- [Acceso/cuenta, Cloud y limpieza de fixtures](audits/2026-11-18-access-account-delivery.md).
- [Evidencia integrada 016, incluidas las referencias DB](audits/2026-11-12-nextjs-supabase-code-review.md)
  y [cierre acotado 017](exec-plans/completed/017-freeze-remediation.md).
- [Derivado local 015](quality/reusable-foundation-evidence.md) y
  [vigencia de evidencia operativa](quality/operational-evidence.md).
- [Recepción de integraciones y CSP en 012.4](audits/2026-10-19-plan-012-4-cloud-closure.md)
  y [aceptación Mercado Pago 011](exec-plans/deferred/011-billing/011-mercadopago-v1-chile-acceptance.md).
- [Registro de causas y dueños](exec-plans/active/freeze-remediation-register.csv)
  y [escenarios de QA humano](quality/manual-qa-register.md).

Para el triage, DB-01 es una brecha de producto ya identificada. MFA, correo,
Realtime y otras filas con límites necesitan evidencia por escenario para
decidir si requieren corrección. 011 conserva la aceptación del proveedor de
pagos. Las secciones siguientes amplían los escenarios y checkpoints fechados.

## Access/account delivery — 2026-11-18

[Delivery evidence](audits/2026-11-18-access-account-delivery.md): PR261/262 merged,
full CI passed, SQL migration applied to Cloud and canonical Vercel SHA verified.
A-ACCESS-02 corrected-cloud: both original307 refresh responses and persisted
browser cookies passed. A-ACCESS-01 remains evidence-pending: real SQL/GoTrue
CI passed; Cloud runner identified Turnstile readiness blocking login before MFA.
Owner confirmed ordinary browser login works. Hardened cleanup delivered and
both fixtures removed with original seven users preserved. Human-browser Cloud
MFA recovery remains pending; no full account or MVP acceptance is inferred.
Earlier dated sections retain their historical evidence boundaries.

## Access/account repair candidate — 2026-11-17

[Repair evidence](audits/2026-11-17-access-account-repair.md): refreshed-cookie
responses corrected locally; MFA recovery implemented with caller-bound claims,
AAL2-only generation and explicit global logout before factor reset. Independent
review: ready for CI; focused unit193/193 PASS. SQL/type regeneration and real
GoTrue/browser acceptance remain [NO VERIFICADO], including Cloud. Earlier audit
findings below retain their diagnostic date; implementation is not full acceptance.

## Access/account audit — 2026-11-17

[Dated selection/use/sufficiency matrix](audits/2026-11-17-access-and-account-audit.md)
and [reproducible evidence](audits/2026-11-17-access-and-account-evidence.md).
Supabase-first selection is aligned; access/account sufficiency is partial.
New A-ACCESS-01 functional P1: offered MFA recovery has no reachable recovery
route; A-ACCESS-02 P2: redirects discard refreshed cookies. Both are confirmed
in local composition, with mocked SDK/RPC boundaries; no live GoTrue, database,
browser or Cloud acceptance. Existing DB-01 remains P2 without a duplicate ID.
Eight existing unit files199/199 PASS do not cover these compositions; the
isolated probe has2positive controls PASS/3FAIL for the two causes.
These current findings qualify the older locally-covered labels below.
No product repair or reopening of historical016/017 was performed.

## Acceptance boundary — 2026-11-17

Plan016 completed for the technical core under the owner's dated ADR0005 amendment.
Billing remains enabled: prices, plans and hosted checkout are unchanged.
Provider acceptance remains pending in the existing011 family; current purchase,
callback and financial recovery do not receive PASS from the016 closure.
Configuring credentials alone does not certify the integration. Core evidence
retains its scenario/date; advanced editor/Robot remain effectively excluded.
Nightly schedule44073438546 passed production smoke, email health and advisors;
this resolves the monitor caller follow-up, without universal Sentry/WAF proof.
See [scope decision](adr/0005-replicable-saas-mvp-and-bounded-acceptance.md) and
[plan inventory](exec-plans/README.md). Earlier checkpoints are historical.

Delivery readback2026-11-16,23:57Z: PR258/main8f13892 and CI43949809330 passed;
automatic Vercel deployment READY at the exact revision. Application/SQL/MP
protocol unchanged from runtime118fedf. FOLLOW-TTL accepted with the documented
runner diagnostic; current official authenticated MP ingress remains the sole
mandatory gap. GitHub alert135 now fixed with no upstream patched version
reported; local mitigation stays. Earlier checkpoints retain their dates.

**Current candidate, 2026-11-16.** PR 252 reached `main` at `118fedf` and all CI gates passed. Plan 016 remains active with a partial verdict. [Main CI](https://github.com/pipec80/iroko/actions/runs/43932958196) · [Candidate evidence](audits/2026-11-12-nextjs-supabase-code-review.md).

- **Billing.** MP-01 opened the hosted Mercado Pago checkout without a payment. The initial readback found five checkout intents (one new), twenty events and five subscriptions; event975 later raised the total to21 through scheduled reconciliation, not inbound callback. Historical real charges retain bounded reuse for unchanged contracts. Current official authenticated ingress remains **[NO VERIFICADO]**, authorized without payment and pending owner session/OAuth. [MP-01 run](https://github.com/pipec80/iroko/actions/runs/43933678786).
- **Impersonation.** Cloud web cap and natural bearer expiry after the documented tolerance accepted on November16: original JWT401 expired at20:07:15Z, contemporaneous fresh target200, cleanup0 and immutable audit264/265 retained. Runner exit1 remains recorded for the browser-release timeout; late successful close and Windows process absence independently resolve that diagnostic. P2 harness follow-up owned by QA before next use. This does not prove immediate bearer revocation or rejection exactly at exp. [Evidence](audits/2026-11-12-nextjs-supabase-code-review.md).

Continuation2026-11-13: PR251 delivered as main5f68684; exact Git revision READY
on Vercel after CI43495317730 passed. SQL59files/1192assertions, unit1745PASS/1skip,
WebKit16PASS, Chromium89PASS/2skip/1flaky (logo QA timing, cause unproven), and
confined0167PASS/0skip/flaky. Rotated exposed credentials with authorization:
old Supabase key rejected401/new200; old Vercel bypass absent by API, other keys
preserved. Public endpoint404 is not runtime bypass-denial or WAF proof.
Real Cloud impersonation TTL trial is running with two owned users, MFA and
ordinary UI; neither expiry nor cleanup is accepted before its final readback.
Billing remains enabled and its PSP acceptance retains the separate011 dependency.
This does not accept the integrated MVP or repeat the historical017 audit.

Current execution2026-11-12: [016 partial evidence](audits/2026-11-12-nextjs-supabase-code-review.md).
Team admission concurrency repaired locally (D-03.TEAMS); SQL1189 assertions PASS.
Webhook final-slot admission additionally passed3/3; Storage local bearer expiry
passed with a contemporaneous owner control and verified fixture cleanup.
Billing remains enabled. Cloud/local180 after two specifically authorized
migrations and definition/ACL readback. Scheduled email delivery, rejection,
archive, Actions alert and recovery passed a bounded authorized real test.
PSP and remaining required runtime evidence are not accepted. DB intake dispositions
and16 N cases preserve their limits; no integrated MVP acceptance.

Current disposition2026-11-10: [015 bounded local reuse accepted](quality/reusable-foundation-evidence.md). [016](exec-plans/completed/016-nextjs-supabase-code-review.md) is the sole integrated acceptance entry, using candidate/evidence, integration and confirmed gaps, integrated circuit, and verdict. The capability rows retain dated evidence; no blanket runtime/Cloud PASS is implied. Actual PSP, scheduled worker/alerts, Cloud parity and signed-URL expiry remain pending where offered.

Historical dated checkpoints follow; newer evidence supersedes their rollout status.

014 local acceptance2026-11-05: trusted image origins unit20/20; platform audit
filters/pagination/error/retry accepted in production local browser1/1 and SQL19
15/15. [Evidence](audits/2026-11-05-plan-014-t2-t3-execution.md). Cloud and final016 remain separate.

Cloud migration update2026-11-02: eight existing migrations applied after reviewed
preflight; repository/local/Cloud177 and no remaining migration dry-run. This is
not full grants parity (RL-F03) or real-charge acceptance. [Evidence](audits/2026-11-02-plan-012-integration-and-disposition.md).

Pricing local acceptance,2026-11-02: landing/pricing/billing share the server
catalog; MP prices come from provider_prices. Incomplete MP offers are unavailable
publicly and disable checkout. Unit132/132, SQL44/44, confined capture6/6 and
public E2E1/1 (eight routes) passed; real browser billing showed updated limits
and price. Checkout ignored client amount/currency and retained Free entitlements
pending authorization. Fixtures restored; copy scope approved by the maintainer.
See the [012.5 evidence](audits/2026-10-30-plan-012-5-local-execution.md).
This accepts local pricing coherence, not Cloud parity or a real provider charge.

Offered MVP boundary, 2026-10-28: [ADR0005](adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
The inventory below describes implementation/evidence, not a promise to ship every
reference module. Robot and advanced document editor are deferred consumers;
015-T1 verified effective exclusion locally;016 must preserve it in the offered configuration.
Auth/data/RLS, bounded Storage/Realtime/Edge-email and subscriptions as offered
remain core. Independent brand/configuration, extension and update proof belongs
to015, without building a Robot vertical. As of2026-10-29, exclusion guards and
unit regressions are implemented; bounded local browser exclusion passed2/2.
Independent composition/reuse was accepted within the bounded local015 drill; see [reuse evidence](quality/reusable-foundation-evidence.md).

Consolidation: **2026-10-20**, using the [directed revalidation](audits/2026-10-19-freeze-code-and-documentation-revalidation.md) and [disposition register](exec-plans/active/freeze-remediation-register.csv). This updates bounded statuses and ownership, not all runtime evidence.

Original static inventory refreshed: **2026-10-01**, repository baseline
`f82d2fbe381014c80a090ba3c36c99e4778111c3` plus the current documentation
worktree. This inspection reviewed executable code, schemas, migrations,
configuration and tests. It did not re-run the application, local Supabase or
Cloud services; runtime claims retain their own dates in the
[operational evidence register](quality/operational-evidence.md).

## Purpose and MVP freeze

Iroko is an internal-first reusable SaaS foundation built with Next.js as the
application layer and Supabase as the backend. Its first objective is to make
the common platform work reusable so a derived product can focus on its own
domain.

The current freeze does not try to use every product Supabase may offer. It
requires **every capability Iroko declares as supported** to have a minimal
useful example, an explicit security boundary, test evidence, configuration
guidance and a known failure mode. During the freeze, add no new provider,
vertical or product module. The [root roadmap](../ROADMAP.md) owns the allowed
repair, verification, configuration and documentation boundary.

Allowed work during the freeze:

- fix a reproducible defect or security boundary;
- complete or test an existing example;
- make an existing integration optional and coherently configurable;
- document how to install, operate or extend an implemented capability;
- remove unsupported or misleading surface area;
- renew expired operational evidence.

Deferred work includes new payment providers, new verticals, commercial
packaging, additional pricing models and features added only to broaden the
catalogue.

## Status vocabulary

- **Implemented** — executable code or schema is present at the inspected
  baseline.
- **Locally covered** — focused automated tests exist; this inventory did not
  re-run them.
- **Partial** — useful implementation exists with a confirmed gap or an
  incomplete configuration boundary.
- **Optional** — the capability is an integration or module that a derived
  product may disable.
- **[NO VERIFICADO]** — current runtime, Cloud or provider behavior was not
  observed in this inspection, or its dated evidence expired.
- **Deferred** — deliberately outside the current MVP freeze.

Implementation and tests outrank this document if they disagree. A static
implementation entry is not a claim that the corresponding Cloud service is
healthy today.

## SaaS foundation capabilities

| Capability              | What exists                                                                                                                                                                                | Principal evidence                                                                                                     | Current boundary                                                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication          | Email/password signup and login, email confirmation, logout, OAuth callback, password recovery/reset and safe redirects                                                                    | `src/app/[locale]/(auth)/`, `src/app/[locale]/auth/`, `src/test/e2e/auth.spec.ts`                                      | **Implemented, partial sufficiency**: A-ACCESS-02 corrected-cloud in both refresh redirects. Provider/SMTP/Google runtime **[NO VERIFICADO]** beyond its dated evidence; see delivery report.                                                                                                                   |
| Account security        | Change email/password, reset request, list/revoke sessions, sign out other sessions, TOTP MFA and recovery codes                                                                           | `dashboard/account/`, `public.list_my_sessions`, `revoke_my_session`, recovery-code RPCs                               | **Implemented, partial Cloud acceptance**: A-ACCESS-01 repair delivered and SQL/GoTrue/browser CI verified; human-browser Cloud recovery pending because Turnstile blocks Actions login. Other scenarios retain their dates.                                                                                    |
| CAPTCHA                 | Optional Cloudflare Turnstile on authentication forms, paired with Supabase Auth CAPTCHA configuration                                                                                     | `src/components/auth/captcha-field.tsx`, `src/env.ts`, `supabase/config.toml`                                          | **Optional**; only Turnstile is claimed, not a general Cloudflare platform integration                                                                                                                                                                                                                          |
| Profiles                | Profile creation on signup, personal details, locale, timezone, phone, avatar and soft deletion                                                                                            | `public.profiles`, private signup triggers, `dashboard/account/actions.ts`                                             | **Implemented, locally covered**                                                                                                                                                                                                                                                                                |
| Accounts                | Personal accounts and team accounts, active-account selection, account profile, logo and metadata                                                                                          | `public.accounts`, `get_my_accounts`, `create_team`, `switch_account`                                                  | **Implemented, locally covered**                                                                                                                                                                                                                                                                                |
| Memberships             | Invite, accept invitation, list members, change role, remove member, leave team and transfer ownership                                                                                     | `public.accounts_memberships`, `public.invitations`, team actions, SQL tests 23/28/30/31                               | **Implemented, locally covered**                                                                                                                                                                                                                                                                                |
| Tenant RBAC             | `owner`, `admin`, `member` and `viewer`; live membership/role helpers are used by RLS and sensitive actions                                                                                | `public.membership_role`, `private.get_user_role`, `private.user_is_member`, SQL tests 29/32 and `rbac-matrix.spec.ts` | **Implemented, locally covered**; Robot route/action/SQL guards incorporated in 014-T1 with dated local acceptance. D-06 is corrected-local under017.2-T5; Robot remains excluded from the offered MVP. New-candidate exclusion and any future Robot Cloud acceptance remain separate.                          |
| Tenant isolation        | Database, Storage and checkout authorization revalidate current membership instead of trusting stale JWT claims                                                                            | Plan 010 migrations and regression tests, SQL test 32                                                                  | **Implemented with regression evidence** for the scoped surfaces; not a universal proof for future modules                                                                                                                                                                                                      |
| Platform administration | Global administrator whitelist separated from tenant roles; account listing, global audit, announcements and alert broadcast require platform-admin authorization and AAL2 where specified | `public.platform_admins`, `private.assert_platform_admin`, SQL test 19, `dashboard/admin/`                             | **Implemented, locally covered**; current runtime **[NO VERIFICADO]**                                                                                                                                                                                                                                           |
| Impersonation           | Platform administrator can create bounded impersonation sessions with banner, expiry and audit attribution                                                                                 | `public.impersonation_sessions`, admin account actions, SQL test 20 and E2E impersonation spec                         | Cloud cap and original JWT natural expiry after tolerance accepted Nov16; fresh target positive, cleanup0, audit264/265. Runner exit1 retained for late browser-release diagnostic; owned process absence independently confirmed.                                                                              |
| Onboarding              | Post-signup onboarding and creation of a real team account                                                                                                                                 | onboarding routes/actions, SQL test 21 and E2E onboarding spec                                                         | **Implemented, locally covered**; coherent disabled-module configuration accepted within local015; integrated016 remains pending                                                                                                                                                                                |
| Projects and documents  | Small tenant-scoped reference domain with CRUD and document records                                                                                                                        | `public.projects`, `public.documents`, `src/lib/projects.ts`, `src/lib/project-documents.ts`                           | **Implemented reference; deferred from offered MVP under ADR0005.** Effective route/action exclusion has guards and bounded local browser acceptance2/2,2026-10-29. This does not accept the editor or independent reuse; existing data/SQL evidence is retained.                                               |
| Storage                 | Public avatars, organization assets, private documents and signed Robot configuration downloads                                                                                            | account/org actions, Storage migrations, SQL tests 16/32 and storage E2E                                               | **Partial**; Robot RBAC incorporated, image-origin correction accepted locally under014-T2 on2026-11-05. Storage fixture corrections retain dated017 evidence; integrated offered-scope acceptance belongs to016.                                                                                               |
| Notifications           | Per-user notifications, mark-as-read RPC and Realtime delivery                                                                                                                             | `public.notifications`, `src/lib/notifications/`, `use-notifications.ts`                                               | **Implemented, locally covered**; current Realtime deployment **[NO VERIFICADO]**                                                                                                                                                                                                                               |
| Presence                | Account-scoped Realtime presence for team members                                                                                                                                          | `supabase/schemas/presence.sql`, `use-presence.ts`, SQL test 18 and storage/realtime E2E                               | **Implemented, locally covered**; it is a reference pattern, not a collaboration suite                                                                                                                                                                                                                          |
| Announcements           | Platform-wide announcement publication and Realtime broadcast                                                                                                                              | `public.announcements`, `publish_announcement`, SQL test 22                                                            | **Implemented, locally covered**; publication is intentionally append-only in v1                                                                                                                                                                                                                                |
| Feature flags           | Static product/module configuration plus database-backed flags and account overrides                                                                                                       | `src/config/app.config.ts`, `public.feature_flags`, `public.feature_flag_overrides`, `is_flag_enabled`                 | **Partial**; visibility, application availability and authorization remain distinct, and local015 accepted bounded coherent minimal configurations;016 owns integrated acceptance                                                                                                                               |
| Audit trail             | Tenant audit log and cross-account platform audit with cursor pagination and impersonator attribution                                                                                      | `audit.logs`, account/platform RPCs, SQL test 8/19                                                                     | **Accepted locally2026-11-05** for platform filters/load-more/error/retry under014-T3; broader audit/Cloud acceptance separate                                                                                                                                                                                  |
| API keys                | Account-admin creation, listing, revocation and server-side verification through gated RPCs                                                                                                | `supabase/schemas/api-keys.sql`, `src/lib/api-keys/`, SQL test 9                                                       | **Implemented, locally covered**; bounded public-route limiting accepted under 012.3. D-03.API last-slot quota is corrected-local under017.2-T1 (SQL53,49/49 joint); limiter admission and key-count quota are distinct.016 reuses this evidence and validates changed consumers; Cloud acceptance is separate. |
| Outbound webhooks       | Account endpoints, event catalogue, signed deliveries, retry state, delivery history and Vault-backed secrets                                                                              | `supabase/schemas/webhooks.sql`, org settings actions, SQL test 10                                                     | **Implemented with bounded 012.2 acceptance**; Node transport validates DNS and pins IP. Webhook creation quota is serialized; unrelated triggers/provider acceptance not inferred.                                                                                                                             |
| Application email       | React email templates, Mailpit transport for local development and Resend transport for configured deployments                                                                             | `src/lib/email/`, email unit tests                                                                                     | **Implemented**; Resend delivery outside its sandbox and current provider configuration are **[NO VERIFICADO]**                                                                                                                                                                                                 |
| Durable email jobs      | PGMQ queue, Edge Function consumer, retry/archive behavior, cron invocation through `pg_net`, Vault secret and health RPC                                                                  | `process-email-queue`, email migrations, SQL test 14, Edge Function tests and runbook                                  | **Implemented, locally covered**; dated Cloud health evidence has expired and must be refreshed                                                                                                                                                                                                                 |
| GDPR lifecycle          | User data export, deletion request, delayed purge and related UI                                                                                                                           | `supabase/schemas/gdpr.sql`, account actions, SQL test 24, module guide                                                | **Implemented, locally covered**; legal adequacy and Cloud execution are separate review boundaries                                                                                                                                                                                                             |
| Legal and consent       | Legal pages, versioned cookie choices and consent-gated analytics                                                                                                                          | public legal routes, cookie-consent code and E2E spec                                                                  | **Implemented, locally covered**; final legal text requires product-specific review                                                                                                                                                                                                                             |
| Billing core            | Provider registry, catalogue, plans, entitlements, subscriptions, invoices, events, checkout coordination, recovery and reconciliation                                                     | `src/lib/billing/`, `billing` schema, SQL tests 11–13 and 33–42                                                        | **Implemented**; billing-disabled local configuration accepted in015; real PSP and offered billing acceptance remain separate in016                                                                                                                                                                             |
| Mercado Pago            | Hosted monthly CLP checkout and first charge demonstrated with correlated sandbox evidence; recovery and reconciliation code exist                                                         | Plan 011 acceptance matrix and operational register                                                                    | MP-01 hosted checkout passed on `118fedf` without payment. Candidate payment and callback **[NO VERIFICADO]**. Advanced scenarios remain deferred.                                                                                                                                                              |
| Mock billing            | Local/test provider and mock checkout                                                                                                                                                      | billing provider registry and tests                                                                                    | **Bounded deactivation accepted2026-11-04** (FOLLOW-MOCK): hosted/general use blocked; explicit unhosted loopback fixtures only. Reopen before general use for expiry/audience/actor/atomic consumption; no Cloud bearer/replay/payment acceptance.                                                             |
| Stripe adapter          | Provider adapter and contract tests                                                                                                                                                        | `src/lib/billing/providers/stripe.ts` and tests                                                                        | **Deferred**; code presence is not provider certification                                                                                                                                                                                                                                                       |
| Product analytics       | Typed PostHog event taxonomy, client/server capture, sanitization and consent gating                                                                                                       | `src/lib/analytics/`, analytics tests and E2E                                                                          | **Optional, partial**; bounded consented PostHog receipt recorded in 012.4. bounded privacy repairs closed under017; server flag accepted locally in015-T1. Current offered-scope runtime belongs to016.                                                                                                        |
| Error monitoring        | Sentry server/client integration, tunnel, filters and smoke-test workflow                                                                                                                  | Sentry configuration, filters, E2E and runbook                                                                         | **Optional, implemented**; bounded Sentry receipt and browser observation recorded in 012.4 on 2026-10-19. No fresh provider check in this consolidation.                                                                                                                                                       |
| Structured logging      | Pino server logger with typed context and sensitive-field redaction                                                                                                                        | `src/lib/logger.ts`                                                                                                    | **Corrected-local2026-10-29** for S-12/017.1-T6: safe error serialization and privacy/logs62/62, typecheck and shared lint passed. Integrated016 and provider/Cloud evidence remain separate.                                                                                                                   |
| Internationalization    | Locale-prefixed routing and message catalogues for Spanish, English, Portuguese and French                                                                                                 | `src/i18n/`, `messages/`, locale routes                                                                                | **Implemented**; complete semantic translation review is separate from route support                                                                                                                                                                                                                            |
| Product configuration   | Central product identity, locales, feature switches and theme-token references                                                                                                             | `src/config/app.config.ts`                                                                                             | **Partial**; navigation/home composition and minimal variants accepted within bounded local015; integrated016 pending                                                                                                                                                                                           |
| Security headers        | CSP and other security headers from the intentional Next.js proxy entry point                                                                                                              | `src/proxy.ts` and tests                                                                                               | **Implemented with bounded 012.4 acceptance**; nonce script CSP present. Inline styles and nonfatal blocked Zod probe remain documented exceptions.                                                                                                                                                             |
| Quality pipeline        | TypeScript, ESLint, Prettier, Knip, Vitest, pgTAP, Edge Function tests, Playwright, CodeQL and Gitleaks                                                                                    | `package.json`, `.github/workflows/`                                                                                   | **Implemented with bounded local repairs**:017-R01/D-09/D-10 corrected-local, including attested SQL/fixture guards. PR250 and main CI passed on5dd46f9; reuse candidate-specific evidence in016. This does not accept the full integrated circuit or Cloud/provider runtime.                                   |

## Supabase capability coverage

This table records how Iroko uses Supabase. It is not a commitment to adopt
every Supabase product.

| Supabase capability    | Iroko usage                                                                                                     | Minimal proof in the repository                        | Boundary                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                   | Email/password, OAuth callback, verification, recovery, sessions, TOTP MFA, recovery codes and optional CAPTCHA | Auth routes/actions, account security UI and E2E       | Deployment-specific providers and SMTP remain configurable                                                                                                                                                        |
| PostgreSQL             | Core tenant model, modules, audit and billing                                                                   | Versioned schemas and migrations                       | Schema presence is not runtime health                                                                                                                                                                             |
| Row Level Security     | Tenant isolation, role matrices, Storage and Realtime policies                                                  | pgTAP coverage and Plan 010 regressions                | Every new module must add its own negative cross-tenant tests                                                                                                                                                     |
| Database functions/RPC | Transactional membership, account, billing, audit and admin operations                                          | `public`, `private`, `billing` and `audit` functions   | Exposed functions require explicit grants and live-role checks                                                                                                                                                    |
| Custom Auth hook       | Active account and role claims                                                                                  | `custom_access_token_hook`                             | Claims improve UX; sensitive authorization revalidates live membership                                                                                                                                            |
| Storage                | Avatars, organization assets, documents and private signed downloads                                            | Bucket migrations, actions and tests                   | **Partial**; Robot RBAC incorporated, image-origin correction accepted locally under014-T2 on2026-11-05. Storage fixture corrections retain dated017 evidence; integrated offered-scope acceptance belongs to016. |
| Realtime               | Notifications, account presence and announcements                                                               | Realtime policies, hooks and E2E                       | No generic collaborative editing claim                                                                                                                                                                            |
| Edge Functions         | Durable email-queue consumer                                                                                    | `supabase/functions/process-email-queue/`              | Billing workers intentionally use a Next.js Node route                                                                                                                                                            |
| Queues                 | PGMQ email queue with retry/archive handling                                                                    | Queue migrations, handler and health checks            | Current Cloud queue health **[NO VERIFICADO]**                                                                                                                                                                    |
| Cron                   | Email and billing worker schedules                                                                              | Versioned scheduling migrations                        | A successful cron row alone does not prove the durable effect                                                                                                                                                     |
| `pg_net`               | Authenticated calls from database schedules to workers                                                          | Email/billing worker migrations                        | URL, secret and response health must be inspected together                                                                                                                                                        |
| Vault                  | Webhook signing secrets and worker URL/shared secrets                                                           | Vault-backed migrations                                | Secret values never belong in documentation                                                                                                                                                                       |
| Generated types        | TypeScript database contracts for exposed schemas                                                               | `src/types/database.ts`, CI type-generation comparison | Regenerate when exposed schema changes                                                                                                                                                                            |
| Local stack            | Auth, database, Storage, Realtime, Mailpit and Edge Function testing                                            | `supabase/config.toml`, scripts and CI                 | Docker/local success does not establish Cloud parity                                                                                                                                                              |
| Advisors and lint      | Schema lint plus security/performance advisors in nightly workflow                                              | `.github/workflows/nightly.yml`                        | Dated evidence expires according to the operational register                                                                                                                                                      |
| Vector extension       | Extension enabled by migration                                                                                  | advanced-extension migration                           | Extension availability only; no AI/RAG product capability is claimed                                                                                                                                              |

## External integrations

| Integration          | Role                                                             | MVP rule                                                                                         |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Resend               | Production application email transport                           | Optional when Mailpit/local transport is selected; provider delivery must be verified separately |
| Cloudflare Turnstile | Optional CAPTCHA for Auth forms                                  | Absence must not break Auth when CAPTCHA is disabled                                             |
| Sentry               | Error and performance telemetry                                  | Optional; absence must leave the application functional                                          |
| PostHog              | Consent-gated product analytics                                  | Optional; absence becomes a no-op, not an application failure                                    |
| Mercado Pago         | Demonstrated payment provider for the current Chile/CLP use case | Existing functional circuit is enough for the freeze; advanced certification is deferred         |
| Stripe               | Future payment option                                            | Adapter code does not make it supported; certification is deferred                               |
| Vercel               | Reference Next.js deployment and Node worker host                | Deployment evidence is provider-specific; core domain contracts stay in the repository           |

## MVP acceptance gates

The freeze is complete only when the final candidate demonstrates all of the
following without relying on historical prose alone:

1. A fresh documented local installation reaches a usable authenticated app.
2. Signup, login, confirmation, recovery, MFA and session management work in
   the supported configuration.
3. Personal/team accounts, invitations, membership lifecycle and the four-role
   RBAC matrix pass positive and negative tests.
4. Database, Storage and Realtime deny cross-tenant access in the demonstrated
   examples.
5. The app works coherently with billing disabled and with the selected billing
   provider enabled.
6. Mail has a local transport, a documented production transport and observable
   queue failures.
7. Optional analytics, monitoring and CAPTCHA integrations can be absent without
   breaking the core.
8. No confirmed P0/P1 security or integrity defect remains without an explicit
   owner and disposition.
9. A minimal derived domain can be installed, extended and upgraded without
   losing tenant data or customization.
10. Focused tests, full local gates and the production build pass on the exact
    final candidate; Cloud/provider claims are separately dated.

## Freeze work ownership

| Work     | Purpose in this inventory                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Plan 011 | Preserve the demonstrated Mercado Pago circuit; defer advanced provider scenarios and additional providers                          |
| Plan 012 | Completed approved security/pricing deliveries; inherited operational follow-ups retain their explicit dispositions                 |
| Plan 014 | Completed bounded local Robot availability/RBAC, image-origin and platform-audit correction scopes                                  |
| Plan 015 | Completed bounded local configuration, no-billing, extension and independent install/update drill                                   |
| Plan 017 | Completed bounded repairs; technical children remain references with transferred pending/deferred dispositions                      |
| Plan 016 | Reuse historical T0/T1, refresh candidate/deltas, verify Next/Supabase integration, validate and consolidate offered-scope evidence |
| Plan 013 | Deferred commercial packaging; it is not an MVP gate for internal reuse                                                             |

## Maintenance contract

- Update the relevant row when code, schema, authorization, configuration or
  a supported integration changes.
- Link detailed procedures to module guides or runbooks instead of duplicating
  them here.
- Treat `src/env.ts` as the environment-variable inventory; do not copy secret
  names and values into this document beyond what is needed to explain a public
  integration boundary.
- Record live results and expiry in the operational evidence register.
- Add a new capability only when it has a minimal example, security contract,
  tests, documentation and an owner.
- During the MVP freeze, a new idea goes to the deferred roadmap unless it is
  necessary to repair or prove a capability already listed here.
