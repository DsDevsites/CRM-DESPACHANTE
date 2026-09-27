alter table public.process_documents
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text;

insert into storage.buckets (id, name, public)
values ('process-documents', 'process-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "process_documents_storage_select" on storage.objects;
drop policy if exists "process_documents_storage_insert" on storage.objects;
drop policy if exists "process_documents_storage_update" on storage.objects;
drop policy if exists "process_documents_storage_delete" on storage.objects;

create policy "process_documents_storage_select" on storage.objects for select to authenticated
using (bucket_id = 'process-documents' and exists (
  select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active=true
  and m.tenant_id::text=(storage.foldername(name))[1]
));
create policy "process_documents_storage_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'process-documents' and exists (
  select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active=true
  and m.tenant_id::text=(storage.foldername(name))[1]
));
create policy "process_documents_storage_update" on storage.objects for update to authenticated
using (bucket_id = 'process-documents' and exists (
  select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active=true
  and m.tenant_id::text=(storage.foldername(name))[1]
))
with check (bucket_id = 'process-documents' and exists (
  select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active=true
  and m.tenant_id::text=(storage.foldername(name))[1]
));
create policy "process_documents_storage_delete" on storage.objects for delete to authenticated
using (bucket_id = 'process-documents' and exists (
  select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.active=true
  and m.tenant_id::text=(storage.foldername(name))[1]
));

create index if not exists process_documents_status_idx on public.process_documents(tenant_id,status);
