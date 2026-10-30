BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(16);
SELECT has_column('public', 'documents', 'revision', 'documents carry a persisted revision');
SELECT has_function('public', 'save_document_revision', ARRAY['uuid','text','integer'], 'CAS RPC exists');
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
VALUES ('00000000-0000-0000-0000-000000017401','cas-0174@example.test','{}',now(),now(),'',now(),'','authenticated','authenticated');
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role)
VALUES ('00000000-0000-0000-0000-000000017405','cas-viewer-0174@example.test','{}',now(),now(),'',now(),'','authenticated','authenticated');
INSERT INTO public.accounts(id,type,name,slug,created_by)
VALUES ('00000000-0000-0000-0000-000000017404','team','CAS team','cas-team-0174','00000000-0000-0000-0000-000000017401');
INSERT INTO public.accounts_memberships(account_id,user_id,role)
VALUES ('00000000-0000-0000-0000-000000017404','00000000-0000-0000-0000-000000017401','owner'),
('00000000-0000-0000-0000-000000017404','00000000-0000-0000-0000-000000017405','viewer');
INSERT INTO public.projects(id,account_id,name,slug,created_by)
VALUES ('00000000-0000-0000-0000-000000017402','00000000-0000-0000-0000-000000017404','CAS','cas-0174','00000000-0000-0000-0000-000000017401');
INSERT INTO public.documents(id,project_id,account_id,name,created_by)
VALUES ('00000000-0000-0000-0000-000000017403','00000000-0000-0000-0000-000000017402','00000000-0000-0000-0000-000000017404','CAS','00000000-0000-0000-0000-000000017401');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000017401","role":"authenticated"}',true);
SELECT is((SELECT revision FROM public.save_document_revision('00000000-0000-0000-0000-000000017403','A',0)),1,'first snapshot accepted');
SELECT is((SELECT count(*) FROM public.save_document_revision('00000000-0000-0000-0000-000000017403','B',0)),0::bigint,'second stale snapshot rejected');
SELECT is((SELECT content FROM public.documents WHERE id='00000000-0000-0000-0000-000000017403'),'A','rejected save cannot overwrite');
UPDATE public.documents SET description='external update',revision=-1 WHERE id='00000000-0000-0000-0000-000000017403';
SELECT is((SELECT revision FROM public.documents WHERE id='00000000-0000-0000-0000-000000017403'),2,'all writes invalidate snapshot and client revision ignored');
SELECT is((SELECT count(*) FROM public.save_document_revision('00000000-0000-0000-0000-000000017403','old',1)),0::bigint,'external update fences old snapshot');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000017405","role":"authenticated"}',true);
SELECT is((SELECT content FROM public.documents WHERE id='00000000-0000-0000-0000-000000017403'),'A','viewer control can read a live document');
SELECT is((SELECT count(*) FROM public.save_document_revision('00000000-0000-0000-0000-000000017403','viewer',2)),0::bigint,'viewer cannot save even with the current revision');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000017499","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.save_document_revision('00000000-0000-0000-0000-000000017403','foreign-live',2)),0::bigint,'foreign actor cannot save a live document');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000017401","role":"authenticated"}',true);
RESET ROLE;
UPDATE public.documents SET deleted_at=now() WHERE id='00000000-0000-0000-0000-000000017403';
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.save_document_revision('00000000-0000-0000-0000-000000017403','deleted',3)),0::bigint,'deleted documents unavailable');
RESET ROLE;
SELECT ok(NOT has_function_privilege('anon','public.save_document_revision(uuid,text,integer)','EXECUTE'),'anon cannot call CAS');
SELECT ok(has_function_privilege('authenticated','public.save_document_revision(uuid,text,integer)','EXECUTE'),'authenticated can call CAS under RLS');
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000017499","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*) FROM public.save_document_revision('00000000-0000-0000-0000-000000017403','foreign',3)),0::bigint,'foreign actor cannot write');
SELECT is((SELECT count(*) FROM public.save_document_revision('00000000-0000-0000-0000-000000017499','missing',0)),0::bigint,'missing and unavailable are indistinguishable');
RESET ROLE;
SELECT is((SELECT prosecdef FROM pg_proc WHERE oid='public.save_document_revision(uuid,text,integer)'::regprocedure),false,'CAS uses invoker authorization');
SELECT * FROM finish();
ROLLBACK;
