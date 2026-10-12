-- ============================================================================
-- DigiCha catalog seed - four categories: Mugs, Notebooks, Stickers,
-- Invitation Cards - with local product photography shipped in the project
-- under assets/images/products/.
--
-- Run AFTER schema.sql (and rls_policies.sql). Safe to re-run: it replaces
-- only its own sample rows (is_sample = true) and never touches products the
-- owner added or edited.
--
-- Prices are in Philippine pesos and are editable suggestions.
-- GCash here is a MANUAL payment: the customer uploads proof and the admin
-- verifies it. Nothing in this seed collects or verifies money.
-- ============================================================================

insert into public.shops (
  slug,
  name,
  description,
  currency,
  fulfillment_options,
  payment_methods,
  is_demo
) values (
  'digicha',
  'DigiCha',
  'DigiCha is a creative shop offering ready-made and personalized mugs, notebooks, stickers, and invitation cards for everyday use, gifts, celebrations, and special occasions.',
  'PHP',
  '[
    {"id":"pickup","label":"Pickup","enabled":true,"requires_details":false,"details_label":"Preferred pickup date and time"},
    {"id":"delivery","label":"Delivery","enabled":true,"requires_details":true,"details_label":"Complete delivery address"}
  ]'::jsonb,
  '[
    {"id":"cash_pickup","label":"Cash on Pickup","enabled":true,"instructions":"Pay in cash when you pick up your order."},
    {"id":"cod","label":"Cash on Delivery","enabled":true,"instructions":"Pay the rider in cash when your order arrives. Available within the delivery area."},
    {"id":"gcash","label":"GCash (manual)","enabled":true,"instructions":"Send the total to the shop GCash number shown after checkout, then upload your payment screenshot. The order stays Pending Payment until the shop verifies it."}
  ]'::jsonb,
  true
)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    currency = excluded.currency,
    fulfillment_options = excluded.fulfillment_options,
    payment_methods = excluded.payment_methods;

-- ---------------------------------------------------------------- categories
insert into public.categories (shop_id, name, slug, sort_order)
select shop.id, item.name, item.slug, item.sort_order
from public.shops as shop
cross join (
  values
    ('Mugs', 'mugs', 1),
    ('Notebooks', 'notebooks', 2),
    ('Stickers', 'stickers', 3),
    ('Invitation Cards', 'invitation-cards', 4)
) as item(name, slug, sort_order)
where shop.slug = 'digicha'
on conflict (shop_id, slug) do nothing;

-- Retire this seed's own earlier sample rows so re-running replaces them cleanly.
delete from public.products as product
using public.shops as shop
where product.shop_id = shop.id
  and shop.slug = 'digicha'
  and product.is_sample;

-- ------------------------------------------------------------------ products
insert into public.products (
  shop_id, category_id, name, description, price, sale_price, stock,
  available, image_url, is_sample, is_featured, options, customization, display_order
)
select
  shop.id,
  category.id,
  item.name,
  item.description,
  item.price,
  item.sale_price,
  item.stock,
  true,
  item.image_url,
  true,
  item.is_featured,
  item.options::jsonb,
  nullif(item.customization, '')::jsonb,
  item.display_order
