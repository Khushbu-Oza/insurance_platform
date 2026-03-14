create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.policies(id) on delete cascade,
  invoice_number text not null unique,
  status text not null default 'issued' check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void')),
  billing_period_start date not null,
  billing_period_end date not null,
  issue_date date not null default current_date,
  due_date date not null,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  amount_due numeric(12, 2) not null default 0 check (amount_due >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invoices_amount_paid_lte_total check (amount_paid <= total_amount + 0.01)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_number text not null unique,
  payment_type text not null default 'premium' check (payment_type in ('premium', 'claim_settlement', 'commission')),
  payment_method text not null default 'ach' check (payment_method in ('ach', 'card', 'check', 'wire', 'cash', 'other')),
  status text not null default 'posted' check (status in ('pending', 'posted', 'failed', 'refunded', 'void')),
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  reference_no text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.agents(id),
  policy_id uuid not null references public.policies(id),
  invoice_id uuid references public.invoices(id) on delete set null,
  commission_rate numeric(7, 4) not null default 0 check (commission_rate >= 0),
  written_premium numeric(12, 2) not null default 0,
  amount numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'void')),
  earned_date date not null default current_date,
  paid_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reinsurance_treaties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  treaty_name text not null,
  reinsurer_name text not null,
  treaty_type text not null check (treaty_type in ('quota_share', 'surplus_share', 'excess_of_loss', 'facultative')),
  attachment_point numeric(14, 2) not null default 0,
  limit_amount numeric(14, 2) not null default 0,
  ceding_commission_rate numeric(7, 4) not null default 0,
  effective_date date not null default current_date,
  expiration_date date,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_invoices_org_status on public.invoices (organization_id, status);
create index if not exists idx_invoices_policy on public.invoices (policy_id, due_date);
create index if not exists idx_payments_org_date on public.payments (organization_id, payment_date desc);
create index if not exists idx_payments_invoice on public.payments (invoice_id);
create index if not exists idx_commissions_org_status on public.commissions (organization_id, status);
create index if not exists idx_commissions_agent on public.commissions (agent_id, earned_date desc);
create index if not exists idx_reinsurance_org_active on public.reinsurance_treaties (organization_id, is_active);

alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.commissions enable row level security;
alter table public.reinsurance_treaties enable row level security;

create policy "invoices_select_same_org"
on public.invoices
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "invoices_mutate_finance_roles"
on public.invoices
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

create policy "payments_select_same_org"
on public.payments
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "payments_mutate_finance_roles"
on public.payments
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster', 'agent', 'policyholder')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster', 'agent', 'policyholder')
);

create policy "commissions_select_same_org"
on public.commissions
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "commissions_mutate_finance_roles"
on public.commissions
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

create policy "reinsurance_select_same_org"
on public.reinsurance_treaties
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "reinsurance_mutate_admin"
on public.reinsurance_treaties
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
