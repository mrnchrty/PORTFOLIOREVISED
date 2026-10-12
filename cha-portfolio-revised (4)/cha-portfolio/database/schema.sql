-- Cha portfolio shops: Supabase/PostgreSQL schema.
-- Run this file in the Supabase SQL Editor for a new project.
-- For an existing project created with the older schema, run
-- database/migrations/001_upgrade_existing_shop_schema.sql first.
-- Never expose the Supabase service-role key in browser code.

create extension if not exists pgcrypto;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = 'digicha'),
  name text not null,
  description text not null default '',
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  fulfillment_options jsonb not null default '[]'::jsonb
    check (jsonb_typeof(fulfillment_options) = 'array'),
  payment_methods jsonb not null default '[]'::jsonb
    check (jsonb_typeof(payment_methods) = 'array'),
  is_demo boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  role text not null default 'manager' check (role in ('admin', 'manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, shop_id)
);
create index if not exists staff_members_user_idx
  on public.staff_members (user_id, is_active);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (shop_id, slug),
  unique (shop_id, name)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  available boolean not null default true,
  image_url text,
  is_sample boolean not null default false,
  is_featured boolean not null default false,
  options jsonb not null default '[]'::jsonb
    check (jsonb_typeof(options) = 'array'),
  -- stock: null means made-to-order (no stock tracking); 0 means out of stock
  stock integer check (stock is null or stock >= 0),
  -- sale_price: when set and lower than price, the storefront shows the discount
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  -- customization: optional personalization config the storefront renders, e.g.
  -- {"text_fields":[{"id":"name","label":"Name to print","max_length":30,"fee":25}],
  --  "allow_image_upload":true,"image_fee":50,"allow_instructions":true}
  customization jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_shop_available_idx
  on public.products (shop_id, available, display_order);
create index if not exists products_category_idx
  on public.products (category_id);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  code text,
  name text not null,
  description text not null default '',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  applies_to text not null default 'order'
    check (applies_to in ('order', 'product', 'category')),
  product_id uuid references public.products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  minimum_order_total numeric(12, 2) not null default 0
    check (minimum_order_total >= 0),
  maximum_discount numeric(12, 2)
    check (maximum_discount is null or maximum_discount >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  maximum_redemptions integer check (maximum_redemptions is null or maximum_redemptions > 0),
  maximum_redemptions_per_customer integer
    check (maximum_redemptions_per_customer is null or maximum_redemptions_per_customer > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (
    (applies_to = 'order' and product_id is null and category_id is null)
    or (applies_to = 'product' and product_id is not null and category_id is null)
    or (applies_to = 'category' and category_id is not null and product_id is null)
  )
);
create unique index if not exists promotions_shop_code_unique_idx
  on public.promotions (shop_id, upper(trim(code)))
  where code is not null;
create index if not exists promotions_active_dates_idx
  on public.promotions (shop_id, is_active, starts_at, ends_at);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  shop_id uuid not null references public.shops(id),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_contact text not null default '',
  fulfillment_method text not null,
  fulfillment_details text not null default '',
  delivery_address text not null default '',
  delivery_instructions text not null default '',
  payment_method text not null,
  payment_proof_path text,
  courier_name text not null default '',
  tracking_number text not null default '',
  promo_code text not null default '',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null check (total >= 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in (
      'pending',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'out_for_delivery',
      'completed',
      'cancelled'
    )),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  is_test_order boolean not null default false,
  payment_session_id text unique,
  payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount)
);
create index if not exists orders_shop_created_idx
  on public.orders (shop_id, created_at desc);
create index if not exists orders_customer_created_idx
  on public.orders (customer_id, created_at desc);
