create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  org_type text not null check (org_type in ('carrier', 'mga')),
  state_code text not null default 'CA',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  role_key text unique not null,
  role_label text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id),
  role_id uuid references public.roles(id),
  full_name text,
  phone text,
  license_number text,
  npn text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  actor_user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.organizations enable row level security;
alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_role_key()
returns text
language sql
stable
as $$
  select r.role_key
  from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
as $$
  select p.organization_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.current_user_role_key() in ('super_admin', 'carrier_admin')
    and organization_id = public.current_user_org_id()
  )
);

create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (
  user_id = auth.uid()
  or (
    public.current_user_role_key() in ('super_admin', 'carrier_admin')
    and organization_id = public.current_user_org_id()
  )
)
with check (
  user_id = auth.uid()
  or (
    public.current_user_role_key() in ('super_admin', 'carrier_admin')
    and organization_id = public.current_user_org_id()
  )
);

create policy "organizations_select_same_org_or_super_admin"
on public.organizations
for select
to authenticated
using (
  id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "audit_logs_select_same_org"
on public.audit_logs
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "audit_logs_insert_same_org"
on public.audit_logs
for insert
to authenticated
with check (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
begin
  select id into v_role_id
  from public.roles
  where role_key = coalesce(new.raw_user_meta_data ->> 'role', 'policyholder')
  limit 1;

  insert into public.profiles (user_id, full_name, role_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    v_role_id
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
