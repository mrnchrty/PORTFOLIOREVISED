-- ============================================================================
-- Row Level Security policies for the DigiCha shop.
--
-- Run AFTER schema.sql, in the Supabase SQL Editor.
--
-- The security model has two layers:
--   1. schema.sql enables RLS on every table and REVOKES all table access from
--      the browser roles (anon, authenticated). The Express API reads and
--      writes through the server-only service-role key, which bypasses RLS.
--      That alone keeps every table closed to the browser.
--   2. This file adds explicit policies as defense in depth, so that even if a
--      grant were ever restored to the browser roles, each role could still
--      reach only what it is supposed to see:
--        - public visitors: published products, images, categories, active
--          deals, approved reviews
--        - customers: only their own rows (profile, cart, orders, messages,
--          notifications, reviews, customization requests)
--        - administration: only through the server; no browser-role policy
--          grants write access to catalog, orders, or settings
--
-- Policies are permissive and scoped per command. With the revokes from
-- schema.sql still in place these policies simply never come into play.
-- ============================================================================

-- ---- helper: is the current auth user an active staff member of the shop ----
create or replace function public.is_shop_staff(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.shop_id = p_shop_id
      and sm.user_id = auth.uid()
      and sm.is_active
  );
$$;

revoke execute on function public.is_shop_staff(uuid) from public, anon;
grant execute on function public.is_shop_staff(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- public reads
drop policy if exists shops_public_read on public.shops;
create policy shops_public_read on public.shops
  for select using (is_active);

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (true);

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (available);

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.available
    )
  );

drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions
  for select using (
    is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select using (status = 'approved');

-- ------------------------------------------------------------- customer: own data
drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists carts_own on public.carts;
create policy carts_own on public.carts
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists cart_items_own on public.cart_items;
create policy cart_items_own on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.customer_id = auth.uid())
  ) with check (
    exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.customer_id = auth.uid())
  );

drop policy if exists orders_own_read on public.orders;
create policy orders_own_read on public.orders
  for select using (customer_id = auth.uid() or public.is_shop_staff(shop_id));

drop policy if exists order_items_own_read on public.order_items;
create policy order_items_own_read on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.customer_id = auth.uid() or public.is_shop_staff(o.shop_id))
    )
  );

drop policy if exists order_events_own_read on public.order_events;
create policy order_events_own_read on public.order_events
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (o.customer_id = auth.uid() or public.is_shop_staff(o.shop_id))
    )
  );

drop policy if exists customization_requests_own on public.customization_requests;
create policy customization_requests_own on public.customization_requests
  for all using (customer_id = auth.uid() or public.is_shop_staff(shop_id))
  with check (customer_id = auth.uid() or public.is_shop_staff(shop_id));

drop policy if exists messages_own on public.messages;
create policy messages_own on public.messages
  for all using (customer_id = auth.uid() or public.is_shop_staff(shop_id))
  with check (customer_id = auth.uid() or public.is_shop_staff(shop_id));

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for select using (customer_id = auth.uid());

drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
  for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists reviews_own_write on public.reviews;
create policy reviews_own_write on public.reviews
  for insert with check (customer_id = auth.uid());

drop policy if exists reviews_own_read on public.reviews;
create policy reviews_own_read on public.reviews
  for select using (customer_id = auth.uid() or public.is_shop_staff(shop_id));

drop policy if exists staff_members_self_read on public.staff_members;
create policy staff_members_self_read on public.staff_members
  for select using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- No browser-role policy grants INSERT/UPDATE/DELETE on shops, categories,
-- products, product_images, promotions, orders (writes), order_items,
-- order_events, or staff_members. Those writes happen only through the
-- Express API with the service-role key, which validates prices, stock,
-- payments, and staff membership first. Do not add such policies to make a
-- frontend call work - route it through the API instead.
-- ----------------------------------------------------------------------------
