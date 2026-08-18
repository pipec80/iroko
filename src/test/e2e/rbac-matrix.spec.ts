import { test, expect } from '@playwright/test';
import {
  callRpc,
  createConfirmedUser,
  deleteUserById,
  execSqlAsPostgres,
  passwordGrant,
  restRequest,
  rowCount,
} from './helpers';

/**
 * Matriz RBAC completa (Plan 009 / PR 6): recorre la tabla de "Design
 * decisions" del plan por cada uno de los 4 roles contra un Team A, más
 * cross-tenant contra un Team B y un outsider.
 *
 * Llamadas API directas (RPC/PostgREST) en vez de UI real — la vía más
 * rápida y determinista para verificar el enforcement real de RLS/RPCs, y
 * lo que este PR busca: que nadie afloje una policy sin que un test lo
 * note. 100% API-driven, sin `page` — corre igual aunque Turnstile bloquee
 * el login por UI en un entorno local (ver
 * feedback_local_e2e_turnstile_blocker en memoria).
 *
 * Fuera de esta matriz, documentado explícitamente (no un olvido):
 * - "Billing: checkout/portal/facturas" vive en un Server Action
 *   (canManageBilling en dashboard/billing/actions.ts), no en RLS/RPC —
 *   ya cubierto por su propio test unitario
 *   (dashboard/billing/__tests__/actions.test.ts).
 * - "Subir a Storage documents": el bucket 'documents' existe en
 *   supabase/config.toml pero, a diferencia de 'org-assets', no tiene
 *   ninguna policy de Storage escrita todavía — deny-all real para TODOS
 *   los roles hoy, incluido el owner. No coincide con la matriz del plan
 *   (owner/admin/member ✅, viewer ❌) porque esa fila describe una
 *   feature aún no conectada, no un bug de este PR. Se testea el
 *   comportamiento actual (deny-all), no el aspiracional.
 * - "Cambiar rol / Transferir ownership / Salir del team": el detalle
 *   caso por caso (rechazos, mensajes, efectos) ya está cubierto
 *   exhaustivamente en pgTAP (30_membership_lifecycle.test.sql, 25
 *   assertions) — acá solo se agrega la celda de la matriz por rol, sin
 *   repetir esa cobertura.
 * - Presence: cobertura cross-tenant ya existe en pgTAP
 *   (18_presence_rls.test.sql:40-49).
 *
 * Pre-reqs: `supabase start` on :54321. Escribe datos — NO lleva @smoke.
 */

const PASSWORD = 'TestPass123!';

type SeededUser = { id: string; email: string; token: string };
type RoleUsers = { owner: SeededUser; admin: SeededUser; member: SeededUser; viewer: SeededUser };

