# Plan 010 — Cerrar aislamiento tenant (Storage, checkout, invitaciones) + tests de regresión

- Priority: P0
- Status: Active (abierto 2026-08-19)
- Baseline: `main` @ `d9e2648` (post PR #136, `fix: convert email_worker_health to dynamic SQL`)
- Scope: tres vulnerabilidades de aislamiento tenant confirmadas por lectura directa
  de código (no hipotéticas), más los tests que las convierten en regresiones
  imposibles de reintroducir sin que CI falle. No incluye billing (Plan 011) ni
  hardening general (Plan 012).

## Objective

Que ningún acceso sensible (Storage, inicio de checkout, aceptación de
invitación) dependa exclusivamente de claims potencialmente obsoletos del JWT
(`app_metadata.account_id`/`role`, vigentes hasta 1h tras removerse la
membresía — `jwt_expiry = 3600` en `supabase/config.toml:184`), y que una
invitación solo pueda aceptarla el destinatario real.

## Contexto — hallazgos verificados (auditoría 2026-08-18/19, no re-auditar)

Confirmados leyendo el código fuente exacto, no solo el reporte pegado por el
usuario:

- **SEC-001 — Storage RLS con JWT stale.** Las policies de
  `storage.objects` para los buckets `documents` y `org-assets`
  (`supabase/migrations/20260513000000_storage_documents_rls.sql`,
  `20260718000000_org_assets_storage_rls.sql`,
  `20260718030000_org_assets_storage_select_rls.sql`) autorizan con
  `(auth.jwt() -> 'app_metadata' ->> 'account_id')` y `->> 'role'` — cero uso
  de `private.user_is_member`/`private.get_user_role`. Contraste: las policies
  de `documents`/`projects` (tablas Postgres, no Storage) sí usan
  `private.user_is_member(account_id, (SELECT auth.uid()))` en vivo
  (`supabase/schemas/public.sql:1889-1901`). No existe ningún mecanismo que
  invalide sesiones al remover/degradar un miembro.
- **SEC-002 — `startCheckout` autoriza solo con JWT.** `getActiveAccountRole()`
  (`src/lib/active-account.ts:12-16`) lee exclusivamente
  `data.claims.app_metadata.role` — sin RPC, sin DB. `startCheckout()`
  (`src/app/[locale]/dashboard/billing/actions.ts:89-90`) usa
  `canManageBilling(role)` sobre ese valor directamente, y llama al provider de
  pago real sin ninguna revalidación en vivo.
  **Acotado, no generalizado:** `cancelSubscription()` en el mismo archivo SÍ
  está protegido — pasa por `get_billing_overview` →
  `PERFORM private.assert_account_admin(p_account_id)`
  (`supabase/schemas/public.sql:494`), que usa
  `private.get_user_role(p_account_id, (SELECT auth.uid()))` — membership live.
  El gap es específicamente `startCheckout`, confirmado por lectura, no por
  generalización del hallazgo.
- **AUTH-001 — `accept_invitation()` no valida el email.** Función completa
  leída en `supabase/schemas/public.sql:77-120`: hashea el token, busca por
  `token_hash + status='pending' + expires_at > now()`, inserta la membership.
  **En ningún punto compara `v_invitation.email` (columna real, `NOT NULL`,
  `public.invitations.email` — `supabase/schemas/public.sql:1523`) contra el
  email del usuario autenticado.** Cualquier usuario autenticado que obtenga el
  token (reenvío accidental, link filtrado) puede canjearlo con el rol que sea.

## Design decisions

### 1. El JWT deja de ser autoridad para cualquier operación sensible; es solo UI/optimización

Regla única para todo el codebase, no solo los 3 hallazgos de arriba: `role`/
`account_id` del JWT sirven para decidir qué renderizar (evitar un flash de UI
incorrecta), nunca para autorizar una mutación, un acceso a Storage, o un
efecto externo (Stripe/MercadoPago/Resend). La autorización real siempre pasa
por una consulta a `accounts_memberships` en el momento de la acción.

### 2. Un solo helper para toda revalidación de rol — no un patrón repetido por call site

`private.get_user_role`/`assert_account_admin` ya existen en Postgres pero no
son invocables directamente desde TS (schema `private` no expuesto vía
PostgREST). Se crea:

```sql
CREATE OR REPLACE FUNCTION public.get_my_account_role(p_account_id uuid)
RETURNS public.membership_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN private.get_user_role(p_account_id, (SELECT auth.uid()));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_account_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_account_role(uuid) TO authenticated;
```

Y el wrapper TS único, `requireAccountRole`, en `src/lib/active-account.ts`:

```ts
export async function requireAccountRole(
  accountId: string,
  allowedRoles: readonly MembershipRole[],
): Promise<void> {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc('get_my_account_role', {
    p_account_id: accountId,
  });
  if (error || !role || !allowedRoles.includes(role)) {
    throw new Error('not_authorized');
  }
}
```

Todo call site sensible (`startCheckout`, y cualquier operación futura contra
un proveedor externo) llama `await requireAccountRole(accountId, ADMIN_ROLES)`
antes de actuar — nunca `canManageBilling(getActiveAccountRole())` a secas.

### 3. Storage RLS: mismo patrón que las tablas Postgres, no uno nuevo

Las policies nuevas reemplazan `auth.jwt() -> 'app_metadata' ->> ...` por
`private.user_is_member`/`private.get_user_role` contra
`(storage.foldername(name))[1]::uuid` como `account_id` — exactamente el
criterio que `documents`/`projects` (tablas) ya usan. No se inventa un
mecanismo distinto para Storage.

### 4. Revocación/refresco de sesión: fuera de alcance de este plan, documentado como decisión

Supabase no ofrece revocación instantánea de access tokens sin infraestructura
adicional (fuerza `admin.signOut` + que el cliente detecte el 401 y
refresque). Implementarlo agregaría alcance no acotado a este plan. La
mitigación de este plan (revalidar contra DB en cada acción sensible) ya
cumple el Definition of Done sin depender de revocación — se documenta la
ventana de `jwt_expiry` como riesgo aceptado y conocido, no se cierra con
revocación en este plan.

## Tabla priorizada

| #   | PR                                   | Prioridad | Depende de | Esfuerzo | Por qué ahí                                                                           |
| --- | ------------------------------------ | :-------: | :--------: | :------: | ------------------------------------------------------------------------------------- |
| 1   | `fix/storage-rls-live-membership`    |  **P0**   |     —      |    M     | El hallazgo con mayor superficie — dos buckets, 8 policies                            |
| 2   | `fix/checkout-authz-live-membership` |  **P0**   |     —      |    S     | `requireAccountRole` es la base que P1 también va a reusar                            |
| 3   | `fix/invitation-email-binding`       |  **P0**   |     —      |    S     | Account takeover B2B trivial, sin herramientas                                        |
| 4   | `test/tenant-isolation-regression`   |  **P0**   |   1,2,3    |    M     | Cierra el Definition of Done — prueba que cada fix realmente cambia el comportamiento |

PRs 1, 2 y 3 corrigen superficies funcionalmente independientes. La prueba
compuesta de PR 4 depende de los tres, pero su cobertura no se difiere hasta el
final: cada fix empieza con su prueba roja observada y conserva esa prueba como
regresión.

### Corrección de secuencia TDD (2026-08-21)

El texto original dejaba la primera escritura de pruebas para PR 4. Eso no
cumple el contrato TDD del repositorio: una prueba creada después del fix no
demuestra que habría detectado el defecto. Desde esta corrección:

1. PR 1 crea `supabase/tests/database/32_tenant_isolation_regression.test.sql`
   con los casos de Storage, los ejecuta en rojo sobre `main` y recién después
   agrega la migración.
2. PR 2 añade el caso Vitest de checkout al archivo de actions existente, lo
   observa rojo y después agrega la revalidación viva.
3. PR 3 amplía el archivo pgTAP 32 con el caso de email de invitación, también
   rojo antes de la migración. Por compartir ese archivo con PR 1, debe basarse
   en PR 1 ya mergeado o rebasarse antes de mergear.
4. PR 4 conserva su rol de aceptación integrada: ejecuta todos los casos,
   comprueba que cada reversión individual vuelva a rojo y añade solamente
   cualquier caso cruzado que aún falte. No es el primer lugar donde se prueba
   una vulnerabilidad.

---

## PR 1 — `fix/storage-rls-live-membership`

**Problema.** 8 policies de `storage.objects` (documents: insert/select/delete/
update; org-assets: insert/update/delete/select) autorizan contra
`auth.jwt() -> 'app_metadata'`, vigente hasta 1h después de que la membership
real cambió en `accounts_memberships`.

**Ejecución.**

1. Migración nueva `supabase/migrations/<timestamp>_storage_rls_live_membership.sql`
   que hace `DROP POLICY` de las 8 policies existentes y las recrea:
   - `documents_insert_editor`, `documents_select_member`,
     `documents_delete_own_or_admin`, `documents_update_own_or_admin`.
   - `org_assets_insert_admin`, `org_assets_update_admin`,
     `org_assets_delete_admin`, `org_assets_select_member`.
   - Reemplazar `(auth.jwt() -> 'app_metadata' ->> 'account_id')` por
     `private.user_is_member(((storage.foldername(name))[1])::uuid, (SELECT auth.uid()))`
     (SELECT/INSERT propios) y por
     `private.get_user_role(((storage.foldername(name))[1])::uuid, (SELECT auth.uid())) IN ('admin','owner')`
     donde hoy se compara `->> 'role'`.
   - Mantener intacta la matriz RBAC actual (viewer solo lectura, member
     escritura propia, admin/owner según cada policy) — este PR corrige la
     fuente de verdad del rol, no cambia quién puede qué.
2. No hay espejo en `supabase/schemas/` para policies de `storage.objects`
   (no es una tabla propia del proyecto — `alter policy`/policies de Storage
   son un caveat conocido de `supabase-postgres-best-practices`, no capturado
   por diff declarativo). Confirmar esto sigue siendo así al ejecutar; si el
   patrón del proyecto cambió, replicar igual que `public.sql`.
3. `pnpm supa:reset` local, verificar que sube/lee/borra sigue funcionando
   para cada rol antes de tocar tests.

**Acceptance criteria.**

- Ningún `CREATE POLICY` de `storage.objects` para `documents`/`org-assets`
  contiene `app_metadata` tras este PR.
- Un usuario removido de la cuenta pierde SELECT/INSERT/UPDATE/DELETE sobre
  sus buckets en la misma sesión de Postgres donde se verificó la membership
  (sin necesidad de nuevo JWT) — cubierto por los tests de PR 4.

---

## PR 2 — `fix/checkout-authz-live-membership`

**Problema.** `startCheckout()` autoriza con `getActiveAccountRole()` (JWT
puro) y llama al provider de pago real sin revalidar contra DB.

**Ejecución.**

1. Migración `supabase/migrations/<timestamp>_get_my_account_role.sql` +
   espejo en `supabase/schemas/public.sql` — crear
   `public.get_my_account_role(p_account_id uuid)` (ver Design decision 2).
2. `src/lib/active-account.ts`: agregar `requireAccountRole(accountId,
allowedRoles)` (firma exacta en Design decision 2).
3. `src/app/[locale]/dashboard/billing/actions.ts:89-90`: reemplazar
   ```ts
   const role = await getActiveAccountRole();
   if (!canManageBilling(role)) return { data: null, error: 'not_authorized' };
   ```
   por
   ```ts
   try {
     await requireAccountRole(accountId, ADMIN_ROLES);
   } catch {
     return { data: null, error: 'not_authorized' };
   }
   ```
4. Auditar el resto de `billing/actions.ts` y cualquier otra Server Action que
   dispare un efecto externo (Resend, futuros providers) — mismo patrón donde
   corresponda. `cancelSubscription` ya está protegido vía
   `get_billing_overview` (no tocar, evitar doble capa redundante).

**Acceptance criteria.**

- `startCheckout` no compila ni ejecuta sin pasar por
  `requireAccountRole`/una consulta equivalente a DB.
- Un admin removido de la cuenta no puede iniciar un checkout real contra
  Stripe/MercadoPago aunque conserve un JWT vigente — cubierto por PR 4.

---

## PR 3 — `fix/invitation-email-binding`

**Problema.** `accept_invitation()` nunca compara `invitation.email` contra el
email del usuario autenticado.

**Ejecución.**

1. Migración `supabase/migrations/<timestamp>_invitation_email_binding.sql` +
   espejo en `supabase/schemas/public.sql:77-120`. Dentro de
   `accept_invitation`, tras encontrar `v_invitation` y antes del `INSERT`:
   ```sql
   IF lower(btrim((SELECT email FROM auth.users WHERE id = v_user_id)))
      <> lower(btrim(v_invitation.email)) THEN
     RAISE EXCEPTION 'Invalid or expired invitation';
   END IF;
   ```
   Mismo mensaje de error que el caso "token no encontrado/expirado" —
   **no** filtrar "el email no coincide" como mensaje distinto (evita que un
   atacante confirme que un token es válido pero para otro destinatario).
2. Normalizar ambos lados (`lower(btrim(...))`) — el email en `auth.users`
   puede diferir en capitalización del que se guardó en `invitations.email`
   al invitar.

**Acceptance criteria.**

- Usuario B autenticado con un token emitido para `alice@empresa.com` recibe
  el mismo error genérico que un token inválido — no entra a la cuenta.
- El flujo normal (A invitado, A acepta con su propia sesión) sigue
  funcionando sin fricción nueva — cubierto por
  `supabase/tests/database/28_invitation_flow.test.sql` existente + los casos
  nuevos de PR 4.

---

## PR 4 — `test/tenant-isolation-regression`

**Problema.** Ninguno de los tres bugs de arriba tenía un test que falle sobre
`main` — es la condición explícita del Definition of Done de este plan. Tras la
corrección TDD anterior, los casos se introducen en rojo dentro de PR 1, 2 y 3;
este PR los integra y prueba su resistencia a regresiones.

**Ejecución.** El archivo pgTAP
`supabase/tests/database/32_tenant_isolation_regression.test.sql` se crea en
PR 1 (siguiente número tras `31_list_team_members_invitation_id.test.sql`) y
se amplía en PR 3; este PR lo ejecuta completo junto al test TS de
`startCheckout`, casos mínimos:

1. Usuario removido de una cuenta (`DELETE FROM accounts_memberships`) intenta
   `SELECT`/`INSERT` sobre `storage.objects` de esa cuenta simulando el JWT
   viejo (`set_config('request.jwt.claims', ...)` con `account_id`/`role`
   del estado anterior) — debe fallar.
2. Admin degradado a `member` intenta `INSERT`/`DELETE` sobre `org-assets` con
   el JWT que aún dice `role: admin` — debe fallar.
3. Usuario A autenticado intenta `accept_invitation(token_de_B)` — debe
   fallar con el mismo error que un token inválido.
4. Cross-tenant: usuario de cuenta X intenta leer/escribir Storage de cuenta Y
   manipulando el path directamente — debe fallar independientemente del JWT.
5. `viewer` intenta cualquier mutación ya cubierta por la matriz RBAC de
   Plan 009 — regresión de que este trabajo no la rompió.

Para `startCheckout` (PR 2), el equivalente vive en un test TS/vitest sobre
`billing/actions.ts` (mock de `requireAccountRole` lanzando `not_authorized`,
verificar que `startCheckout` nunca llama a `provider.createCheckout`) — no
un E2E completo, ya que eso requeriría credenciales reales de Stripe/MP
(alcance de Plan 011).

**Acceptance criteria — Definition of Done de todo el plan.**

- Los 5 casos pgTAP + el test de `startCheckout` existen, fallan si se
  revierte cualquiera de los PR 1-3 individualmente, y pasan con los tres
  aplicados.
- Después de remover una membership, el usuario pierde acceso efectivo a DB,
  Storage y checkout **en la misma sesión de Postgres/misma request** — sin
  esperar expiración de JWT.
- Gates existentes sin regresión: `pnpm typecheck`, `pnpm lint`,
  `pnpm supa:test` (274+ pgTAP), `pnpm test`, CI completo (CodeQL, Gitleaks,
  E2E) en verde.
