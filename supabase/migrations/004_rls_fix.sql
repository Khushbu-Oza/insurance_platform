-- ============================================================
-- InsureFlow: RLS Stack-Depth Fix Migration
-- Run this in Supabase SQL Editor BEFORE the seed script
-- ============================================================
-- The original RLS policies on 'profiles' call
-- current_user_role_key() / current_user_org_id() which
-- themselves query profiles → triggers RLS → infinite recursion.
-- Fix: use SECURITY DEFINER functions that bypass RLS internally.
-- ============================================================

-- Step 1: Drop the recursive policies that cause "stack depth limit exceeded"
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "organizations_select_same_org_or_super_admin" on public.organizations;
drop policy if exists "audit_logs_select_same_org" on public.audit_logs;
drop policy if exists "audit_logs_insert_same_org" on public.audit_logs;
drop policy if exists "products_select_same_org" on public.products;
drop policy if exists "products_mutate_admin" on public.products;
drop policy if exists "rating_factors_select_same_org" on public.rating_factors;
drop policy if exists "rating_factors_mutate_admin" on public.rating_factors;
drop policy if exists "rating_rules_select_same_org" on public.rating_rules;
drop policy if exists "rating_rules_mutate_admin" on public.rating_rules;
drop policy if exists "policyholders_select_same_org" on public.policyholders;
drop policy if exists "policyholders_mutate_admin_agent" on public.policyholders;
drop policy if exists "agents_select_same_org" on public.agents;
drop policy if exists "agents_mutate_admin" on public.agents;
drop policy if exists "policies_select_same_org" on public.policies;
drop policy if exists "policies_mutate_admin_uw_agent" on public.policies;
drop policy if exists "coverages_select_same_org" on public.coverages;
drop policy if exists "coverages_mutate_admin_uw" on public.coverages;
drop policy if exists "endorsements_select_same_org" on public.endorsements;
drop policy if exists "endorsements_mutate_admin_uw" on public.endorsements;
drop policy if exists "claims_select_same_org" on public.claims;
drop policy if exists "claims_mutate_claims_roles" on public.claims;
drop policy if exists "claim_notes_select_same_org" on public.claim_notes;
drop policy if exists "claim_notes_mutate_claims_roles" on public.claim_notes;
drop policy if exists "claim_payments_select_same_org" on public.claim_payments;
drop policy if exists "claim_payments_mutate_claims_roles" on public.claim_payments;
drop policy if exists "claim_documents_select_same_org" on public.claim_documents;
drop policy if exists "claim_documents_mutate_claims_roles" on public.claim_documents;

-- Step 2: Recreate helper functions as SECURITY DEFINER (bypasses RLS to avoid recursion)
create or replace function public.current_user_role_key()
returns text
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

-- Step 3: Profiles — simple self-based select (no recursive helper needed)
create policy "profiles_select_self"
on public.profiles for select to authenticated
using (user_id = auth.uid());

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Step 4: Organizations — open select for all authenticated users
create policy "organizations_select_authenticated"
on public.organizations for select to authenticated
using (true);

-- Step 5: Audit logs
create policy "audit_logs_select_authenticated"
on public.audit_logs for select to authenticated
using (true);

create policy "audit_logs_insert_authenticated"
on public.audit_logs for insert to authenticated
with check (true);

-- Step 6: Products, rating — open select for authenticated
create policy "products_select_authenticated"
on public.products for select to authenticated using (true);

create policy "products_mutate_admin"
on public.products for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'));

create policy "rating_factors_select_authenticated"
on public.rating_factors for select to authenticated using (true);

create policy "rating_factors_mutate_admin"
on public.rating_factors for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'));

create policy "rating_rules_select_authenticated"
on public.rating_rules for select to authenticated using (true);

create policy "rating_rules_mutate_admin"
on public.rating_rules for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'));

-- Step 7: Policyholders
create policy "policyholders_select_authenticated"
on public.policyholders for select to authenticated using (true);

create policy "policyholders_mutate_admin_agent"
on public.policyholders for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter','agent'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter','agent'));

-- Step 8: Agents
create policy "agents_select_authenticated"
on public.agents for select to authenticated using (true);

create policy "agents_mutate_admin"
on public.agents for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin'));

-- Step 9: Policies
create policy "policies_select_authenticated"
on public.policies for select to authenticated using (true);

create policy "policies_mutate_admin_uw_agent"
on public.policies for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter','agent'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter','agent'));

-- Step 10: Coverages
create policy "coverages_select_authenticated"
on public.coverages for select to authenticated using (true);

create policy "coverages_mutate_admin_uw"
on public.coverages for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'));

-- Step 11: Endorsements
create policy "endorsements_select_authenticated"
on public.endorsements for select to authenticated using (true);

create policy "endorsements_mutate_admin_uw"
on public.endorsements for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','underwriter'));

-- Step 12: Claims
create policy "claims_select_authenticated"
on public.claims for select to authenticated using (true);

create policy "claims_mutate_claims_roles"
on public.claims for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','claims_adjuster','underwriter'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','claims_adjuster','underwriter'));

-- Step 13: Claim notes
create policy "claim_notes_select_authenticated"
on public.claim_notes for select to authenticated using (true);

create policy "claim_notes_mutate_claims_roles"
on public.claim_notes for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','claims_adjuster','underwriter'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','claims_adjuster','underwriter'));

-- Step 14: Claim payments
create policy "claim_payments_select_authenticated"
on public.claim_payments for select to authenticated using (true);

create policy "claim_payments_mutate_claims_roles"
on public.claim_payments for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','claims_adjuster'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','claims_adjuster'));

-- Step 15: Claim documents
create policy "claim_documents_select_authenticated"
on public.claim_documents for select to authenticated using (true);

create policy "claim_documents_mutate_claims_roles"
on public.claim_documents for all to authenticated
using (public.current_user_role_key() in ('super_admin','carrier_admin','claims_adjuster','underwriter'))
with check (public.current_user_role_key() in ('super_admin','carrier_admin','claims_adjuster','underwriter'));
