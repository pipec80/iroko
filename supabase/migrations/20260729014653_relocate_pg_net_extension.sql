-- pg_net 0.20.x is not relocatable. Recreate it in `extensions` instead of
-- attempting ALTER EXTENSION ... SET SCHEMA, which Cloud rejects.
-- The extension owns transient, unlogged request/response tables. Hold an
-- exclusive lock and refuse to proceed if a request has not been processed.
BEGIN;
LOCK TABLE net.http_request_queue IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM net.http_request_queue) THEN
    RAISE EXCEPTION
      'Cannot recreate pg_net while HTTP requests are queued; retry after the queue drains';
  END IF;
END;
$$;

DROP EXTENSION pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
COMMIT;
