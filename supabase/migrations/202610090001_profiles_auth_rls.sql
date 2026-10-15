-- Dahira App: profiles, role management, and row-level security.
-- Apply this migration in the Supabase SQL Editor or with the Supabase CLI.

create sequence if not exists public.member_number_seq;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  section text check (section is null or char_length(section) <= 120),
  role text not null default 'member' check (role in ('member', 'treasurer', 'manager', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  member_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_profile_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.member_number is null then
    new.member_number := 'DA-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' || lpad(nextval('public.member_number_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_defaults on public.profiles;
create trigger profiles_set_defaults
before insert or update on public.profiles
for each row execute function public.set_profile_defaults();

-- Create a least-privilege member profile whenever Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata_name text;
begin
  metadata_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if metadata_name is null then
    metadata_name := coalesce(split_part(new.email, '@', 1), 'Nouveau membre');
  end if;

  insert into public.profiles (id, full_name, phone, section, role, status)
  values (
    new.id,
    left(metadata_name, 120),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), 30), ''),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'section', '')), 120), ''),
    'member',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- SECURITY DEFINER prevents recursive RLS checks when policies inspect roles.
create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any(allowed_roles)
      and p.status = 'active'
  );
$$;

revoke all on function public.has_staff_role(text[]) from public;
grant execute on function public.has_staff_role(text[]) to authenticated;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
-- Members can update only their own contact/profile fields; they cannot change role/status/member number.
grant update (full_name, phone, section) on public.profiles to authenticated;

drop policy if exists "profile_select_self_or_staff" on public.profiles;
create policy "profile_select_self_or_staff"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.has_staff_role(array['admin', 'manager', 'treasurer'])));

drop policy if exists "profile_update_self_fields" on public.profiles;
create policy "profile_update_self_fields"
on public.profiles for update to authenticated
using (id = (select auth.uid()) and status = 'active')
with check (id = (select auth.uid()) and status = 'active');

drop policy if exists "profile_update_admin" on public.profiles;
create policy "profile_update_admin"
on public.profiles for update to authenticated
using ((select public.has_staff_role(array['admin'])) )
with check ((select public.has_staff_role(array['admin'])));

-- No public insert/delete policy: profile creation is exclusively handled by the trusted auth trigger.
-- Promote the first administrator manually only after creating and verifying their account:
-- update public.profiles set role = 'admin' where id = '<AUTH_USER_UUID>';

-- Privileged member management goes through RPC functions, not direct table updates.
create or replace function public.admin_set_member_status(target_user_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.has_staff_role(array['admin'])) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if new_status not in ('active', 'suspended') then
    raise exception 'Statut invalide' using errcode = '22023';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Vous ne pouvez pas modifier votre propre statut' using errcode = '42501';
  end if;
  update public.profiles set status = new_status where id = target_user_id;
  if not found then raise exception 'Membre introuvable' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.admin_set_member_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.has_staff_role(array['admin'])) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if new_role not in ('member', 'treasurer', 'manager', 'admin') then
    raise exception 'Rôle invalide' using errcode = '22023';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Vous ne pouvez pas modifier votre propre rôle' using errcode = '42501';
  end if;
  update public.profiles set role = new_role where id = target_user_id;
  if not found then raise exception 'Membre introuvable' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.admin_set_member_status(uuid, text) from public, anon;
revoke all on function public.admin_set_member_role(uuid, text) from public, anon;
grant execute on function public.admin_set_member_status(uuid, text) to authenticated;
grant execute on function public.admin_set_member_role(uuid, text) to authenticated;