from public.shops as shop
join (
  values
  -- ============================================================ MUGS
  ('mugs', 'Blush Blooms Ceramic Mug',
   'Ready-made 11oz glossy ceramic mug with a watercolor peony and lavender wrap. Dishwasher and microwave safe.',
   249.00, 199.00, 25, true,
   '../assets/images/products/mug-blush-blooms.jpg',
   '[]',
   '',
   1),
  ('mugs', 'Personalized Name Mug',
   'White 11oz ceramic mug printed with the name of your choice in rose-gold script. Tell us the name and pick a lettering style.',
   299.00, null, null, false,
   '../assets/images/products/mug-name-script.jpg',
   '[{"id":"lettering","label":"Lettering style","type":"single","required":true,"min_selected":1,"max_selected":1,"values":[{"id":"script","label":"Elegant script","price_delta":0,"display_price":299},{"id":"serif","label":"Classic serif","price_delta":0,"display_price":299}]}]',
   '{"text_fields":[{"id":"name","label":"Name to print","max_length":20,"required":true,"fee":0}],"allow_instructions":true}',
   2),
  ('mugs', 'Custom Photo Mug',
   'Your photo, printed to keep. Upload a clear PNG or JPG and we will fit it to an 11oz cream mug.',
   349.00, null, null, false,
   '../assets/images/products/mug-photo-print.jpg',
   '[]',
   '{"allow_image_upload":true,"image_fee":0,"allow_instructions":true,"text_fields":[{"id":"caption","label":"Optional caption","max_length":40,"required":false,"fee":25}]}',
   3),

  -- ======================================================== NOTEBOOKS
  ('notebooks', 'Lavender Fields Hardbound Notebook',
   'Ready-made A5 hardcover journal with a lavender-field watercolor cover, gold foil spine, and 120gsm cream pages.',
   289.00, null, 18, true,
   '../assets/images/products/notebook-lavender-fields.jpg',
   '[]',
   '',
   4),
  ('notebooks', 'Personalized Linen Notebook',
   'Blush linen hardcover embossed with a name in gold. A keepsake for journaling, notes, or gifting.',
   349.00, null, null, false,
   '../assets/images/products/notebook-name-cover.jpg',
   '[{"id":"pages","label":"Page style","type":"single","required":true,"min_selected":1,"max_selected":1,"values":[{"id":"lined","label":"Lined","price_delta":0,"display_price":349},{"id":"dotted","label":"Dotted","price_delta":0,"display_price":349},{"id":"blank","label":"Blank","price_delta":0,"display_price":349}]}]',
   '{"text_fields":[{"id":"name","label":"Name to emboss","max_length":18,"required":true,"fee":25}],"allow_instructions":true}',
   5),
  ('notebooks', 'Custom Cover Spiral Notebook',
   'Rose-gold spiral notebook with a cover designed from your artwork or photo. Upload a reference and describe your idea.',
   229.00, null, null, false,
   '../assets/images/products/notebook-spiral-custom.jpg',
   '[]',
   '{"allow_image_upload":true,"image_fee":50,"allow_instructions":true}',
   6),

  -- ========================================================= STICKERS
  ('stickers', 'Pastel Planner Sticker Pack',
   'Three ready-made sheets of pastel planner icons - hearts, tabs, labels, and washi strips. Matte, repositionable.',
   129.00, 99.00, 40, true,
   '../assets/images/products/sticker-planner-pack.jpg',
   '[]',
   '',
   7),
  ('stickers', 'Deco Sticker Mix',
   'Glossy die-cut butterflies, bows, rainbows, and blooms for laptops, bottles, and journals. Waterproof vinyl.',
   149.00, null, 32, true,
   '../assets/images/products/sticker-deco-pack.jpg',
   '[]',
   '',
   8),
  ('stickers', 'Custom Name Sticker Sheet',
   'A sheet of name labels in cute script with daisy accents - perfect for school supplies and gifts. Tell us the name.',
   120.00, null, null, false,
   '../assets/images/products/sticker-name-sheet.jpg',
   '[{"id":"size","label":"Sheet size","type":"single","required":true,"min_selected":1,"max_selected":1,"values":[{"id":"mini","label":"Mini sheet","price_delta":0,"display_price":120},{"id":"standard","label":"Standard sheet","price_delta":40,"display_price":160}]}]',
   '{"text_fields":[{"id":"name","label":"Name on the stickers","max_length":15,"required":true,"fee":0}],"allow_instructions":true}',
   9)

  -- Invitation Cards products are added by the next seed update, together with
  -- their local product photography (birthday, wedding, graduation suites).
) as item(category_slug, name, description, price, sale_price, stock, is_featured, image_url, options, customization, display_order)
  on true
join public.categories as category
  on category.shop_id = shop.id and category.slug = item.category_slug
where shop.slug = 'digicha';

-- Featured picks
update public.products as product
set is_featured = true
from public.shops as shop
where product.shop_id = shop.id
  and shop.slug = 'digicha'
  and product.is_sample
  and product.name in ('Blush Blooms Ceramic Mug', 'Pastel Planner Sticker Pack');

-- ------------------------------------------------------------ product images
-- One primary image per product now; the admin can add more rows per product.
delete from public.product_images as image
using public.products as product, public.shops as shop
where image.product_id = product.id
  and product.shop_id = shop.id
  and shop.slug = 'digicha'
  and product.is_sample;

insert into public.product_images (product_id, path, alt, sort_order, is_primary)
select product.id, product.image_url, product.name || ' - product photo', 0, true
from public.products as product
join public.shops as shop on shop.id = product.shop_id
where shop.slug = 'digicha'
  and product.is_sample
  and product.image_url is not null;

-- ----------------------------------------------------------------- promotion
insert into public.promotions (
  shop_id, code, name, description, discount_type, discount_value,
  applies_to, minimum_order_total, starts_at, is_active
)
select shop.id, 'WELCOME10', 'Welcome treat',
       '10% off your first DigiCha order.', 'percent', 10,
       'order', 0, now() - interval '1 day', true
from public.shops as shop
where shop.slug = 'digicha'
  and not exists (
    select 1 from public.promotions p where p.shop_id = shop.id and p.code = 'WELCOME10'
  );
