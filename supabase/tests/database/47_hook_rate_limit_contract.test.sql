-- HTTP parser behavior and real concurrency are covered by the loopback harness.
BEGIN;
SELECT plan(7);
SELECT set_config('request.method', 'POST', true);
SELECT set_config('request.path', '/rpc/not_the_admission_rpc', true);
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT set_config('request.headers', '{"cf-connecting-ip":"198.51.100.47"}', true);
INSERT INTO private.rate_limit_counters(ip,window_start,count)
VALUES ('198.51.100.47', date_trunc('minute',now()),100);
CREATE FUNCTION pg_temp.hook_error_detail() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE detail_text text;
BEGIN
  PERFORM public.check_request();
  RETURN NULL;
EXCEPTION WHEN SQLSTATE 'PGRST' THEN
  GET STACKED DIAGNOSTICS detail_text = PG_EXCEPTION_DETAIL;
  RETURN detail_text::jsonb;
END;
$$;
SELECT is(jsonb_typeof(pg_temp.hook_error_detail()->'headers'), 'object', 'PostgREST custom headers use the required object contract');
SELECT is((pg_temp.hook_error_detail()->>'status')::integer, 429, 'write 101 has the intended HTTP status');
SELECT is((SELECT count FROM private.rate_limit_counters WHERE ip='198.51.100.47'),100,'rejected request rolls back its counter');
SELECT set_config('request.path','/rpc/admit_account_api_request',true);
SELECT lives_ok('SELECT public.check_request()', 'only service-role POST to admission bypasses hook');
SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true);
SELECT throws_ok('SELECT public.check_request()','PGRST',NULL,'authenticated cannot use the admission path exemption');
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT set_config('request.method','PATCH',true);
SELECT throws_ok('SELECT public.check_request()','PGRST',NULL,'service-role PATCH is not exempt');
SELECT set_config('request.method','GET',true);
SELECT lives_ok('SELECT public.check_request()', 'existing read exemption remains');
SELECT * FROM finish();
ROLLBACK;
