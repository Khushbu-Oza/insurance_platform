-- ============================================================
-- InsureFlow: Super Admin Full Access Guard
-- Ensures super_admin can access all RLS-protected tables.
-- ============================================================

drop policy if exists "roles_super_admin_all" on public.roles;
create policy "roles_super_admin_all"
on public.roles
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "profiles_super_admin_all" on public.profiles;
create policy "profiles_super_admin_all"
on public.profiles
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "organizations_super_admin_all" on public.organizations;
create policy "organizations_super_admin_all"
on public.organizations
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "audit_logs_super_admin_all" on public.audit_logs;
create policy "audit_logs_super_admin_all"
on public.audit_logs
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "products_super_admin_all" on public.products;
create policy "products_super_admin_all"
on public.products
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "rating_factors_super_admin_all" on public.rating_factors;
create policy "rating_factors_super_admin_all"
on public.rating_factors
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "rating_rules_super_admin_all" on public.rating_rules;
create policy "rating_rules_super_admin_all"
on public.rating_rules
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "policyholders_super_admin_all" on public.policyholders;
create policy "policyholders_super_admin_all"
on public.policyholders
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "agents_super_admin_all" on public.agents;
create policy "agents_super_admin_all"
on public.agents
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "policies_super_admin_all" on public.policies;
create policy "policies_super_admin_all"
on public.policies
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "coverages_super_admin_all" on public.coverages;
create policy "coverages_super_admin_all"
on public.coverages
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "endorsements_super_admin_all" on public.endorsements;
create policy "endorsements_super_admin_all"
on public.endorsements
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "claims_super_admin_all" on public.claims;
create policy "claims_super_admin_all"
on public.claims
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "claim_notes_super_admin_all" on public.claim_notes;
create policy "claim_notes_super_admin_all"
on public.claim_notes
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "claim_payments_super_admin_all" on public.claim_payments;
create policy "claim_payments_super_admin_all"
on public.claim_payments
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');

drop policy if exists "claim_documents_super_admin_all" on public.claim_documents;
create policy "claim_documents_super_admin_all"
on public.claim_documents
for all
to authenticated
using (public.current_user_role_key() = 'super_admin')
with check (public.current_user_role_key() = 'super_admin');
