-- Fix FK constraints blocking user deletion.
-- accounts.created_by and accounts_memberships.invited_by are historical references
-- to who created/invited a user. When that user is deleted we preserve the record
-- but null out the author — ON DELETE SET NULL is the standard pattern for audit fields.

alter table public.accounts
  drop constraint if exists accounts_created_by_fkey,
  add constraint accounts_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.accounts_memberships
  drop constraint if exists accounts_memberships_invited_by_fkey,
  add constraint accounts_memberships_invited_by_fkey
    foreign key (invited_by) references public.profiles (id) on delete set null;
