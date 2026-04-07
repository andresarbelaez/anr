-- Add optional website / other URL for CRM contacts.
-- Run once in the Supabase SQL Editor on existing databases.

alter table public.crm_contacts
  add column if not exists website text;
