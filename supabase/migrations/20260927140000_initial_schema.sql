create extension if not exists pgcrypto;

create type public.user_role as enum ('owner','admin','operator','viewer');
create type public.process_status as enum ('pre_cadastro','aguardando_documentos','documentacao_completa','em_analise','protocolo','concluido','cancelado');
create type public.appointment_status as enum ('scheduled','confirmed','completed','cancelled','no_show');

create table public.tenants(
 id uuid primary key default gen_random_uuid(), name text not null, document text, phone text, email text, city text, state text default 'MG', logo_url text, settings jsonb not null default '{}'::jsonb, created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade, full_name text, phone text, avatar_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.memberships(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role public.user_role not null default 'operator', active boolean not null default true, created_at timestamptz not null default now(), unique(tenant_id,user_id)
);
create table public.clients(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, name text not null, document text, rg text, email text, phone text, whatsapp text, address text, city text, state text default 'MG', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.vehicles(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, client_id uuid references public.clients(id) on delete set null, plate text, renavam text, chassis text, brand text, model text, year_manufacture integer, year_model integer, color text, fuel text, status text not null default 'active', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.vehicle_searches(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, vehicle_id uuid references public.vehicles(id) on delete set null, query_type text not null, query_value text not null, provider text, status text not null default 'pending', result jsonb not null default '{}'::jsonb, error_message text, searched_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table public.ipva_queries(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, vehicle_id uuid references public.vehicles(id) on delete set null, year integer, query_type text not null default 'vehicle', query_value text not null, provider text default 'sefaz-mg', status text not null default 'pending', result jsonb not null default '{}'::jsonb, pdf_url text, error_message text, searched_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table public.transfer_processes(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, client_id uuid references public.clients(id) on delete set null, vehicle_id uuid references public.vehicles(id) on delete set null, protocol text, status public.process_status not null default 'pre_cadastro', service_type text not null default 'transferencia', notes text, opened_at timestamptz not null default now(), due_date date, completed_at timestamptz, created_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now()
);
create table public.process_documents(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, process_id uuid not null references public.transfer_processes(id) on delete cascade, name text not null, document_type text, required boolean not null default true, status text not null default 'pending', storage_path text, notes text, uploaded_by uuid references auth.users(id) on delete set null, uploaded_at timestamptz, created_at timestamptz not null default now()
);
create table public.appointments(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, client_id uuid references public.clients(id) on delete set null, process_id uuid references public.transfer_processes(id) on delete set null, title text not null, starts_at timestamptz not null, ends_at timestamptz not null, status public.appointment_status not null default 'scheduled', location text, notes text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index memberships_user_tenant_idx on public.memberships(user_id,tenant_id);
create index clients_tenant_idx on public.clients(tenant_id);
create index vehicles_tenant_idx on public.vehicles(tenant_id);
create index vehicles_plate_idx on public.vehicles(tenant_id,plate);
create index vehicles_renavam_idx on public.vehicles(tenant_id,renavam);
create index vehicle_searches_tenant_idx on public.vehicle_searches(tenant_id,created_at desc);
create index ipva_queries_tenant_idx on public.ipva_queries(tenant_id,created_at desc);
create index processes_tenant_status_idx on public.transfer_processes(tenant_id,status);
create index process_documents_process_idx on public.process_documents(tenant_id,process_id);
create index appointments_tenant_start_idx on public.appointments(tenant_id,starts_at);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
create trigger tenants_updated before update on public.tenants for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_updated before update on public.clients for each row execute function public.set_updated_at();
create trigger vehicles_updated before update on public.vehicles for each row execute function public.set_updated_at();
create trigger processes_updated before update on public.transfer_processes for each row execute function public.set_updated_at();
create trigger appointments_updated before update on public.appointments for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name') on conflict(id) do update set full_name=excluded.full_name;
 return new;
end; $$;
revoke execute on function public.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_searches enable row level security;
alter table public.ipva_queries enable row level security;
alter table public.transfer_processes enable row level security;
alter table public.process_documents enable row level security;
alter table public.appointments enable row level security;

revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using((select auth.uid())=id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check((select auth.uid())=id);
create policy "profiles_update_own" on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);

create policy "tenants_select_member" on public.tenants for select to authenticated using(exists(select 1 from public.memberships m where m.tenant_id=tenants.id and m.user_id=(select auth.uid()) and m.active));
create policy "tenants_insert_creator" on public.tenants for insert to authenticated with check((select auth.uid())=created_by);
create policy "tenants_update_admin" on public.tenants for update to authenticated using(exists(select 1 from public.memberships m where m.tenant_id=tenants.id and m.user_id=(select auth.uid()) and m.active and m.role in('owner','admin'))) with check(exists(select 1 from public.memberships m where m.tenant_id=tenants.id and m.user_id=(select auth.uid()) and m.active and m.role in('owner','admin')));

create schema if not exists private;

create or replace function private.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.memberships
    where tenant_id = p_tenant_id
      and user_id = (select auth.uid())
      and active = true
  );
$$;

create or replace function private.has_tenant_role(p_tenant_id uuid, p_roles public.user_role[])
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.memberships
    where tenant_id = p_tenant_id
      and user_id = (select auth.uid())
      and active = true
      and role = any(p_roles)
  );
$$;

revoke all on function private.is_tenant_member(uuid) from public;
revoke all on function private.has_tenant_role(uuid, public.user_role[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_tenant_member(uuid) to authenticated;
grant execute on function private.has_tenant_role(uuid, public.user_role[]) to authenticated;

create or replace function public.create_tenant(
  p_name text,
  p_document text default null,
  p_phone text default null,
  p_email text default null,
  p_city text default null,
  p_state text default 'MG'
)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant public.tenants;
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  insert into public.tenants(name,document,phone,email,city,state,created_by)
  values(p_name,p_document,p_phone,p_email,p_city,p_state,v_user)
  returning * into v_tenant;

  insert into public.memberships(tenant_id,user_id,role,active)
  values(v_tenant.id,v_user,'owner',true);

  return v_tenant;
end;
$$;

revoke all on function public.create_tenant(text,text,text,text,text,text) from public;
grant execute on function public.create_tenant(text,text,text,text,text,text) to authenticated;

create policy "tenants_select_member" on public.tenants for select to authenticated
using ((select private.is_tenant_member(tenants.id)));
create policy "tenants_insert_creator" on public.tenants for insert to authenticated
with check ((select auth.uid()) = created_by);
create policy "tenants_update_admin" on public.tenants for update to authenticated
using ((select private.has_tenant_role(tenants.id, array['owner','admin']::public.user_role[])))
with check ((select private.has_tenant_role(tenants.id, array['owner','admin']::public.user_role[])));

create policy "memberships_select_tenant" on public.memberships for select to authenticated
using ((select private.is_tenant_member(memberships.tenant_id)));
create policy "memberships_insert_admin" on public.memberships for insert to authenticated
with check ((select private.has_tenant_role(memberships.tenant_id, array['owner','admin']::public.user_role[])));
create policy "memberships_update_admin" on public.memberships for update to authenticated
using ((select private.has_tenant_role(memberships.tenant_id, array['owner','admin']::public.user_role[])))
with check ((select private.has_tenant_role(memberships.tenant_id, array['owner','admin']::public.user_role[])));
create policy "memberships_delete_admin" on public.memberships for delete to authenticated
using ((select private.has_tenant_role(memberships.tenant_id, array['owner','admin']::public.user_role[])));

create policy "clients_select_tenant" on public.clients for select to authenticated using((select private.is_tenant_member(clients.tenant_id)));
create policy "clients_insert_tenant" on public.clients for insert to authenticated with check((select private.is_tenant_member(clients.tenant_id)));
create policy "clients_update_tenant" on public.clients for update to authenticated using((select private.is_tenant_member(clients.tenant_id))) with check((select private.is_tenant_member(clients.tenant_id)));
create policy "clients_delete_tenant" on public.clients for delete to authenticated using((select private.is_tenant_member(clients.tenant_id)));

create policy "vehicles_select_tenant" on public.vehicles for select to authenticated using((select private.is_tenant_member(vehicles.tenant_id)));
create policy "vehicles_insert_tenant" on public.vehicles for insert to authenticated with check((select private.is_tenant_member(vehicles.tenant_id)));
create policy "vehicles_update_tenant" on public.vehicles for update to authenticated using((select private.is_tenant_member(vehicles.tenant_id))) with check((select private.is_tenant_member(vehicles.tenant_id)));
create policy "vehicles_delete_tenant" on public.vehicles for delete to authenticated using((select private.is_tenant_member(vehicles.tenant_id)));

create policy "searches_select_tenant" on public.vehicle_searches for select to authenticated using((select private.is_tenant_member(vehicle_searches.tenant_id)));
create policy "searches_insert_tenant" on public.vehicle_searches for insert to authenticated with check((select private.is_tenant_member(vehicle_searches.tenant_id)));

create policy "ipva_select_tenant" on public.ipva_queries for select to authenticated using((select private.is_tenant_member(ipva_queries.tenant_id)));
create policy "ipva_insert_tenant" on public.ipva_queries for insert to authenticated with check((select private.is_tenant_member(ipva_queries.tenant_id)));

create policy "processes_select_tenant" on public.transfer_processes for select to authenticated using((select private.is_tenant_member(transfer_processes.tenant_id)));
create policy "processes_insert_tenant" on public.transfer_processes for insert to authenticated with check((select private.is_tenant_member(transfer_processes.tenant_id)));
create policy "processes_update_tenant" on public.transfer_processes for update to authenticated using((select private.is_tenant_member(transfer_processes.tenant_id))) with check((select private.is_tenant_member(transfer_processes.tenant_id)));
create policy "processes_delete_tenant" on public.transfer_processes for delete to authenticated using((select private.is_tenant_member(transfer_processes.tenant_id)));

create policy "documents_select_tenant" on public.process_documents for select to authenticated using((select private.is_tenant_member(process_documents.tenant_id)));
create policy "documents_insert_tenant" on public.process_documents for insert to authenticated with check((select private.is_tenant_member(process_documents.tenant_id)));
create policy "documents_update_tenant" on public.process_documents for update to authenticated using((select private.is_tenant_member(process_documents.tenant_id))) with check((select private.is_tenant_member(process_documents.tenant_id)));
create policy "documents_delete_tenant" on public.process_documents for delete to authenticated using((select private.is_tenant_member(process_documents.tenant_id)));

create policy "appointments_select_tenant" on public.appointments for select to authenticated using((select private.is_tenant_member(appointments.tenant_id)));
create policy "appointments_insert_tenant" on public.appointments for insert to authenticated with check((select private.is_tenant_member(appointments.tenant_id)));
create policy "appointments_update_tenant" on public.appointments for update to authenticated using((select private.is_tenant_member(appointments.tenant_id))) with check((select private.is_tenant_member(appointments.tenant_id)));
create policy "appointments_delete_tenant" on public.appointments for delete to authenticated using((select private.is_tenant_member(appointments.tenant_id)));

-- O primeiro membership owner será criado pelo onboarding transacional.
