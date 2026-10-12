-- Migration 002: e-commerce expansion for databases created from the earlier
-- schema.sql (before stock / sale_price / carts / messaging / reviews).
--
-- Back up the Supabase database first.
-- Run this file, THEN re-run database/schema.sql (it is idempotent) so the new
-- tables, the updated create_shop_order function, triggers, and grants are
-- applied, and finally run database/rls_policies.sql and database/seed.sql.
--
-- Fresh installs do NOT need this file - schema.sql alone creates everything.

begin;

alter table if exists public.products
  add column if not exists stock integer
    check (stock is null or stock >= 0),
  add column if not exists sale_price numeric(12, 2)
    check (sale_price is null or sale_price >= 0),
  add column if not exists customization jsonb;

alter table if exists public.orders
  add column if not exists delivery_address text not null default '',
  add column if not exists delivery_instructions text not null default '',
  add column if not exists payment_proof_path text,
  add column if not exists courier_name text not null default '',
  add column if not exists tracking_number text not null default '';

commit;

-- The new tables (product_images, carts, cart_items, customization_requests,
-- messages, notifications, reviews, order_events), their indexes, triggers,
-- RLS enables, and grants are created by re-running schema.sql.
