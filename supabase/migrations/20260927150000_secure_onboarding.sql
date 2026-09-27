-- Aligns the initial schema with the secure client-side onboarding flow.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.create_tenant(text,text,text,text,text,text);

drop policy if exists "memberships_insert_owner_bootstrap" on public.memberships;
create policy "memberships_insert_owner_bootstrap" on public.memberships
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1 from public.tenants t
    where t.id = memberships.tenant_id
      and t.created_by = (select auth.uid())
  )
);