create index if not exists orders_status_idx
  on public.orders (shop_id, status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  base_unit_price numeric(12, 2) not null check (base_unit_price >= 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total numeric(12, 2) not null check (line_total >= 0),
  selected_options jsonb not null default '{}'::jsonb
    check (jsonb_typeof(selected_options) = 'object')
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (promotion_id, order_id)
);
create index if not exists promotion_redemptions_customer_idx
  on public.promotion_redemptions (promotion_id, customer_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shops_set_updated_at on public.shops;
create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- An option group is JSON that can be edited with the product, for example:
-- [{"id":"size","label":"Size","type":"single","required":true,
--   "values":[{"id":"small","label":"Small","price_delta":0,"display_price":50},
--             {"id":"big","label":"Big","price_delta":20,"display_price":70}]}]
-- The server totals use price_delta; display_price is only the customer-facing label.
-- Multiple-select groups use "type":"multiple" and optional min_selected/max_selected.
create or replace function public.product_option_delta(
  p_option_groups jsonb,
  p_selected_options jsonb
)
returns numeric
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_group jsonb;
  v_value jsonb;
  v_selection jsonb;
  v_group_id text;
  v_selected_id text;
  v_selection_ids text[];
  v_selection_count integer;
  v_minimum integer;
  v_maximum integer;
  v_delta numeric(12, 2) := 0;
  v_group_exists boolean;
begin
  if jsonb_typeof(coalesce(p_option_groups, '[]'::jsonb)) <> 'array' then
    raise exception 'Product options must be a JSON array';
  end if;

  if p_selected_options is null then
    p_selected_options := '{}'::jsonb;
  end if;
  if jsonb_typeof(p_selected_options) <> 'object' then
    raise exception 'Selected product options must be a JSON object';
  end if;

  for v_group in
    select value
    from jsonb_array_elements(coalesce(p_option_groups, '[]'::jsonb)) as groups(value)
  loop
    v_group_id := v_group ->> 'id';
    if v_group_id is null or length(v_group_id) = 0 then
      raise exception 'Each product option group needs an id';
    end if;

    v_selection := p_selected_options -> v_group_id;
    v_selection_ids := array[]::text[];

    if v_group ->> 'type' = 'multiple' then
      if v_selection is not null then
        if jsonb_typeof(v_selection) <> 'array' then
          raise exception 'Option group % requires a list of selections', v_group_id;
        end if;
        select coalesce(array_agg(selected.value #>> '{}'), array[]::text[])
        into v_selection_ids
        from jsonb_array_elements(v_selection) as selected(value);
      end if;
      v_minimum := coalesce(
        nullif(v_group ->> 'min_selected', '')::integer,
        case when coalesce((v_group ->> 'required')::boolean, false) then 1 else 0 end
      );
      v_maximum := coalesce(nullif(v_group ->> 'max_selected', '')::integer, 99);
    else
      if v_selection is not null then
        if jsonb_typeof(v_selection) <> 'string' then
          raise exception 'Option group % requires one selection', v_group_id;
        end if;
        v_selection_ids := array[v_selection #>> '{}'];
      end if;
      v_minimum := case when coalesce((v_group ->> 'required')::boolean, false) then 1 else 0 end;
      v_maximum := 1;
    end if;

    v_selection_count := coalesce(cardinality(v_selection_ids), 0);
    if v_selection_count < v_minimum or v_selection_count > v_maximum then
      raise exception 'Choose a valid number of options for %', coalesce(v_group ->> 'label', v_group_id);
    end if;

    foreach v_selected_id in array v_selection_ids
    loop
      select option_value.value
      into v_value
      from jsonb_array_elements(coalesce(v_group -> 'values', '[]'::jsonb)) as option_value(value)
      where option_value.value ->> 'id' = v_selected_id
      limit 1;

      if not found then
        raise exception 'A selected option for % is no longer available', v_group_id;
      end if;
      v_delta := v_delta + coalesce(nullif(v_value ->> 'price_delta', '')::numeric, 0);
    end loop;
  end loop;

  for v_group_id in
    select key
    from jsonb_object_keys(p_selected_options) as selected(key)
  loop
    v_group_exists := false;
    for v_group in
      select value
      from jsonb_array_elements(coalesce(p_option_groups, '[]'::jsonb)) as groups(value)
    loop
      if v_group ->> 'id' = v_group_id then
        v_group_exists := true;
        exit;
      end if;
    end loop;
    if not v_group_exists then
      raise exception 'An unrecognized product option was submitted';
    end if;
  end loop;

  return v_delta;
end;
$$;

-- Server-side quote. Product prices, availability, option deltas, coupon rules,
-- redemptions, and all totals are recalculated from the database.
create or replace function public.quote_shop_cart(
  p_shop_id uuid,
  p_items jsonb,
  p_promo_code text default null,
  p_customer_id uuid default null,
  p_allow_sample boolean default false
)
returns table (
  quote_subtotal numeric,
  quote_discount numeric,
  quote_total numeric,
  applied_promotion_id uuid,
  applied_promotion_name text,
  applied_coupon_code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_product record;
  v_promotion public.promotions%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_options jsonb;
  v_option_delta numeric(12, 2);
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_eligible numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_has_promotion boolean := false;
  v_promo_code text := nullif(upper(trim(coalesce(p_promo_code, ''))), '');
  v_redemption_count integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'The cart must contain between 1 and 50 items';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items) as items(value)
  loop
    if coalesce(v_item ->> 'product_id', '') = '' then
      raise exception 'A cart item is missing its product';
    end if;
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'Item quantity must be between 1 and 99';
    end if;

    select p.id, p.shop_id, p.name,
           -- charge the sale price when one is set and lower than the list price
           case
             when p.sale_price is not null and p.sale_price < p.price then p.sale_price
             else p.price
           end as price,
           p.category_id, p.available, p.is_sample, p.options, p.stock
    into v_product
    from public.products p
    where p.id = v_product_id;

    if not found or v_product.shop_id <> p_shop_id then
      raise exception 'A cart item does not belong to this shop';
    end if;
    if not v_product.available then
      raise exception 'Product % is unavailable', v_product.name;
    end if;
    if v_product.stock is not null and v_product.stock < v_quantity then
      raise exception 'Not enough stock for %: only % left', v_product.name, v_product.stock;
    end if;
    if v_product.is_sample and not p_allow_sample then
      raise exception 'Sample catalog items cannot be ordered in this environment';
    end if;

    v_options := coalesce(v_item -> 'options', '{}'::jsonb);
    v_option_delta := public.product_option_delta(v_product.options, v_options);
    v_unit_price := v_product.price + v_option_delta;
    if v_unit_price <= 0 then
      raise exception 'A product price must be set before checkout';
    end if;
    v_subtotal := v_subtotal + round(v_unit_price * v_quantity, 2);
  end loop;

  if v_promo_code is not null then
    select p.*
    into v_promotion
    from public.promotions p
    where p.shop_id = p_shop_id
      and p.code is not null
      and upper(trim(p.code)) = v_promo_code
      and p.is_active
      and p.starts_at <= now()
      and (p.ends_at is null or p.ends_at > now())
    limit 1;

    if not found then
      raise exception 'This promo code is invalid or is not currently active';
    end if;
    v_has_promotion := true;
  else
    select p.*
    into v_promotion
    from public.promotions p
    where p.shop_id = p_shop_id
      and p.code is null
      and p.is_active
      and p.starts_at <= now()
      and (p.ends_at is null or p.ends_at > now())
      and p.minimum_order_total <= v_subtotal
    order by p.starts_at desc, p.created_at desc
    limit 1;
    v_has_promotion := found;
  end if;

  if v_has_promotion then
    if v_promotion.minimum_order_total > v_subtotal then
      raise exception 'This promotion requires a higher order subtotal';
    end if;

    select count(*)::integer
    into v_redemption_count
    from public.promotion_redemptions r
    where r.promotion_id = v_promotion.id;
    if v_promotion.maximum_redemptions is not null
      and v_redemption_count >= v_promotion.maximum_redemptions then
      if v_promo_code is not null then
        raise exception 'This promotion has reached its redemption limit';
      end if;
      v_has_promotion := false;
    end if;

    if v_has_promotion and p_customer_id is not null
      and v_promotion.maximum_redemptions_per_customer is not null then
      select count(*)::integer
      into v_redemption_count
      from public.promotion_redemptions r
      where r.promotion_id = v_promotion.id
        and r.customer_id = p_customer_id;
      if v_redemption_count >= v_promotion.maximum_redemptions_per_customer then
        if v_promo_code is not null then
          raise exception 'This customer has already used this promotion the maximum number of times';
        end if;
        v_has_promotion := false;
      end if;
    end if;
  end if;

  if v_has_promotion then
    if v_promotion.applies_to = 'order' then
      v_eligible := v_subtotal;
    else
      for v_item in
        select value
        from jsonb_array_elements(p_items) as items(value)
      loop
        v_product_id := (v_item ->> 'product_id')::uuid;
        v_quantity := (v_item ->> 'quantity')::integer;
        v_options := coalesce(v_item -> 'options', '{}'::jsonb);
        select p.id, p.price, p.category_id, p.options
        into v_product
        from public.products p
        where p.id = v_product_id and p.shop_id = p_shop_id;
        v_option_delta := public.product_option_delta(v_product.options, v_options);
        v_unit_price := v_product.price + v_option_delta;

        if (v_promotion.applies_to = 'product' and v_product.id = v_promotion.product_id)
          or (v_promotion.applies_to = 'category' and v_product.category_id = v_promotion.category_id) then
          v_eligible := v_eligible + round(v_unit_price * v_quantity, 2);
        end if;
      end loop;
    end if;

    if v_eligible <= 0 then
      if v_promo_code is not null then
        raise exception 'This promotion does not apply to items in the cart';
      end if;
      v_has_promotion := false;
    end if;
  end if;

  if v_has_promotion then
    if v_promotion.discount_type = 'percent' then
      v_discount := round(v_eligible * v_promotion.discount_value / 100, 2);
    else
      v_discount := least(v_eligible, v_promotion.discount_value);
    end if;
    if v_promotion.maximum_discount is not null then
      v_discount := least(v_discount, v_promotion.maximum_discount);
    end if;
    v_discount := least(v_discount, v_eligible, v_subtotal);
  end if;

  return query
  select
    v_subtotal,
    v_discount,
    v_subtotal - v_discount,
    case when v_has_promotion then v_promotion.id else null end,
    case when v_has_promotion then v_promotion.name else null end,
    case when v_has_promotion then v_promotion.code else null end;
end;
$$;

-- Create the order and its item snapshots atomically. Browser-supplied prices
-- and totals are not accepted by this function.
create or replace function public.create_shop_order(
  p_shop_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_contact text,
  p_fulfillment_method text,
  p_fulfillment_details text,
  p_payment_method text,
  p_promo_code text,
  p_items jsonb,
  p_allow_sample boolean default false,
  p_stripe_available boolean default false
)
returns table (
  created_order_id uuid,
  created_order_number text,
  created_subtotal numeric,
  created_discount numeric,
  created_total numeric,
  created_status text,
  created_payment_status text,
  created_promotion_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shop public.shops%rowtype;
  v_quote record;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_options jsonb;
  v_option_delta numeric(12, 2);
  v_unit_price numeric(12, 2);
  v_method jsonb;
  v_promo_lock uuid;
begin
  if p_customer_id is null then
    raise exception 'Sign in before placing an order';
  end if;
  if length(trim(coalesce(p_customer_name, ''))) < 2
    or length(p_customer_name) > 120 then
    raise exception 'Enter a valid customer name';
  end if;
  if length(trim(coalesce(p_customer_email, ''))) < 5
    or length(p_customer_email) > 254 then
    raise exception 'Enter a valid customer email';
  end if;
  if length(coalesce(p_customer_contact, '')) > 40
    or length(coalesce(p_fulfillment_details, '')) > 1000 then
    raise exception 'Contact or fulfillment details are too long';
  end if;

  select s.*
  into v_shop
  from public.shops s
  where s.id = p_shop_id and s.is_active
  for share;
  if not found then
    raise exception 'Shop is inactive or unavailable';
  end if;
  if v_shop.is_demo and not p_allow_sample then
    raise exception 'This demo shop is not enabled for live ordering';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_shop.fulfillment_options, '[]'::jsonb)) as option_item(value)
    where option_item.value ->> 'id' = p_fulfillment_method
      and coalesce((option_item.value ->> 'enabled')::boolean, true)
  ) then
    raise exception 'The selected fulfillment method is not available';
  end if;

  if p_payment_method = 'stripe' then
    if not p_stripe_available then
      raise exception 'Online payment is not configured';
    end if;
  else
    select method.value
    into v_method
    from jsonb_array_elements(coalesce(v_shop.payment_methods, '[]'::jsonb)) as method(value)
    where method.value ->> 'id' = p_payment_method
      and coalesce((method.value ->> 'enabled')::boolean, true)
    limit 1;
    if not found then
      raise exception 'The selected payment method is not available';
    end if;
  end if;

  -- Lock the products so that availability/prices/options cannot change between
  -- validation and creation of the order snapshots.
  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as items(value)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    select p.*
    into v_product
    from public.products p
    where p.id = v_product_id and p.shop_id = p_shop_id
    for update;
    if not found then
      raise exception 'A product is no longer available in this shop';
    end if;
  end loop;

  if nullif(trim(coalesce(p_promo_code, '')), '') is not null then
    select p.id
    into v_promo_lock
    from public.promotions p
    where p.shop_id = p_shop_id
      and p.code is not null
      and upper(trim(p.code)) = upper(trim(p_promo_code))
    for update;
  end if;

  select *
  into v_quote
  from public.quote_shop_cart(
    p_shop_id,
    p_items,
    p_promo_code,
    p_customer_id,
    p_allow_sample
  );

  -- Serialize redemptions of automatic promotions as well as coupon codes.
  if v_quote.applied_promotion_id is not null then
    perform 1
    from public.promotions p
    where p.id = v_quote.applied_promotion_id
    for update;

    select *
    into v_quote
    from public.quote_shop_cart(
      p_shop_id,
      p_items,
      p_promo_code,
      p_customer_id,
      p_allow_sample
    );
  end if;

  insert into public.orders (
    shop_id,
    customer_id,
    customer_name,
    customer_email,
    customer_contact,
    fulfillment_method,
    fulfillment_details,
    payment_method,
    promo_code,
    subtotal,
    discount,
    total,
    currency,
    status,
    payment_status,
    is_test_order
  ) values (
    p_shop_id,
    p_customer_id,
    trim(p_customer_name),
    lower(trim(p_customer_email)),
    trim(coalesce(p_customer_contact, '')),
    p_fulfillment_method,
    trim(coalesce(p_fulfillment_details, '')),
    p_payment_method,
    coalesce(v_quote.applied_coupon_code, ''),
    v_quote.quote_subtotal,
    v_quote.quote_discount,
    v_quote.quote_total,
    v_shop.currency,
    'pending',
    case when p_payment_method = 'stripe' then 'pending' else 'unpaid' end,
    p_allow_sample
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in
    select value
    from jsonb_array_elements(p_items) as items(value)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    v_options := coalesce(v_item -> 'options', '{}'::jsonb);

    select p.*
    into v_product
    from public.products p
    where p.id = v_product_id and p.shop_id = p_shop_id;

    v_option_delta := public.product_option_delta(v_product.options, v_options);
    v_unit_price := case
      when v_product.sale_price is not null and v_product.sale_price < v_product.price
        then v_product.sale_price
      else v_product.price
    end + v_option_delta;
    if v_unit_price < 0 then
      raise exception 'The selected options create an invalid price';
    end if;

    -- enforce and decrement tracked stock atomically
    if v_product.stock is not null then
      update public.products p
      set stock = p.stock - v_quantity
      where p.id = v_product.id and p.stock >= v_quantity;
      if not found then
        raise exception 'Not enough stock for %', v_product.name;
      end if;
    end if;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      base_unit_price,
      unit_price,
      quantity,
      line_total,
      selected_options
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.price,
      v_unit_price,
      v_quantity,
      round(v_unit_price * v_quantity, 2),
      v_options
    );
  end loop;

  if v_quote.applied_promotion_id is not null then
    insert into public.promotion_redemptions (promotion_id, customer_id, order_id)
    values (v_quote.applied_promotion_id, p_customer_id, v_order_id);
  end if;

  -- first entry of the tracking timeline
  insert into public.order_events (order_id, status, note)
  values (v_order_id, 'pending', 'Order placed');

  return query
  select
    o.id,
    o.order_number,
    o.subtotal,
    o.discount,
    o.total,
    o.status,
    o.payment_status,
    v_quote.applied_promotion_name
  from public.orders o
  where o.id = v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- E-commerce expansion: images, carts, customization, messaging, notifications,
-- reviews, and order tracking events.
-- ---------------------------------------------------------------------------

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx
  on public.product_images (product_id, sort_order);

-- One saved cart per customer per shop; items keep their customization so two
-- differently personalized copies of the same product stay separate lines.
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (shop_id, customer_id)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  selected_options jsonb not null default '{}'::jsonb,
  customization jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cart_items_cart_idx on public.cart_items (cart_id);

create table if not exists public.customization_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  details text not null,
  reference_image_path text,
  status text not null default 'pending'
    check (status in ('pending', 'quoted', 'approved', 'declined', 'closed')),
  quote_amount numeric(12, 2) check (quote_amount is null or quote_amount >= 0),
  quote_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customization_requests_shop_idx
  on public.customization_requests (shop_id, status, created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('customer', 'staff')),
  body text not null default '',
  attachment_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  check (body <> '' or attachment_path is not null)
);
create index if not exists messages_thread_idx
  on public.messages (shop_id, customer_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'general'
    check (type in ('general', 'order', 'payment', 'customization', 'message')),
  title text not null,
  body text not null default '',
  link text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_customer_idx
  on public.notifications (customer_id, shop_id, is_read, created_at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  image_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reply text not null default '',
  created_at timestamptz not null default now(),
  -- one review per purchased order item
  unique (order_item_id)
);
create index if not exists reviews_product_idx
  on public.reviews (product_id, status, created_at desc);

-- The tracking timeline: one row per status change, written by the server.
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx
  on public.order_events (order_id, created_at);

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

drop trigger if exists customization_requests_set_updated_at on public.customization_requests;
create trigger customization_requests_set_updated_at
  before update on public.customization_requests
  for each row execute function public.set_updated_at();

-- Public browser roles must not read or modify private customer/order tables.
-- Express mediates reads and writes with the server-only service-role key.
alter table public.shops enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.promotions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.customization_requests enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.order_events enable row level security;

revoke all on public.shops, public.profiles, public.staff_members, public.categories,
  public.products, public.promotions, public.orders, public.order_items,
  public.promotion_redemptions, public.product_images, public.carts, public.cart_items,
  public.customization_requests, public.messages, public.notifications, public.reviews,
  public.order_events from anon, authenticated;

grant all on public.shops, public.profiles, public.staff_members, public.categories,
  public.products, public.promotions, public.orders, public.order_items,
  public.promotion_redemptions, public.product_images, public.carts, public.cart_items,
  public.customization_requests, public.messages, public.notifications, public.reviews,
  public.order_events to service_role;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.product_option_delta(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.quote_shop_cart(uuid, jsonb, text, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.create_shop_order(uuid, uuid, text, text, text, text, text, text, text, jsonb, boolean, boolean)
  from public, anon, authenticated;

grant execute on function public.quote_shop_cart(uuid, jsonb, text, uuid, boolean) to service_role;
grant execute on function public.create_shop_order(uuid, uuid, text, text, text, text, text, text, text, jsonb, boolean, boolean)
  to service_role;
