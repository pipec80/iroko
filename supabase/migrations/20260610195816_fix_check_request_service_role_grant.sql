-- Fix: service_role no tenía EXECUTE en check_request().
-- PostgREST llama db_pre_request como el rol del request; service_role se usa
-- en llamadas de Management API (CLI gen types, MCP) y no tenía permiso,
-- causando "permission denied for function check_request" (42501).
-- La función ya retorna temprano para GET/HEAD y cuando no hay X-Forwarded-For,
-- por lo que service_role queda exento del rate limiting sin cambios al cuerpo.

GRANT EXECUTE ON FUNCTION public.check_request() TO service_role;
