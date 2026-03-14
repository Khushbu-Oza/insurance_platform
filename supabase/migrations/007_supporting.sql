create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete set null,
  type text not null default 'system',
  title text not null,
  message text not null,
  entity_type text,
  entity_id text,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_key text not null,
  name text not null,
  description text,
  trigger_event text not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, workflow_key)
);

create table if not exists public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_code text not null,
  rule_name text not null,
  category text not null,
  jurisdiction text not null default 'US',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  description text,
  is_enabled boolean not null default true,
  effective_date date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, rule_code)
);

create index if not exists idx_notifications_recipient on public.notifications (recipient_user_id, is_read, created_at desc);
create index if not exists idx_notifications_org on public.notifications (organization_id, created_at desc);
create index if not exists idx_workflows_org_active on public.workflows (organization_id, is_active);
create index if not exists idx_compliance_org_enabled on public.compliance_rules (organization_id, is_enabled);
create index if not exists idx_compliance_category on public.compliance_rules (category, jurisdiction);

alter table public.notifications enable row level security;
alter table public.workflows enable row level security;
alter table public.compliance_rules enable row level security;

create policy "notifications_select_scope"
on public.notifications
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or recipient_user_id = auth.uid()
  or public.current_user_role_key() = 'super_admin'
);

create policy "notifications_mutate_scope"
on public.notifications
for all
to authenticated
using (
  (
    organization_id = public.current_user_org_id()
    and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter', 'claims_adjuster')
  )
  or recipient_user_id = auth.uid()
  or public.current_user_role_key() = 'super_admin'
)
with check (
  (
    organization_id = public.current_user_org_id()
    and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'underwriter', 'claims_adjuster')
  )
  or recipient_user_id = auth.uid()
  or public.current_user_role_key() = 'super_admin'
);

create policy "workflows_select_same_org"
on public.workflows
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "workflows_mutate_admin"
on public.workflows
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

create policy "compliance_rules_select_same_org"
on public.compliance_rules
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "compliance_rules_mutate_admin"
on public.compliance_rules
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
