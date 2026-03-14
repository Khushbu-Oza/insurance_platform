create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.policies(id) on delete cascade,
  claim_number text not null unique,
  status text not null check (status in ('open', 'investigating', 'settled', 'closed')),
  incident_date date not null,
  reported_date date not null default current_date,
  loss_description text not null,
  loss_location text,
  adjuster_user_id uuid references auth.users(id),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  reserve_amount numeric(12, 2) not null default 0,
  incurred_amount numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0,
  coverage_selection jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.claim_notes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  author_user_id uuid references auth.users(id),
  note text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'external')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.claim_payments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  amount numeric(12, 2) not null,
  payment_date date not null default current_date,
  payment_type text not null default 'indemnity' check (payment_type in ('indemnity', 'expense', 'medical')),
  status text not null default 'pending' check (status in ('pending', 'issued', 'cleared', 'void')),
  payee_name text not null,
  reference_no text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.claim_documents (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  mime_type text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_claims_org_status on public.claims (organization_id, status);
create index if not exists idx_claims_policy on public.claims (policy_id);
create index if not exists idx_claims_adjuster on public.claims (adjuster_user_id);
create index if not exists idx_claim_notes_claim on public.claim_notes (claim_id, created_at);
create index if not exists idx_claim_payments_claim on public.claim_payments (claim_id, payment_date);
create index if not exists idx_claim_documents_claim on public.claim_documents (claim_id, created_at);

alter table public.claims enable row level security;
alter table public.claim_notes enable row level security;
alter table public.claim_payments enable row level security;
alter table public.claim_documents enable row level security;

create policy "claims_select_same_org"
on public.claims
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
  or public.current_user_role_key() = 'super_admin'
);

create policy "claims_mutate_claims_roles"
on public.claims
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster', 'underwriter')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster', 'underwriter')
);

create policy "claim_notes_select_same_org"
on public.claim_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.claims c
    where c.id = claim_notes.claim_id
      and (c.organization_id = public.current_user_org_id() or public.current_user_role_key() = 'super_admin')
  )
);

create policy "claim_notes_mutate_claims_roles"
on public.claim_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.claims c
    where c.id = claim_notes.claim_id
      and c.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster', 'underwriter')
  )
)
with check (
  exists (
    select 1
    from public.claims c
    where c.id = claim_notes.claim_id
      and c.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster', 'underwriter')
  )
);

create policy "claim_payments_select_same_org"
on public.claim_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.claims c
    where c.id = claim_payments.claim_id
      and (c.organization_id = public.current_user_org_id() or public.current_user_role_key() = 'super_admin')
  )
);

create policy "claim_payments_mutate_claims_roles"
on public.claim_payments
for all
to authenticated
using (
  exists (
    select 1
    from public.claims c
    where c.id = claim_payments.claim_id
      and c.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster')
  )
)
with check (
  exists (
    select 1
    from public.claims c
    where c.id = claim_payments.claim_id
      and c.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster')
  )
);

create policy "claim_documents_select_same_org"
on public.claim_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.claims c
    where c.id = claim_documents.claim_id
      and (c.organization_id = public.current_user_org_id() or public.current_user_role_key() = 'super_admin')
  )
);

create policy "claim_documents_mutate_claims_roles"
on public.claim_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.claims c
    where c.id = claim_documents.claim_id
      and c.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster', 'underwriter')
  )
)
with check (
  exists (
    select 1
    from public.claims c
    where c.id = claim_documents.claim_id
      and c.organization_id = public.current_user_org_id()
      and public.current_user_role_key() in ('super_admin', 'carrier_admin', 'claims_adjuster', 'underwriter')
  )
);
