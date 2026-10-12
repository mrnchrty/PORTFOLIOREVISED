# Database

Everything here runs inside your Supabase project's **SQL Editor**. Nothing runs automatically —
the Express API only reads and writes through the keys you place in `backend/.env`.

## Run these two files, in this order

**1. `schema.sql`** — once per project.
Creates the 9 tables (`shops`, `profiles`, `staff_members`, `categories`, `products`, `promotions`,
`orders`, `order_items`, `promotion_redemptions`), the SQL functions the API calls, and the
updated-at triggers. It also enables Row Level Security on all nine tables and **revokes direct
access from the browser roles** — there are deliberately no permissive policies, so `anon` and
`authenticated` cannot read the data. Express reaches it with the server-only service-role key.
Do not add policies or expose that key to work around a frontend error.

**2. `seed-digicha.sql`** — once, and safe to re-run.
Loads the DigiCha shop row, 6 categories, and 17 sample products with their option groups and
suggested prices.

Paste the whole file into the SQL Editor and press **Run**. They are plain SQL, so a failure
mid-file leaves earlier statements applied — fix the message and re-run the whole file, since
both are written to be repeatable.

Already have an older database from this project? Back it up, run
`migrations/001_upgrade_existing_shop_schema.sql`, then run `schema.sql`.

### Why there is no single combined file

`schema.sql` and `seed-digicha.sql` are the canonical sources. A combined copy would drift the
first time either one changed, so this folder deliberately keeps them separate.

## Then grant yourself admin

The admin panel needs a row in `staff_members`; without one you can sign in but every screen stays
closed (the API answers 401/403). Register your account through the storefront first, then run the
snippet in the main README under **Grant shop-admin accounts**, replacing the email with yours.

## Confirm it worked

Paste this in the SQL Editor. Expected result after the two files (and the staff grant):

| table | expected |
| --- | --- |
| `shops` | 1 |
| `categories` | 6 |
| `products` | 17 |
| `staff_members` | 1 (only after the grant) |

```sql
select 'shops' as table_name, count(*) from public.shops
union all select 'categories', count(*) from public.categories
union all select 'products', count(*) from public.products
union all select 'staff_members', count(*) from public.staff_members
order by table_name;
```

If `shops` is 0, `seed-digicha.sql` did not complete. If `staff_members` is 0, the grant has not
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

Then open the storefront, sign in with `owner@example.com` and any password, add the
`TEST-DB` products to the cart and place an order. It exercises the real catalog, sign-in, quote,
order and dashboard code paths; the stand-in data resets when it restarts.

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
