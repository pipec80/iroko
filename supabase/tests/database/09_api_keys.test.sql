-- pgTAP test: api_keys (F2-2D) — RPCs gated a owner/admin, almacenamiento
-- hash-only, verify_api_key respeta revocación, y la tabla + verify_api_key
-- son invisibles/inejecutables para authenticated.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(10);

-- ── Seed: owner (0811) y member (0812) en el team 0910 ──────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_confirmed_at, recovery_token, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000811', 'apikeys-owner@example.com',
   '{"given_name":"Owner","family_name":"A"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000812', 'apikeys-member@example.com',
   '{"given_name":"Member","family_name":"B"}'::jsonb, now(), now(), '', now(), '',
   'authenticated', 'authenticated');

INSERT INTO public.accounts (id, type, name, slug, created_by)
VALUES ('00000000-0000-0000-0000-000000000910', 'team', 'Team ApiKeys', 'team-apikeys',
        '00000000-0000-0000-0000-000000000811');

INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000910', '00000000-0000-0000-0000-000000000811', 'owner'),
  ('00000000-0000-0000-0000-000000000910', '00000000-0000-0000-0000-000000000812', 'member');

-- ── 1. Member no puede crear (la autorización lee auth.uid() de los claims) ──
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000812', 'role', 'authenticated')::text,
  true
);
SELECT throws_ok(
  $$SELECT * FROM public.create_api_key('00000000-0000-0000-0000-000000000910', 'nope')$$,
  'not_authorized',
  'member no puede crear API keys'
);

-- ── 2-3. Como rol authenticated: ni SELECT directo ni EXECUTE de verify ─────
SET LOCAL role authenticated;
SELECT throws_like(
  $$SELECT * FROM public.api_keys$$,
  '%permission denied%',
  'authenticated no puede leer public.api_keys directamente'
);
RESET role;

-- Chequeo por metadata (ejecutar la función como authenticated para probar el
-- ACL segfaultea el backend con supautils — verificado en local).
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.verify_api_key(text)', 'EXECUTE')
  AND has_function_privilege('service_role', 'public.verify_api_key(text)', 'EXECUTE'),
  'verify_api_key es ejecutable solo por service_role'
);

-- ── 4-6. Owner crea, lista, y la expiración en el pasado se rechaza ─────────
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000811', 'role', 'authenticated')::text,
  true
);

CREATE TEMP TABLE created AS
SELECT * FROM public.create_api_key('00000000-0000-0000-0000-000000000910', 'ci key');

SELECT ok(
  (SELECT key LIKE 'irk\_%' ESCAPE '\' FROM created),
  'la clave devuelta tiene prefijo irk_'
);

SELECT is(
  (SELECT count(*)::int FROM public.list_api_keys('00000000-0000-0000-0000-000000000910')),
  1,
  'list_api_keys devuelve la clave creada'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_api_key('00000000-0000-0000-0000-000000000910', 'bad', now() - interval '1 day')$$,
  'invalid_expiry',
  'expiración en el pasado es rechazada'
);

-- ── 7-8. verify_api_key: hash válido → account_id; hash desconocido → NULL ──
SELECT is(
  public.verify_api_key((SELECT encode(extensions.digest(key, 'sha256'), 'hex') FROM created)),
  '00000000-0000-0000-0000-000000000910'::uuid,
  'verify_api_key devuelve el account_id para un hash válido'
);

SELECT is(
  public.verify_api_key('deadbeef'),
  NULL,
  'hash inexistente devuelve NULL'
);

-- ── 9-10. Revocada deja de validar; el uso válido actualizó last_used_at ────
SELECT public.revoke_api_key((SELECT id FROM created));

SELECT is(
  public.verify_api_key((SELECT encode(extensions.digest(key, 'sha256'), 'hex') FROM created)),
  NULL,
  'clave revocada devuelve NULL'
);

SELECT ok(
  (SELECT k.last_used_at IS NOT NULL FROM public.api_keys k
   WHERE k.id = (SELECT id FROM created)),
  'verify_api_key actualizó last_used_at en el uso válido'
);

SELECT * FROM finish();
ROLLBACK;
