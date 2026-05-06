-- Fix: accounts.created_by was NOT NULL but the FK is ON DELETE SET NULL.
-- When auth.users is deleted → profiles CASCADE deletes → FK tries to SET NULL
-- on created_by, but the NOT NULL constraint blocks it → "API error" in Studio.
--
-- created_by is an audit/history field. NULL means "creator was deleted", which
-- is valid. Removing NOT NULL is safe and matches the FK's ON DELETE SET NULL intent.

ALTER TABLE public.accounts
  ALTER COLUMN created_by DROP NOT NULL;
