create or replace function public.invitation_recipient_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(p_email) and deleted_at is null
  );
$$;

revoke all on function public.invitation_recipient_exists(text) from public, anon, authenticated;
grant execute on function public.invitation_recipient_exists(text) to service_role;