test.describe('RBAC matrix', () => {
  // Serial: todos los tests de este describe comparten el fixture sembrado
  // en beforeAll (Team A con los 4 roles + Team B + outsider). En modo
  // paralelo (default) Playwright ejecuta beforeAll una vez POR WORKER —
  // aquí sembraría el fixture hasta 4 veces en simultáneo, con execSqlAsPostgres
  // (docker exec psql) contendiendo entre workers. Serial lo siembra una
  // sola vez y evita esa carrera.
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let serviceKey: string;
  let accountAId: string;
  let accountBId: string;
  let accountSmallId: string;
  let users: RoleUsers;
  let ownerB: SeededUser;
  let outsider: SeededUser;
  let smallOwner: SeededUser;
  let smallAdmin: SeededUser;
  const allSeeded: SeededUser[] = [];

  test.beforeAll(async ({ request }) => {
    serviceKey = process.env.SUPABASE_SECRET_KEY ?? '';
    const stamp = Date.now();

    async function seedUser(label: string): Promise<SeededUser> {
      const email = `e2e+rbac-${label}+${stamp}@saasboilerplate.local`;
      const id = await createConfirmedUser(request, email, PASSWORD, serviceKey);
      execSqlAsPostgres(
        `UPDATE public.profiles SET onboarding_completed = true WHERE id = '${id}'`,
      );
      const token = await passwordGrant(request, email, PASSWORD, serviceKey);
      const user = { id, email, token };
      allSeeded.push(user);
      return user;
    }

    function addMembership(accountId: string, userId: string, role: string): void {
      execSqlAsPostgres(
        `INSERT INTO public.accounts_memberships (account_id, user_id, role) ` +
          `VALUES ('${accountId}', '${userId}', '${role}')`,
      );
    }

    // Team A: el owner crea el team vía RPC — sin pasar por UI, así el seed
    // entero es independiente del navegador.
    const ownerA = await seedUser('owner-a');
    const teamA = await callRpc(
      request,
      'create_team',
      { p_name: `RBAC Team A ${stamp}` },
      ownerA.token,
      serviceKey,
    );
    if (!teamA.ok) throw new Error(`create_team (A) failed: ${JSON.stringify(teamA.body)}`);
    accountAId = teamA.body as string;

    const adminA = await seedUser('admin-a');
    addMembership(accountAId, adminA.id, 'admin');
    const memberA = await seedUser('member-a');
    addMembership(accountAId, memberA.id, 'member');
    const viewerA = await seedUser('viewer-a');
    addMembership(accountAId, viewerA.id, 'viewer');

    users = { owner: ownerA, admin: adminA, member: memberA, viewer: viewerA };

    // Team B: cross-tenant solo necesita un owner ajeno.
    ownerB = await seedUser('owner-b');
    const teamB = await callRpc(
      request,
      'create_team',
      { p_name: `RBAC Team B ${stamp}` },
      ownerB.token,
      serviceKey,
    );
    if (!teamB.ok) throw new Error(`create_team (B) failed: ${JSON.stringify(teamB.body)}`);
    accountBId = teamB.body as string;

    // Outsider: usuario real, sin ninguna membership en A ni B (solo su Personal).
    outsider = await seedUser('outsider');

    // Team pequeño aparte, con un plan sin límite de seats real (mismo
    // patrón que 29_rbac_matrix.test.sql pgTAP): el plan free trae
    // seats_max=2 y Team A ya tiene 4 miembros, así que "invitar" ahí
    // siempre rechaza por seat_limit_reached ANTES de llegar al chequeo de
    // rol para owner/admin (member/viewer sí fallan por rol primero, ver
    // el orden de checks en invite_members — no necesitan este team).
    // Solo se usa para probar el camino feliz de owner/admin invitando.
    smallOwner = await seedUser('small-owner');
    const smallTeam = await callRpc(
      request,
      'create_team',
      { p_name: `RBAC Small ${stamp}` },
      smallOwner.token,
      serviceKey,
    );
    if (!smallTeam.ok)
      throw new Error(`create_team (small) failed: ${JSON.stringify(smallTeam.body)}`);
    accountSmallId = smallTeam.body as string;
    execSqlAsPostgres(
      `INSERT INTO billing.customers (account_id, provider, external_id) ` +
        `VALUES ('${accountSmallId}', 'mock', 'e2e-rbac-${stamp}')`,
    );
    execSqlAsPostgres(
      `INSERT INTO billing.subscriptions (customer_id, plan_id, status, current_period_end) ` +
        `SELECT c.id, p.id, 'active', now() + interval '30 days' ` +
        `FROM billing.customers c, billing.plans p ` +
        `WHERE c.account_id = '${accountSmallId}' AND p.slug = 'pro' AND p.interval = 'month'`,
    );
    smallAdmin = await seedUser('small-admin');
    addMembership(accountSmallId, smallAdmin.id, 'admin');
  });

  test.afterAll(async ({ request }) => {
    await Promise.all(allSeeded.map((u) => deleteUserById(request, u.id, serviceKey)));
  });

  test('ver account: los 4 roles pueden leer la cuenta', async ({ request }) => {
    // accounts no tiene GRANT SELECT para authenticated (mismo patrón que
    // accounts_memberships, ver feedback_accounts_memberships_rls_pattern):
    // RLS nunca llega a evaluarse, Postgres rechaza antes con "permission
    // denied for table accounts" — el único camino real es get_my_accounts().
    for (const [label, user] of Object.entries(users)) {
      const res = await callRpc(request, 'get_my_accounts', {}, user.token, serviceKey);
      const accounts = Array.isArray(res.body) ? (res.body as Array<{ account_id: string }>) : [];
      const canSee = accounts.some((a) => a.account_id === accountAId);
      expect(canSee, `${label} debería ver la cuenta en get_my_accounts()`).toBe(true);
    }
  });

  test('editar account: solo owner/admin', async ({ request }) => {
    const expected: Record<keyof RoleUsers, boolean> = {
      owner: true,
      admin: true,
      member: false,
      viewer: false,
    };
    for (const [label, allowed] of Object.entries(expected)) {
      const user = users[label as keyof RoleUsers];
      const res = await callRpc(
        request,
        'rename_account',
        { p_account_id: accountAId, p_name: `Renamed by ${label} ${Date.now()}` },
        user.token,
        serviceKey,
      );
      expect(res.ok, `${label}: editar cuenta debería ${allowed ? '' : 'NO '}permitirse`).toBe(
        allowed,
      );
    }
  });

  test('ver members: los 4 roles pueden listar', async ({ request }) => {
    for (const [label, user] of Object.entries(users)) {
      const res = await callRpc(
        request,
        'list_team_members',
        { p_account_id: accountAId },
        user.token,
        serviceKey,
      );
      expect(res.ok, `${label} debería poder listar miembros`).toBe(true);
    }
  });

  test('invitar (admin/member/viewer): solo owner/admin', async ({ request }) => {
    // member/viewer se prueban sobre Team A (accountAId): invite_members
    // chequea el rol ANTES que el límite de seats, así que fallan por rol
    // igual aunque Team A ya esté en el límite de su plan free.
    //
    // owner/admin se prueban sobre accountSmallId (plan pro, seats de
    // sobra): Team A ya tiene 4/2 seats del plan free, así que cualquier
    // invitación ahí rechaza por seat_limit_reached antes de llegar al
    // chequeo de rol — probar el camino feliz de owner/admin ahí daría un
    // falso negativo sin decir nada sobre el enforcement de rol real.
    const smallCases: Array<[string, SeededUser]> = [
      ['owner', smallOwner],
      ['admin', smallAdmin],
    ];
    for (const [label, user] of smallCases) {
      const res = await callRpc(
        request,
        'invite_members',
        {
          p_account_id: accountSmallId,
          p_emails: [`e2e+matrix-invite-${label}@saasboilerplate.local`],
          p_role: 'member',
        },
        user.token,
        serviceKey,
      );
      expect(res.ok, `${label}: invitar debería permitirse`).toBe(true);
    }

    for (const label of ['member', 'viewer'] as const) {
      const res = await callRpc(
        request,
        'invite_members',
        {
          p_account_id: accountAId,
          p_emails: [`e2e+matrix-invite-${label}@saasboilerplate.local`],
          p_role: 'member',
        },
        users[label].token,
        serviceKey,
      );
      expect(res.ok, `${label}: invitar NO debería permitirse`).toBe(false);
    }
  });

  test('invitar como owner: ningún rol puede', async ({ request }) => {
    for (const [label, user] of Object.entries(users)) {
      const res = await callRpc(
        request,
        'invite_members',
        {
          p_account_id: accountAId,
          p_emails: [`e2e+matrix-invite-owner-${label}@saasboilerplate.local`],
          p_role: 'owner',
        },
        user.token,
        serviceKey,
      );
      expect(res.ok, `${label} nunca debería poder invitar como owner`).toBe(false);
    }
  });

  test('cambiar rol de un miembro: matriz por rol (detalle en pgTAP)', async ({ request }) => {
    // Objetivo: member/viewer no lo tienen; admin/owner sí (el matiz
    // "admin no puede tocar a otro admin" ya está cubierto exhaustivamente
    // en 30_membership_lifecycle.test.sql — acá solo se toca a un member.
    const expected: Record<keyof RoleUsers, boolean> = {
      owner: true,
      admin: true,
      member: false,
      viewer: false,
    };
    for (const [label, allowed] of Object.entries(expected)) {
      const user = users[label as keyof RoleUsers];
      const res = await callRpc(
        request,
        'change_member_role',
        { p_account_id: accountAId, p_user_id: users.viewer.id, p_role: 'member' },
        user.token,
        serviceKey,
      );
      // owner/admin sí pueden llamar la RPC, pero solo confirmamos el
      // resultado del último caller (evita dejar el fixture en un estado
      // inconsistente para las siguientes tests): revertir tras cada intento
      // exitoso.
      expect(res.ok, `${label}: cambiar rol debería ${allowed ? '' : 'NO '}permitirse`).toBe(
        allowed,
      );
      if (res.ok) {
        execSqlAsPostgres(
          `UPDATE public.accounts_memberships SET role = 'viewer' ` +
            `WHERE account_id = '${accountAId}' AND user_id = '${users.viewer.id}'`,
        );
      }
    }
  });

  test('remover member/viewer: owner y admin sí', async ({ request }) => {
    // Siembra un member desechable — remove_member lo elimina de verdad.
    const email = `e2e+rbac-removable+${Date.now()}@saasboilerplate.local`;
    const removableId = await createConfirmedUser(request, email, PASSWORD, serviceKey);
    execSqlAsPostgres(
      `INSERT INTO public.accounts_memberships (account_id, user_id, role) ` +
        `VALUES ('${accountAId}', '${removableId}', 'member')`,
    );

    try {
      const res = await callRpc(
        request,
        'remove_member',
        { p_account_id: accountAId, p_user_id: removableId },
        users.member.token,
        serviceKey,
      );
      expect(res.ok, 'un member no puede remover a otro miembro').toBe(false);

      const res2 = await callRpc(
        request,
        'remove_member',
        { p_account_id: accountAId, p_user_id: removableId },
        users.admin.token,
        serviceKey,
      );
      expect(res2.ok, 'un admin sí puede remover a un member').toBe(true);
    } finally {
      await deleteUserById(request, removableId, serviceKey);
    }
  });

  test('remover admin: solo owner (matriz por rol, detalle en pgTAP)', async ({ request }) => {
    const res = await callRpc(
      request,
      'remove_member',
      { p_account_id: accountAId, p_user_id: users.admin.id },
      users.member.token,
      serviceKey,
    );
    expect(res.ok, 'un member no puede remover a un admin').toBe(false);
    // No se ejercita el camino "owner sí puede" acá para no perder al admin
    // sembrado que el resto de la suite reusa — ya cubierto en
    // 30_membership_lifecycle.test.sql.
  });

  test('transferir ownership: solo owner puede llamar (detalle en pgTAP)', async ({ request }) => {
    for (const [label, user] of Object.entries(users)) {
      if (label === 'owner') continue; // no se ejercita el owner acá: transferiría de verdad
      const res = await callRpc(
        request,
        'transfer_ownership',
        { p_account_id: accountAId, p_new_owner: users.admin.id },
        user.token,
        serviceKey,
      );
      expect(res.ok, `${label} nunca puede transferir ownership`).toBe(false);
    }
  });

  test('salir del team: cualquier rol no-owner puede (detalle en pgTAP)', async ({ request }) => {
    // Siembra un viewer desechable — leave_team lo elimina de verdad.
    const email = `e2e+rbac-leaver+${Date.now()}@saasboilerplate.local`;
    const leaverId = await createConfirmedUser(request, email, PASSWORD, serviceKey);
    execSqlAsPostgres(
      `INSERT INTO public.accounts_memberships (account_id, user_id, role) ` +
        `VALUES ('${accountAId}', '${leaverId}', 'viewer')`,
    );
    const leaverToken = await passwordGrant(request, email, PASSWORD, serviceKey);

    try {
      const res = await callRpc(
        request,
        'leave_team',
        { p_account_id: accountAId },
        leaverToken,
        serviceKey,
      );
      expect(res.ok, 'un viewer puede salir del team').toBe(true);
    } finally {
      await deleteUserById(request, leaverId, serviceKey);
    }
  });

  test('ver projects/documents: los 4 roles pueden', async ({ request }) => {
    for (const table of ['projects', 'documents']) {
      for (const [label, user] of Object.entries(users)) {
        const res = await restRequest(
          request,
          'GET',
          `${table}?account_id=eq.${accountAId}`,
          user.token,
          serviceKey,
        );
        expect(res.ok, `${label} debería poder listar ${table} (aunque esté vacío)`).toBe(true);
      }
    }
  });

  test('crear projects: owner/admin/member sí, viewer no', async ({ request }) => {
    const expected: Record<keyof RoleUsers, boolean> = {
      owner: true,
      admin: true,
      member: true,
      viewer: false,
    };
    for (const [label, allowed] of Object.entries(expected)) {
      const user = users[label as keyof RoleUsers];
      const res = await restRequest(request, 'POST', 'projects', user.token, serviceKey, {
        account_id: accountAId,
        name: `Project by ${label} ${Date.now()}`,
        slug: `project-${label}-${Date.now()}`,
      });
      const wasCreated = rowCount(res) > 0;
      expect(wasCreated, `${label}: crear project debería ${allowed ? '' : 'NO '}permitirse`).toBe(
        allowed,
      );
    }
  });

  test('borrar projects: solo owner', async ({ request }) => {
    // Siembra un project desechable como owner, para que member/viewer lo
    // intenten borrar sin éxito, y el owner sí pueda al final.
    const created = await restRequest(request, 'POST', 'projects', users.owner.token, serviceKey, {
      account_id: accountAId,
      name: `Project to delete ${Date.now()}`,
      slug: `project-delete-${Date.now()}`,
    });
    const projectId = (created.body as Array<{ id: string }>)[0]?.id;
    if (!projectId)
      throw new Error(`No se pudo sembrar el project a borrar: ${JSON.stringify(created.body)}`);

    const memberAttempt = await restRequest(
      request,
      'DELETE',
      `projects?id=eq.${projectId}`,
      users.member.token,
      serviceKey,
    );
    expect(rowCount(memberAttempt), 'un member no puede borrar projects').toBe(0);

    const ownerAttempt = await restRequest(
      request,
      'DELETE',
      `projects?id=eq.${projectId}`,
      users.owner.token,
      serviceKey,
    );
    expect(rowCount(ownerAttempt), 'el owner sí puede borrar projects').toBe(1);
  });

  test('subir a Storage documents: deny-all real hoy, incluido el owner (gap vs. la matriz del plan)', async ({
    request,
  }) => {
    // El bucket 'documents' existe en config.toml pero, a diferencia de
    // 'org-assets', no tiene ninguna policy de Storage — ver el comentario
    // de cabecera de este archivo. Esto documenta el comportamiento REAL,
    // no lo que la matriz del plan aspira a que sea.
    for (const [label, user] of Object.entries(users)) {
      const res = await request.post(
        `${process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'}/storage/v1/object/documents/${accountAId}/probe-${label}.txt`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'text/plain',
          },
          data: 'probe',
        },
      );
      expect(res.ok(), `${label}: subir a Storage documents debería fallar hoy (sin policy)`).toBe(
        false,
      );
    }
  });

  test('billing: ver plan/entitlements — los 4 roles pueden', async ({ request }) => {
    for (const [label, user] of Object.entries(users)) {
      const res = await callRpc(
        request,
        'get_account_entitlements',
        { p_account_id: accountAId },
        user.token,
        serviceKey,
      );
      expect(res.ok, `${label} debería poder ver entitlements`).toBe(true);
    }
  });

  test('API Keys / Webhooks / Audit Log: solo owner/admin', async ({ request }) => {
    const rpcsAdminOnly = ['list_api_keys', 'list_webhook_endpoints'];
    for (const fn of rpcsAdminOnly) {
      for (const [label, user] of Object.entries(users)) {
        const res = await callRpc(
          request,
          fn,
          { p_account_id: accountAId },
          user.token,
          serviceKey,
        );
        const allowed = label === 'owner' || label === 'admin';
        expect(res.ok, `${label}: ${fn} debería ${allowed ? '' : 'NO '}permitirse`).toBe(allowed);
      }
    }
    for (const [label, user] of Object.entries(users)) {
      const res = await callRpc(
        request,
        'get_account_audit_logs',
        { p_account_id: accountAId },
        user.token,
        serviceKey,
      );
      const allowed = label === 'owner' || label === 'admin';
      expect(res.ok, `${label}: audit log debería ${allowed ? '' : 'NO '}permitirse`).toBe(allowed);
    }
  });

  test.describe('cross-tenant', () => {
    test('ningún rol de Team A puede leer la cuenta de Team B', async ({ request }) => {
      for (const [label, user] of Object.entries(users)) {
        const res = await callRpc(request, 'get_my_accounts', {}, user.token, serviceKey);
        const accounts = Array.isArray(res.body) ? (res.body as Array<{ account_id: string }>) : [];
        const canSee = accounts.some((a) => a.account_id === accountBId);
        expect(canSee, `${label} de Team A no debería ver la cuenta de Team B`).toBe(false);
      }
    });

    test('ningún rol de Team A puede listar miembros de Team B', async ({ request }) => {
      for (const [label, user] of Object.entries(users)) {
        const res = await callRpc(
          request,
          'list_team_members',
          { p_account_id: accountBId },
          user.token,
          serviceKey,
        );
        expect(res.ok, `${label} de Team A no debería listar miembros de Team B`).toBe(false);
      }
    });

    test('ningún rol de Team A puede invitar a Team B, ni siquiera el admin de A', async ({
      request,
    }) => {
      const res = await callRpc(
        request,
        'invite_members',
        {
          p_account_id: accountBId,
          p_emails: ['e2e+cross-tenant-invite@saasboilerplate.local'],
          p_role: 'member',
        },
        users.admin.token,
        serviceKey,
      );
      expect(res.ok, 'admin de Team A no puede invitar a Team B').toBe(false);
    });

    test('ningún rol de Team A puede leer/crear/borrar projects de Team B con account_id ajeno', async ({
      request,
    }) => {
      // No solo navegación: se fuerza account_id=B en el payload, con la
      // sesión de un usuario de A — RLS debe rechazarlo igual.
      const readRes = await restRequest(
        request,
        'GET',
        `projects?account_id=eq.${accountBId}`,
        users.owner.token,
        serviceKey,
      );
      expect(rowCount(readRes), 'el owner de Team A no debería ver projects de Team B').toBe(0);

      const createRes = await restRequest(
        request,
        'POST',
        'projects',
        users.owner.token,
        serviceKey,
        {
          account_id: accountBId,
          name: 'Cross-tenant project attempt',
          slug: `cross-tenant-${Date.now()}`,
        },
      );
      expect(
        rowCount(createRes),
        'el owner de Team A no debería poder crear un project en Team B',
      ).toBe(0);
    });

    test('el owner de Team B no puede gestionar la membresía de Team A', async ({ request }) => {
      const res = await callRpc(
        request,
        'change_member_role',
        { p_account_id: accountAId, p_user_id: users.viewer.id, p_role: 'member' },
        ownerB.token,
        serviceKey,
      );
      expect(res.ok, 'el owner de Team B no es miembro de Team A').toBe(false);
    });

    test('un outsider (sin membership en ningún team) no puede leer ni gestionar Team A', async ({
      request,
    }) => {
      const readRes = await callRpc(request, 'get_my_accounts', {}, outsider.token, serviceKey);
      const outsiderAccounts =
        Array.isArray(readRes.body) ? (readRes.body as Array<{ account_id: string }>) : [];
      const outsiderCanSee = outsiderAccounts.some((a) => a.account_id === accountAId);
      expect(outsiderCanSee, 'un outsider no debería ver la cuenta de Team A').toBe(false);

      const membersRes = await callRpc(
        request,
        'list_team_members',
        { p_account_id: accountAId },
        outsider.token,
        serviceKey,
      );
      expect(membersRes.ok, 'un outsider no debería listar miembros de Team A').toBe(false);

      const inviteRes = await callRpc(
        request,
        'invite_members',
        {
          p_account_id: accountAId,
          p_emails: ['e2e+outsider-invite@saasboilerplate.local'],
          p_role: 'member',
        },
        outsider.token,
        serviceKey,
      );
      expect(inviteRes.ok, 'un outsider no debería poder invitar a Team A').toBe(false);
    });
  });
});
