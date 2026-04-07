-- Replace single `role` with `roles text[]` (many roles per contact).
-- Run once in the Supabase SQL Editor.

alter table public.crm_contacts
  add column if not exists roles text[] not null default '{}'::text[];

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_contacts'
      and column_name = 'role'
  ) then
    update public.crm_contacts
    set roles = case
      when role is not null and btrim(role) <> '' then array[btrim(role)]
      else '{}'::text[]
    end;
    alter table public.crm_contacts drop column role;
  end if;
end $$;
