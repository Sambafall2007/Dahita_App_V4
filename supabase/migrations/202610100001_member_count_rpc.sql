-- Renvoie uniquement le nombre total de profils.
-- Aucune information personnelle n'est exposée.

create or replace function public.get_member_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.profiles;
$$;

revoke all on function public.get_member_count() from public;
grant execute on function public.get_member_count() to authenticated;
