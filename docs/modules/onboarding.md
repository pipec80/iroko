# Onboarding wizard post-signup (`/dashboard/onboarding`)

> **Tarea F3-C4** · PR [#70](https://github.com/pipec80/iroko/pull/70), commit histórico `0ce0e69`
> Estado actual: flujo, acciones y cobertura automatizada verificados estáticamente el
> 2026-08-20. El E2E actual del alta completa está **[NO VERIFICADO]** en esta revisión.

## 1. Qué es esto

Wizard de 4 pasos que se muestra una vez, justo después del signup: **confirmar org → invitar
equipo → elegir plan → branding**. Marca `profiles.onboarding_completed = true` al terminar (o
al saltarlo). Saltable por config global (feature flag) y por botón "Omitir" en cada paso — la
invariante de diseño es que **nunca debe existir un estado donde el usuario no pueda llegar a
`/dashboard`**.

Al confirmar la organización, el wizard crea una cuenta de equipo real si la cuenta activa es
personal; luego refresca la sesión para que el paso de invitación use el nuevo `account_id`. Si
la cuenta activa ya es de equipo, la renombra para que el flujo sea reentrable.

## 2. Cómo funciona por dentro

### El gate vive 100% en el edge, sin round-trip a DB

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. custom_access_token_hook mintea el claim                          │
│    app_metadata.onboarding_completed (mirror de                      │
│    profiles.onboarding_completed, fail-open true si no hay fila)     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. src/lib/supabase/middleware.ts: si el claim dice false y la ruta   │
│    no es ya /dashboard/onboarding → redirect ahí. Mismo patrón ya    │
│    probado para MFA/super-admin/impersonation.                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Al completar/saltar: complete_onboarding() (RPC) actualiza        │
│    profiles.onboarding_completed=true → refreshSession() para        │
│    reemitir el JWT con el claim actualizado → redirect a /dashboard  │
└─────────────────────────────────────────────────────────────────────┘
```

Este diseño evita el loop de redirect que tendría un chequeo equivalente en
`dashboard/layout.tsx`, a costa de tener que llamar `refreshSession()` explícitamente tras
completar (si no, el claim queda _stale_ hasta el próximo refresh natural del token).

### 3 bugs reales encontrados y arreglados en la misma rama

1. `redirect()` dentro de una Server Action **no re-ejecuta el middleware** para la navegación
   resultante — `signInAction`/`verifyMfaAction` ahora deciden el destino leyendo `getClaims()`
   directo, igual que hace el middleware, en vez de confiar en que el próximo request pase por
   el gate.
2. `data.user.app_metadata` (del cliente de Supabase Auth) **no refleja los claims del hook** —
   viene de `auth.users` directo, no del JWT ya emitido. Mismo fix que el punto anterior: leer
   `getClaims()`, no `user.app_metadata`.
3. La suite E2E completa, que reusa la fixture `authenticatedPage`, quedaba atrapada en el
   wizard porque los usuarios de test nacen con `onboarding_completed=false`. La fixture ahora
   los marca onboardeados vía `execSqlAsPostgres` antes de cada test.

### Nuevo RPC: `rename_account`

`authenticated` no tenía `GRANT` directo sobre `public.accounts` (hardening de grants de F2) a
pesar de que la policy RLS de `UPDATE` existe — el wizard necesitaba renombrar la cuenta desde
el paso 1, así que se agregó `rename_account(p_account_id, p_name)`, mismo patrón que
`set_account_logo`.

## 3. Referencia técnica

### RPC

**`public.rename_account(p_account_id uuid, p_name text) RETURNS void`** — `SECURITY DEFINER`,
gateado por `private.assert_account_admin(p_account_id)`.

**`public.complete_onboarding() RETURNS void`** — `SECURITY DEFINER`, marca
`profiles.onboarding_completed = true` para el caller.

### Claim JWT

`app_metadata.onboarding_completed: boolean` — agregado a `custom_access_token_hook` (mismo
hook que ya pone `account_id`, `role`, `mfa_enrolled`, `is_platform_admin`).

### Feature flag

`features.onboarding` en `src/config/app.config.ts` — desactivarlo salta el gate por completo.

### Archivos del feature

```
supabase/migrations/20260724011136_f3_c4_onboarding.sql
supabase/migrations/20260724033303_f3_c4_rename_account_rpc.sql
supabase/schemas/public.sql                              ← mirror (hook + rename_account + complete_onboarding)
supabase/tests/database/21_onboarding.test.sql

src/config/app.config.ts                                  ← flag features.onboarding
src/lib/supabase/middleware.ts                             ← gate de edge

src/app/[locale]/dashboard/onboarding/
├── actions.ts                     ← getOnboardingOrg, confirmOrgName, completeOnboarding
├── page.tsx
└── __tests__/actions.test.ts

src/components/dashboard/onboarding/
├── onboarding-wizard.tsx          ← orquestador client (stepper de 4 pasos)
└── step-*.tsx                     ← org / invite / plan / branding

src/components/ui/stepper.tsx                              ← stepper genérico, reusable
src/components/dashboard/team/invite-form.tsx               ← extraído de InviteDialog (sin Dialog) para reusar en el wizard

src/test/e2e/onboarding.spec.ts
src/test/e2e/fixtures/auth.ts                              ← fixture marca onboarding_completed=true
```

### i18n

Namespace `Onboarding` en `messages/{en,es,pt,fr}.json`.

### Autoridad visual actual

La intención visual y los tokens se definen en el
[sistema canónico](../design-system/README.md); `src/app/globals.css` y
`src/app/layout.tsx` demuestran la implementación real de esta pantalla. Si divergen, se registra
y corrige la brecha: un mockup por sí solo no prueba que esté implementado.

## 4. Cómo probarlo en local

```bash
pnpm supa:start
pnpm dev
```

Registrate normal en `/signup` — el wizard aparece automáticamente en el primer login. Botón
"Omitir" disponible en cada paso.

### Tests automáticos

```bash
pnpm supa:test                                    # incluye 21_onboarding.test.sql
pnpm test "dashboard/onboarding/__tests__"
pnpm test:e2e onboarding                           # flujo crítico E2E
```

## 5. Qué sigue

Onboarding fue el bloqueador de **3H-2** (logo de organización) para el paso de branding —
ambos ya cerrados. No tiene dependientes directos dentro de Fase C.
