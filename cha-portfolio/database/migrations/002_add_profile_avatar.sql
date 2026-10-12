-- Adds the customer profile photo link used by the shop headers.
-- Safe to run on an existing database: the column is skipped when it is already there.
-- Run this in each Supabase project used by a shop, after database/schema.sql or the
-- earlier 001_upgrade_existing_shop_schema.sql migration.

begin;

alter table if exists public.profiles
  add column if not exists avatar_url text not null default '';

commit;
