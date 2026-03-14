create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  line_of_business text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.rating_factors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  factor_key text not null,
  label text not null,
  data_type text not null check (data_type in ('number', 'string', 'boolean')),
  is_required boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (product_id, factor_key)
);

create table if not exists public.rating_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  factor_key text not null,
  operator text not null check (operator in ('eq', 'gt', 'gte', 'lt', 'lte', 'in')),
  rule_value jsonb not null,
  adjustment_type text not null check (adjustment_type in ('multiplier', 'flat')),
  adjustment_value numeric(12, 4) not null,
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.policyholders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  date_of_birth date,
  address_line_1 text,
  city text,
  state_code text,
  postal_code text,
  line_of_business text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  npn text,
  commission_rate numeric(7, 4) not null default 0.1,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_number text not null unique,
  status text not null check (status in ('quote', 'bound', 'active', 'expired', 'cancelled')),
  product_id uuid references public.products(id),
  product text,
  policyholder_id uuid references public.policyholders(id),
  agent_id uuid references public.agents(id),
  effective_date date,
  expiration_date date,
  written_premium numeric(12, 2) not null default 0,
  rating_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.coverages (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  coverage_code text not null,
  coverage_name text not null,
  limit_amount numeric(12, 2) not null default 0,
  deductible_amount numeric(12, 2) not null default 0,
  premium_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  endorsement_number text not null,
  description text not null,
  premium_change numeric(12, 2) not null default 0,
  status text not null default 'draft',
  effective_date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_policies_org_status on public.policies (organization_id, status);
create index if not exists idx_policies_agent on public.policies (agent_id);
create index if not exists idx_policies_policyholder on public.policies (policyholder_id);
create index if not exists idx_rating_rules_product on public.rating_rules (product_id, is_active, priority);

alter table public.products enable row level security;
alter table public.rating_factors enable row level security;
alter table public.rating_rules enable row level security;
alter table public.policyholders enable row level security;
alter table public.agents enable row level security;
alter table public.policies enable row level security;
alter table public.coverages enable row level security;
alter table public.endorsements enable row level security;

create policy "products_select_same_org"
on public.products
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "products_mutate_admin"
on public.products
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
);

create policy "rating_factors_select_same_org"
on public.rating_factors
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "rating_factors_mutate_admin"
on public.rating_factors
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
);

create policy "rating_rules_select_same_org"
on public.rating_rules
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "rating_rules_mutate_admin"
on public.rating_rules
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
);

create policy "policyholders_select_same_org"
on public.policyholders
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "policyholders_mutate_admin_agent"
on public.policyholders
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter', 'agent')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter', 'agent')
);

create policy "agents_select_same_org"
on public.agents
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "agents_mutate_admin"
on public.agents
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin')
);

create policy "policies_select_same_org"
on public.policies
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "policies_mutate_admin_uw_agent"
on public.policies
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter', 'agent')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter', 'agent')
);

create policy "coverages_select_same_org"
on public.coverages
for select
to authenticated
using (
  exists (
    select 1
    from public.policies p
    where p.id = coverages.policy_id
      and (p.organization_id = public.current_user_org_id() or public.current_user_role_key() = 'super_admin')
  )
);

create policy "coverages_mutate_admin_uw"
on public.coverages
for all
to authenticated
using (
  exists (
    select 1
    from public.policies p
    where p.id = coverages.policy_id
      and p.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
  )
)
with check (
  exists (
    select 1
    from public.policies p
    where p.id = coverages.policy_id
      and p.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
  )
);

create policy "endorsements_select_same_org"
on public.endorsements
for select
to authenticated
using (
  exists (
    select 1
    from public.policies p
    where p.id = endorsements.policy_id
      and (p.organization_id = public.current_user_org_id() or public.current_user_role_key() = 'super_admin')
  )
);

create policy "endorsements_mutate_admin_uw"
on public.endorsements
for all
to authenticated
using (
  exists (
    select 1
    from public.policies p
    where p.id = endorsements.policy_id
      and p.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
  )
)
with check (
  exists (
    select 1
    from public.policies p
    where p.id = endorsements.policy_id
      and p.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter')
  )
);
