-- Plan 014 T1: live membership RBAC, transactional fixtures only.
-- Runtime RED/GREEN requires an explicitly identified disposable database.
BEGIN;
-- Transactional SQL fixture needs Storage direct DELETE for seeds and RLS assertions.
SET LOCAL storage.allow_delete_query = 'true';
SELECT plan(240);

INSERT INTO auth.users (id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role) VALUES
('00000000-0000-0000-0000-000000004301','robot-4301@example.com','{"given_name":"Robot","family_name":"RBAC"}',now(),now(),'',now(),'','authenticated','authenticated'),
('00000000-0000-0000-0000-000000004302','robot-4302@example.com','{"given_name":"Robot","family_name":"RBAC"}',now(),now(),'',now(),'','authenticated','authenticated'),
('00000000-0000-0000-0000-000000004303','robot-4303@example.com','{"given_name":"Robot","family_name":"RBAC"}',now(),now(),'',now(),'','authenticated','authenticated'),
('00000000-0000-0000-0000-000000004304','robot-4304@example.com','{"given_name":"Robot","family_name":"RBAC"}',now(),now(),'',now(),'','authenticated','authenticated'),
('00000000-0000-0000-0000-000000004305','robot-4305@example.com','{"given_name":"Robot","family_name":"RBAC"}',now(),now(),'',now(),'','authenticated','authenticated'),
('00000000-0000-0000-0000-000000004306','robot-4306@example.com','{"given_name":"Robot","family_name":"RBAC"}',now(),now(),'',now(),'','authenticated','authenticated'),
('00000000-0000-0000-0000-000000004307','robot-4307@example.com','{"given_name":"Robot","family_name":"RBAC"}',now(),now(),'',now(),'','authenticated','authenticated');
INSERT INTO public.accounts (id,type,name,slug,created_by) VALUES ('00000000-0000-0000-0000-000000004310','team','Robot A','robot-rbac-a','00000000-0000-0000-0000-000000004301'), ('00000000-0000-0000-0000-000000004311','team','Robot B','robot-rbac-b','00000000-0000-0000-0000-000000004305');
INSERT INTO public.accounts_memberships (account_id,user_id,role) VALUES
('00000000-0000-0000-0000-000000004310','00000000-0000-0000-0000-000000004301','owner'),
('00000000-0000-0000-0000-000000004310','00000000-0000-0000-0000-000000004302','admin'),
('00000000-0000-0000-0000-000000004310','00000000-0000-0000-0000-000000004303','member'),
('00000000-0000-0000-0000-000000004310','00000000-0000-0000-0000-000000004304','viewer'),
('00000000-0000-0000-0000-000000004311','00000000-0000-0000-0000-000000004305','owner'),
('00000000-0000-0000-0000-000000004310','00000000-0000-0000-0000-000000004306','member'),
('00000000-0000-0000-0000-000000004310','00000000-0000-0000-0000-000000004307','member');
DELETE FROM public.accounts_memberships WHERE account_id='00000000-0000-0000-0000-000000004310' AND user_id='00000000-0000-0000-0000-000000004306';
UPDATE public.accounts_memberships SET role='viewer' WHERE account_id='00000000-0000-0000-0000-000000004310' AND user_id='00000000-0000-0000-0000-000000004307';
CREATE FUNCTION pg_temp.act_as(p_user uuid,p_role text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',json_build_object('sub',p_user,'role',CASE WHEN p_user IS NULL THEN 'anon' ELSE 'authenticated' END,'app_metadata',json_build_object('account_id','00000000-0000-0000-0000-000000004310','role',p_role))::text,true);
END;
$$;

-- Actor: owner; the JWT deliberately retains member for revoked/stale users.
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '%/rbac-%';
INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'),('robot_configs','00000000-0000-0000-0000-000000004311/rbac-seed.xlsx');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004301'::uuid,'owner');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'owner read robot_routines');
SELECT lives_ok($test$INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General')$test$, 'owner insert robot_routines');
WITH affected AS (UPDATE public.robot_routines SET activity_type='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'owner update robot_routines row count');
WITH affected AS (DELETE FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'owner delete robot_routines row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'owner final robot_routines rows');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'owner preserves other tenant robot_routines');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'owner read robot_contacts');
SELECT lives_ok($test$INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123')$test$, 'owner insert robot_contacts');
WITH affected AS (UPDATE public.robot_contacts SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'owner update robot_contacts row count');
WITH affected AS (DELETE FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'owner delete robot_contacts row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'owner final robot_contacts rows');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'owner preserves other tenant robot_contacts');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'owner read robot_memories');
SELECT lives_ok($test$INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact')$test$, 'owner insert robot_memories');
WITH affected AS (UPDATE public.robot_memories SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'owner update robot_memories row count');
WITH affected AS (DELETE FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'owner delete robot_memories row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'owner final robot_memories rows');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'owner preserves other tenant robot_memories');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'), 1, 'owner read storage');
SELECT lives_ok($test$INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-new.xlsx')$test$, 'owner insert storage');
WITH affected AS (UPDATE storage.objects SET metadata='{"rbac":true}'::jsonb WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 1, 'owner update storage row count');
WITH affected AS (DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 1, 'owner delete storage row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '00000000-0000-0000-0000-000000004311/rbac-%'), 1, 'owner preserves other tenant storage');
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
SET LOCAL ROLE authenticated;
SELECT lives_ok($test$SELECT public.replace_robot_config('00000000-0000-0000-0000-000000004310', '[{"time":"09:00","activity_type":"RPC"}]', '[{"name":"RPC","phone":"456"}]', '[{"entity":"General","name":"RPC","key_fact":"Replaced"}]')$test$, 'owner replace RPC');
RESET ROLE;
SELECT is((SELECT activity_type FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'owner RPC effect robot_routines');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'owner RPC preserves other tenant robot_routines');
SELECT is((SELECT name FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'owner RPC effect robot_contacts');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'owner RPC preserves other tenant robot_contacts');
SELECT is((SELECT name FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'owner RPC effect robot_memories');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'owner RPC preserves other tenant robot_memories');

-- Actor: admin; the JWT deliberately retains member for revoked/stale users.
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '%/rbac-%';
INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'),('robot_configs','00000000-0000-0000-0000-000000004311/rbac-seed.xlsx');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004302'::uuid,'admin');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'admin read robot_routines');
SELECT lives_ok($test$INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General')$test$, 'admin insert robot_routines');
WITH affected AS (UPDATE public.robot_routines SET activity_type='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'admin update robot_routines row count');
WITH affected AS (DELETE FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'admin delete robot_routines row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 2, 'admin final robot_routines rows');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'admin preserves other tenant robot_routines');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'admin read robot_contacts');
SELECT lives_ok($test$INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123')$test$, 'admin insert robot_contacts');
WITH affected AS (UPDATE public.robot_contacts SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'admin update robot_contacts row count');
WITH affected AS (DELETE FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'admin delete robot_contacts row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 2, 'admin final robot_contacts rows');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'admin preserves other tenant robot_contacts');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'admin read robot_memories');
SELECT lives_ok($test$INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact')$test$, 'admin insert robot_memories');
WITH affected AS (UPDATE public.robot_memories SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'admin update robot_memories row count');
WITH affected AS (DELETE FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'admin delete robot_memories row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 2, 'admin final robot_memories rows');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'admin preserves other tenant robot_memories');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'), 1, 'admin read storage');
SELECT lives_ok($test$INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-new.xlsx')$test$, 'admin insert storage');
WITH affected AS (UPDATE storage.objects SET metadata='{"rbac":true}'::jsonb WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 1, 'admin update storage row count');
WITH affected AS (DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 1, 'admin delete storage row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '00000000-0000-0000-0000-000000004311/rbac-%'), 1, 'admin preserves other tenant storage');
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
SET LOCAL ROLE authenticated;
SELECT lives_ok($test$SELECT public.replace_robot_config('00000000-0000-0000-0000-000000004310', '[{"time":"09:00","activity_type":"RPC"}]', '[{"name":"RPC","phone":"456"}]', '[{"entity":"General","name":"RPC","key_fact":"Replaced"}]')$test$, 'admin replace RPC');
RESET ROLE;
SELECT is((SELECT activity_type FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'admin RPC effect robot_routines');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'admin RPC preserves other tenant robot_routines');
SELECT is((SELECT name FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'admin RPC effect robot_contacts');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'admin RPC preserves other tenant robot_contacts');
SELECT is((SELECT name FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'admin RPC effect robot_memories');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'admin RPC preserves other tenant robot_memories');

-- Actor: member; the JWT deliberately retains member for revoked/stale users.
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '%/rbac-%';
INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'),('robot_configs','00000000-0000-0000-0000-000000004311/rbac-seed.xlsx');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004303'::uuid,'member');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'member read robot_routines');
SELECT lives_ok($test$INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General')$test$, 'member insert robot_routines');
WITH affected AS (UPDATE public.robot_routines SET activity_type='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'member update robot_routines row count');
WITH affected AS (DELETE FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'member delete robot_routines row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 2, 'member final robot_routines rows');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'member preserves other tenant robot_routines');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'member read robot_contacts');
SELECT lives_ok($test$INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123')$test$, 'member insert robot_contacts');
WITH affected AS (UPDATE public.robot_contacts SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'member update robot_contacts row count');
WITH affected AS (DELETE FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'member delete robot_contacts row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 2, 'member final robot_contacts rows');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'member preserves other tenant robot_contacts');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'member read robot_memories');
SELECT lives_ok($test$INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact')$test$, 'member insert robot_memories');
WITH affected AS (UPDATE public.robot_memories SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 2, 'member update robot_memories row count');
WITH affected AS (DELETE FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'member delete robot_memories row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 2, 'member final robot_memories rows');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'member preserves other tenant robot_memories');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'), 1, 'member read storage');
SELECT lives_ok($test$INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-new.xlsx')$test$, 'member insert storage');
WITH affected AS (UPDATE storage.objects SET metadata='{"rbac":true}'::jsonb WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 1, 'member update storage row count');
WITH affected AS (DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 1, 'member delete storage row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '00000000-0000-0000-0000-000000004311/rbac-%'), 1, 'member preserves other tenant storage');
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
SET LOCAL ROLE authenticated;
SELECT lives_ok($test$SELECT public.replace_robot_config('00000000-0000-0000-0000-000000004310', '[{"time":"09:00","activity_type":"RPC"}]', '[{"name":"RPC","phone":"456"}]', '[{"entity":"General","name":"RPC","key_fact":"Replaced"}]')$test$, 'member replace RPC');
RESET ROLE;
SELECT is((SELECT activity_type FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'member RPC effect robot_routines');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'member RPC preserves other tenant robot_routines');
SELECT is((SELECT name FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'member RPC effect robot_contacts');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'member RPC preserves other tenant robot_contacts');
SELECT is((SELECT name FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 'RPC', 'member RPC effect robot_memories');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'member RPC preserves other tenant robot_memories');

-- Actor: viewer; the JWT deliberately retains member for revoked/stale users.
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '%/rbac-%';
INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'),('robot_configs','00000000-0000-0000-0000-000000004311/rbac-seed.xlsx');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004304'::uuid,'viewer');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'viewer read robot_routines');
SELECT throws_ok($test$INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General')$test$, '42501', NULL, 'viewer insert robot_routines');
WITH affected AS (UPDATE public.robot_routines SET activity_type='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'viewer update robot_routines row count');
WITH affected AS (DELETE FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'viewer delete robot_routines row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'viewer final robot_routines rows');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'viewer preserves other tenant robot_routines');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'viewer read robot_contacts');
SELECT throws_ok($test$INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123')$test$, '42501', NULL, 'viewer insert robot_contacts');
WITH affected AS (UPDATE public.robot_contacts SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'viewer update robot_contacts row count');
WITH affected AS (DELETE FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'viewer delete robot_contacts row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'viewer final robot_contacts rows');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'viewer preserves other tenant robot_contacts');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'viewer read robot_memories');
SELECT throws_ok($test$INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact')$test$, '42501', NULL, 'viewer insert robot_memories');
WITH affected AS (UPDATE public.robot_memories SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'viewer update robot_memories row count');
WITH affected AS (DELETE FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'viewer delete robot_memories row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'viewer final robot_memories rows');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'viewer preserves other tenant robot_memories');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'), 1, 'viewer read storage');
SELECT throws_ok($test$INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-new.xlsx')$test$, '42501', NULL, 'viewer insert storage');
WITH affected AS (UPDATE storage.objects SET metadata='{"rbac":true}'::jsonb WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'viewer update storage row count');
WITH affected AS (DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'viewer delete storage row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '00000000-0000-0000-0000-000000004311/rbac-%'), 1, 'viewer preserves other tenant storage');
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
SET LOCAL ROLE authenticated;
SELECT throws_ok($test$SELECT public.replace_robot_config('00000000-0000-0000-0000-000000004310', '[{"time":"09:00","activity_type":"RPC"}]', '[{"name":"RPC","phone":"456"}]', '[{"entity":"General","name":"RPC","key_fact":"Replaced"}]')$test$, '42501', 'not_authorized', 'viewer replace RPC');
RESET ROLE;
SELECT is((SELECT activity_type FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 'General', 'viewer RPC effect robot_routines');
SELECT is((SELECT name FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'viewer RPC effect robot_contacts');
SELECT is((SELECT name FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'viewer RPC effect robot_memories');

-- Actor: other tenant; the JWT deliberately retains member for revoked/stale users.
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '%/rbac-%';
INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'),('robot_configs','00000000-0000-0000-0000-000000004311/rbac-seed.xlsx');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004305'::uuid,'owner');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'other tenant read robot_routines');
SELECT throws_ok($test$INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General')$test$, '42501', NULL, 'other tenant insert robot_routines');
WITH affected AS (UPDATE public.robot_routines SET activity_type='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'other tenant update robot_routines row count');
WITH affected AS (DELETE FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'other tenant delete robot_routines row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'other tenant final robot_routines rows');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'other tenant preserves other tenant robot_routines');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'other tenant read robot_contacts');
SELECT throws_ok($test$INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123')$test$, '42501', NULL, 'other tenant insert robot_contacts');
WITH affected AS (UPDATE public.robot_contacts SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'other tenant update robot_contacts row count');
WITH affected AS (DELETE FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'other tenant delete robot_contacts row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'other tenant final robot_contacts rows');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'other tenant preserves other tenant robot_contacts');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'other tenant read robot_memories');
SELECT throws_ok($test$INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact')$test$, '42501', NULL, 'other tenant insert robot_memories');
WITH affected AS (UPDATE public.robot_memories SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'other tenant update robot_memories row count');
WITH affected AS (DELETE FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'other tenant delete robot_memories row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'other tenant final robot_memories rows');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'other tenant preserves other tenant robot_memories');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'), 0, 'other tenant read storage');
SELECT throws_ok($test$INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-new.xlsx')$test$, '42501', NULL, 'other tenant insert storage');
WITH affected AS (UPDATE storage.objects SET metadata='{"rbac":true}'::jsonb WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'other tenant update storage row count');
WITH affected AS (DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'other tenant delete storage row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '00000000-0000-0000-0000-000000004311/rbac-%'), 1, 'other tenant preserves other tenant storage');
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
SET LOCAL ROLE authenticated;
SELECT throws_ok($test$SELECT public.replace_robot_config('00000000-0000-0000-0000-000000004310', '[{"time":"09:00","activity_type":"RPC"}]', '[{"name":"RPC","phone":"456"}]', '[{"entity":"General","name":"RPC","key_fact":"Replaced"}]')$test$, '42501', 'not_authorized', 'other tenant replace RPC');
RESET ROLE;
SELECT is((SELECT activity_type FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 'General', 'other tenant RPC effect robot_routines');
SELECT is((SELECT name FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'other tenant RPC effect robot_contacts');
SELECT is((SELECT name FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'other tenant RPC effect robot_memories');

-- Actor: revoked; the JWT deliberately retains member for revoked/stale users.
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '%/rbac-%';
INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'),('robot_configs','00000000-0000-0000-0000-000000004311/rbac-seed.xlsx');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004306'::uuid,'member');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'revoked read robot_routines');
SELECT throws_ok($test$INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General')$test$, '42501', NULL, 'revoked insert robot_routines');
WITH affected AS (UPDATE public.robot_routines SET activity_type='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'revoked update robot_routines row count');
WITH affected AS (DELETE FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'revoked delete robot_routines row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'revoked final robot_routines rows');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'revoked preserves other tenant robot_routines');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'revoked read robot_contacts');
SELECT throws_ok($test$INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123')$test$, '42501', NULL, 'revoked insert robot_contacts');
WITH affected AS (UPDATE public.robot_contacts SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'revoked update robot_contacts row count');
WITH affected AS (DELETE FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'revoked delete robot_contacts row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'revoked final robot_contacts rows');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'revoked preserves other tenant robot_contacts');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 0, 'revoked read robot_memories');
SELECT throws_ok($test$INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact')$test$, '42501', NULL, 'revoked insert robot_memories');
WITH affected AS (UPDATE public.robot_memories SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'revoked update robot_memories row count');
WITH affected AS (DELETE FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'revoked delete robot_memories row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'revoked final robot_memories rows');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'revoked preserves other tenant robot_memories');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'), 0, 'revoked read storage');
SELECT throws_ok($test$INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-new.xlsx')$test$, '42501', NULL, 'revoked insert storage');
WITH affected AS (UPDATE storage.objects SET metadata='{"rbac":true}'::jsonb WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'revoked update storage row count');
WITH affected AS (DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'revoked delete storage row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '00000000-0000-0000-0000-000000004311/rbac-%'), 1, 'revoked preserves other tenant storage');
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
SET LOCAL ROLE authenticated;
SELECT throws_ok($test$SELECT public.replace_robot_config('00000000-0000-0000-0000-000000004310', '[{"time":"09:00","activity_type":"RPC"}]', '[{"name":"RPC","phone":"456"}]', '[{"entity":"General","name":"RPC","key_fact":"Replaced"}]')$test$, '42501', 'not_authorized', 'revoked replace RPC');
RESET ROLE;
SELECT is((SELECT activity_type FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 'General', 'revoked RPC effect robot_routines');
SELECT is((SELECT name FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'revoked RPC effect robot_contacts');
SELECT is((SELECT name FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'revoked RPC effect robot_memories');

-- Actor: stale member claim; the JWT deliberately retains member for revoked/stale users.
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '%/rbac-%';
INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'),('robot_configs','00000000-0000-0000-0000-000000004311/rbac-seed.xlsx');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004307'::uuid,'member');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'stale member claim read robot_routines');
SELECT throws_ok($test$INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General')$test$, '42501', NULL, 'stale member claim insert robot_routines');
WITH affected AS (UPDATE public.robot_routines SET activity_type='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'stale member claim update robot_routines row count');
WITH affected AS (DELETE FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'stale member claim delete robot_routines row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'stale member claim final robot_routines rows');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'stale member claim preserves other tenant robot_routines');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'stale member claim read robot_contacts');
SELECT throws_ok($test$INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123')$test$, '42501', NULL, 'stale member claim insert robot_contacts');
WITH affected AS (UPDATE public.robot_contacts SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'stale member claim update robot_contacts row count');
WITH affected AS (DELETE FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'stale member claim delete robot_contacts row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'stale member claim final robot_contacts rows');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'stale member claim preserves other tenant robot_contacts');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'stale member claim read robot_memories');
SELECT throws_ok($test$INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact')$test$, '42501', NULL, 'stale member claim insert robot_memories');
WITH affected AS (UPDATE public.robot_memories SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'stale member claim update robot_memories row count');
WITH affected AS (DELETE FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'stale member claim delete robot_memories row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'stale member claim final robot_memories rows');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'stale member claim preserves other tenant robot_memories');
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'), 1, 'stale member claim read storage');
SELECT throws_ok($test$INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-new.xlsx')$test$, '42501', NULL, 'stale member claim insert storage');
WITH affected AS (UPDATE storage.objects SET metadata='{"rbac":true}'::jsonb WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'stale member claim update storage row count');
WITH affected AS (DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'stale member claim delete storage row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '00000000-0000-0000-0000-000000004311/rbac-%'), 1, 'stale member claim preserves other tenant storage');
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
SET LOCAL ROLE authenticated;
SELECT throws_ok($test$SELECT public.replace_robot_config('00000000-0000-0000-0000-000000004310', '[{"time":"09:00","activity_type":"RPC"}]', '[{"name":"RPC","phone":"456"}]', '[{"entity":"General","name":"RPC","key_fact":"Replaced"}]')$test$, '42501', 'not_authorized', 'stale member claim replace RPC');
RESET ROLE;
SELECT is((SELECT activity_type FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 'General', 'stale member claim RPC effect robot_routines');
SELECT is((SELECT name FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'stale member claim RPC effect robot_contacts');
SELECT is((SELECT name FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'stale member claim RPC effect robot_memories');

-- Actor: anon; the JWT deliberately retains member for revoked/stale users.
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '%/rbac-%';
INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'),('robot_configs','00000000-0000-0000-0000-000000004311/rbac-seed.xlsx');
SELECT pg_temp.act_as(NULL::uuid,NULL);
SET LOCAL ROLE anon;
SELECT throws_ok($test$SELECT * FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon cannot read robot_routines');
SELECT throws_ok($test$INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General')$test$, '42501', NULL, 'anon insert robot_routines');
SELECT throws_ok($test$UPDATE public.robot_routines SET activity_type='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon update robot_routines');
SELECT throws_ok($test$DELETE FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon delete robot_routines');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'anon final robot_routines rows');
SELECT is((SELECT count(*)::int FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'anon preserves other tenant robot_routines');
SET LOCAL ROLE anon;
SELECT throws_ok($test$SELECT * FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon cannot read robot_contacts');
SELECT throws_ok($test$INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123')$test$, '42501', NULL, 'anon insert robot_contacts');
SELECT throws_ok($test$UPDATE public.robot_contacts SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon update robot_contacts');
SELECT throws_ok($test$DELETE FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon delete robot_contacts');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'anon final robot_contacts rows');
SELECT is((SELECT count(*)::int FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'anon preserves other tenant robot_contacts');
SET LOCAL ROLE anon;
SELECT throws_ok($test$SELECT * FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon cannot read robot_memories');
SELECT throws_ok($test$INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact')$test$, '42501', NULL, 'anon insert robot_memories');
SELECT throws_ok($test$UPDATE public.robot_memories SET name='Changed' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon update robot_memories');
SELECT throws_ok($test$DELETE FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'anon delete robot_memories');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 1, 'anon final robot_memories rows');
SELECT is((SELECT count(*)::int FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004311'), 1, 'anon preserves other tenant robot_memories');
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'), 0, 'anon read storage');
SELECT throws_ok($test$INSERT INTO storage.objects(bucket_id,name) VALUES ('robot_configs','00000000-0000-0000-0000-000000004310/rbac-new.xlsx')$test$, '42501', NULL, 'anon insert storage');
WITH affected AS (UPDATE storage.objects SET metadata='{"rbac":true}'::jsonb WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'anon update storage row count');
WITH affected AS (DELETE FROM storage.objects WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx' RETURNING 1)
SELECT is((SELECT count(*)::int FROM affected), 0, 'anon delete storage row count');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='robot_configs' AND name LIKE '00000000-0000-0000-0000-000000004311/rbac-%'), 1, 'anon preserves other tenant storage');
DELETE FROM public.robot_routines;
INSERT INTO public.robot_routines(account_id,time,activity_type) VALUES ('00000000-0000-0000-0000-000000004310','08:00','General'),('00000000-0000-0000-0000-000000004311','08:00','General');
DELETE FROM public.robot_contacts;
INSERT INTO public.robot_contacts(account_id,name,phone) VALUES ('00000000-0000-0000-0000-000000004310','Seed','123'),('00000000-0000-0000-0000-000000004311','Seed','123');
DELETE FROM public.robot_memories;
INSERT INTO public.robot_memories(account_id,entity,name,key_fact) VALUES ('00000000-0000-0000-0000-000000004310','General','Seed','Fact'),('00000000-0000-0000-0000-000000004311','General','Seed','Fact');
SET LOCAL ROLE anon;
SELECT throws_ok($test$SELECT public.replace_robot_config('00000000-0000-0000-0000-000000004310', '[{"time":"09:00","activity_type":"RPC"}]', '[{"name":"RPC","phone":"456"}]', '[{"entity":"General","name":"RPC","key_fact":"Replaced"}]')$test$, '42501', NULL, 'anon replace RPC');
RESET ROLE;
SELECT is((SELECT activity_type FROM public.robot_routines WHERE account_id='00000000-0000-0000-0000-000000004310'), 'General', 'anon RPC effect robot_routines');
SELECT is((SELECT name FROM public.robot_contacts WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'anon RPC effect robot_contacts');
SELECT is((SELECT name FROM public.robot_memories WHERE account_id='00000000-0000-0000-0000-000000004310'), 'Seed', 'anon RPC effect robot_memories');


-- Editors cannot move rows or files to a tenant where they have no membership.
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004301'::uuid,'owner');
SET LOCAL ROLE authenticated;
SELECT throws_ok($test$UPDATE public.robot_routines SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'owner cannot transfer robot_routines to another tenant');
SELECT throws_ok($test$UPDATE public.robot_contacts SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'owner cannot transfer robot_contacts to another tenant');
SELECT throws_ok($test$UPDATE public.robot_memories SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'owner cannot transfer robot_memories to another tenant');
SELECT throws_ok($test$UPDATE storage.objects SET name='00000000-0000-0000-0000-000000004311/rbac-moved.xlsx' WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'$test$, '42501', NULL, 'owner cannot transfer robot storage to another tenant');
RESET ROLE;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004302'::uuid,'admin');
SET LOCAL ROLE authenticated;
SELECT throws_ok($test$UPDATE public.robot_routines SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'admin cannot transfer robot_routines to another tenant');
SELECT throws_ok($test$UPDATE public.robot_contacts SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'admin cannot transfer robot_contacts to another tenant');
SELECT throws_ok($test$UPDATE public.robot_memories SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'admin cannot transfer robot_memories to another tenant');
SELECT throws_ok($test$UPDATE storage.objects SET name='00000000-0000-0000-0000-000000004311/rbac-moved.xlsx' WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'$test$, '42501', NULL, 'admin cannot transfer robot storage to another tenant');
RESET ROLE;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000004303'::uuid,'member');
SET LOCAL ROLE authenticated;
SELECT throws_ok($test$UPDATE public.robot_routines SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'member cannot transfer robot_routines to another tenant');
SELECT throws_ok($test$UPDATE public.robot_contacts SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'member cannot transfer robot_contacts to another tenant');
SELECT throws_ok($test$UPDATE public.robot_memories SET account_id='00000000-0000-0000-0000-000000004311' WHERE account_id='00000000-0000-0000-0000-000000004310'$test$, '42501', NULL, 'member cannot transfer robot_memories to another tenant');
SELECT throws_ok($test$UPDATE storage.objects SET name='00000000-0000-0000-0000-000000004311/rbac-moved.xlsx' WHERE bucket_id='robot_configs' AND name='00000000-0000-0000-0000-000000004310/rbac-seed.xlsx'$test$, '42501', NULL, 'member cannot transfer robot storage to another tenant');
RESET ROLE;

-- CREATE OR REPLACE must preserve the RPC execution boundary.
SELECT ok(has_function_privilege('authenticated', 'public.replace_robot_config(uuid,jsonb,jsonb,jsonb)', 'EXECUTE'), 'authenticated retains RPC execute');
SELECT ok(NOT has_function_privilege('anon', 'public.replace_robot_config(uuid,jsonb,jsonb,jsonb)', 'EXECUTE'), 'anon cannot execute RPC');
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
  WHERE p.oid='public.replace_robot_config(uuid,jsonb,jsonb,jsonb)'::regprocedure
    AND acl.grantee=0 AND acl.privilege_type='EXECUTE'
), 'PUBLIC has no RPC execute grant');

SELECT * FROM finish();
ROLLBACK;
