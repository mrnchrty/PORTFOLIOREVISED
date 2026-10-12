# Database

Everything here runs inside your Supabase project's **SQL Editor**. Nothing runs automatically —
the Express API only reads and writes through the keys you place in `backend/.env`.

## Run these three files, in this order

**1. `schema.sql`** — once per project.
Creates the 17 tables (`shops`, `profiles`, `staff_members`, `categories`, `products`,
`promotions`, `orders`, `order_items`, `promotion_redemptions`, `product_images`, `carts`,
`cart_items`, `customization_requests`, `messages`, `notifications`, `reviews`, `order_events`),
the SQL functions the API calls, and the updated-at triggers. It also enables Row Level Security
on every table and **revokes direct access from the browser roles** — `anon` and `authenticated`
cannot touch the data directly. Express reaches it with the server-only service-role key.
Do not expose that key to work around a frontend error.

**2. `rls_policies.sql`** — once, after the schema.
Defense-in-depth row-level policies: even if a browser-role grant were ever restored, public
visitors could read only published catalog data and customers only their own rows. The service
role (the Express API) bypasses RLS either way.

**3. `seed.sql`** — once, and safe to re-run.
Loads the DigiCha shop row, the four categories (Mugs, Notebooks, Stickers, Invitation Cards),
the sample products with their local photos from `assets/images/products/`, their option groups,
peso prices, stock, and a sale price example, plus the `WELCOME10` promo.

Paste each whole file into the SQL Editor and press **Run**. They are plain SQL, so a failure
mid-file leaves earlier statements applied — fix the message and re-run the whole file, since
all of them are written to be repeatable.

Already have an older database from this project? Back it up, then run (in order)
`migrations/001_upgrade_existing_shop_schema.sql` → `migrations/002_ecommerce_expansion.sql` →
`schema.sql` → `rls_policies.sql` → `seed.sql`. If your database already came from the current
schema, only `002` and onward are needed.

### Why there is no single combined file

`schema.sql` and `seed.sql` are the canonical sources. A combined copy would drift the
first time either one changed, so this folder deliberately keeps them separate.

## Then grant yourself admin

The admin panel needs a row in `staff_members`; without one you can sign in but every screen stays
closed (the API answers 401/403). Register your account through the storefront first, then run the
snippet in the main README under **Grant shop-admin accounts**, replacing the email with yours.

## Confirm it worked

Paste this in the SQL Editor. Expected result after the three files (and the staff grant):

| table | expected |
| --- | --- |
| `shops` | 1 |
| `categories` | 4 |
| `products` | 9 (grows as invitation-card samples land) |
| `staff_members` | 1 (only after the grant) |

```sql
select 'shops' as table_name, count(*) from public.shops
union all select 'categories', count(*) from public.categories
union all select 'products', count(*) from public.products
union all select 'staff_members', count(*) from public.staff_members
order by table_name;
```

If `shops` is 0, `seed.sql` did not complete. If `staff_members` is 0, the grant has not
been run yet — that is the usual reason the admin panel appears empty.

## Test the shop before you have a Supabase project

`backend/tests/support/fake-supabase.js` is a local stand-in for Supabase. It answers the same
PostgREST and Auth calls the API makes, over a small in-memory dataset, so the whole shop can be
driven without any account:

```bash
cd backend
npm run fake-db                       # terminal 1 — listens on 9100
SUPABASE_URL=http://localhost:9100 \
SUPABASE_ANON_KEY=demo-anon-key \
SUPABASE_SERVICE_ROLE_KEY=demo-service-role-key \
ALLOW_SAMPLE_ORDERS=true npm start    # terminal 2 — the real API, against the stand-in
```

Then open the storefront and sign in with `owner@example.com` and any password (registering
through the form also works — the stand-in behaves like a project with email autoconfirm on,
though it keeps a single canonical account). Add the
`TEST-DB` products to the cart and place an order. The dataset also seeds the `LAUNCH10`
promotion (10% off the order), so the deals section and the promo-code field can be exercised;
the stand-in's quote and order calls mirror `quote_shop_cart`'s discount rules. It exercises the real catalog, sign-in, quote,
order and dashboard code paths; the stand-in data resets when it restarts.

The same loop also runs headlessly with one command — no terminals to juggle:

```bash
cd backend && npm run test:integration
```

It boots both processes itself and walks 14 checks over HTTP: health, the catalog and deals
coming from the database, the 404/403 guards, sign-in with session cookies, a quote that applies
`LAUNCH10` (₱500 → ₱450), an order saved with the discount, the dashboard reading it back, the
admin gate, and an admin order-status write. Exit code 0 means all passed.

It is a development aid, not part of the product: it is not started by `npm start`, not run by
`npm test`, and never used in production. The dataset is checked against `schema.sql` — the two
`is_active` flags and the eight columns `create_shop_order()` returns are all mirrored here.

## From the API side

`GET /api/health` reports whether the credentials are present and which variables are missing, and
never returns key values:

```bash
cd ../backend && npm start
curl -s http://localhost:3000/api/health
```

A `supabaseConfigured: true` flag only means the URL and keys exist — it does not prove the SQL
above ran. Use the counts query for that.
