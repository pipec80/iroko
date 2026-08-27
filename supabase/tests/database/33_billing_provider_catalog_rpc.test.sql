-- pgTAP: el catálogo de precios de billing permanece interno y se accede
-- únicamente desde los adapters server-side mediante RPCs de service_role.
-- Run with: pnpm supa:test

BEGIN;
SELECT plan(4);

SELECT ok(
  to_regprocedure(
    'public.get_billing_provider_price(text,billing.plan_interval,text,character)'
  ) IS NOT NULL,
  'checkout price lookup is exposed through a narrow public RPC'
);

SELECT ok(
  to_regprocedure(
    'public.resolve_billing_plan_by_external_price(text,text)'
  ) IS NOT NULL,
  'webhook price reverse lookup is exposed through a narrow public RPC'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    WHERE procedure.oid = to_regprocedure(
      'public.get_billing_provider_price(text,billing.plan_interval,text,character)'
    )
      AND has_function_privilege('service_role', procedure.oid, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      AND NOT has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ),
  'checkout price lookup is executable only by service_role'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    WHERE procedure.oid = to_regprocedure(
      'public.resolve_billing_plan_by_external_price(text,text)'
    )
      AND has_function_privilege('service_role', procedure.oid, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      AND NOT has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ),
  'webhook price reverse lookup is executable only by service_role'
);

SELECT * FROM finish();
ROLLBACK;
