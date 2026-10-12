# Requirements status (12 October 2026)

This document separates what has actually been verified from what has not. Do not interpret the presence of a UI as proof of a working backend.

## Verified in source

- `portfolio/about/index.html`, `style.css`, `script.js` and `portfolio/resume/index.html`, `style.css`, `script.js` are separate editable pages.
- `backend/package.json`'s `npm run check` referenced the deleted `portfolio/about/about.js`; it now exits successfully.

## Verified by running it

- **Page load.** All 8 HTML pages plus the redirect root return HTTP 200 with no broken images and no unexpected console errors.
- **Responsive.** No horizontal overflow on any page at 320, 360, 390, 414, 768, or 1440px.
- **References.** Every local `href`/`src` resolves; the one removed route, `/mochajaki-shop/`, is a 404.
- **Contrast.** Every text colour on the six portfolio pages and the resume meets WCAG AA (4.5:1), measured against the background each element is actually composited onto. This includes the white text on the call-to-action buttons, whose gradients were darkened to 4.55:1 at their worst point (4.67:1 measured from the rendered pixels).
- **Backend tests.** `cd backend && npm install && npm test` passes **19 of 19**, and `npm ci` works from the tracked lockfile.
- **Same-origin guard.** The API accepts same-origin writes from Chrome and Firefox (which omit `Origin` on same-origin requests) while still rejecting cross-site ones; verified with curl against the running server and covered by 13 unit tests.
- **API surface, with no credentials configured.** `GET /api/health` returns 200 with `supabaseConfigured:false` and reports only the `digicha` shop. A configured shop's catalog routes return 503 naming the missing variables; an unknown slug returns 404; the admin overview returns 401 when signed out. The API also serves the static site.
- **Interactions.** Mobile navigation toggle on all six portfolio pages (opens, sets `aria-expanded`, closes back); Projects image lightbox (opens from a `[data-preview]` trigger, advances, closes on Escape, focuses its close button); Projects work cards (expand/collapse); Discover Mabini filters (four chips, one active, 10 visible narrowing to 5); and the storefront cart against the fallback sample catalog — add, increase quantity, remove, and persist across a reload (₱80.00 → ₱160.00 → empty).
- **Signed-out guards.** Checkout scrolls to the account form and shows the setup notice, and "Sign in to place order" is disabled.
- **Interface and backend agree.** Every endpoint the storefront and admin call (20 in total) resolves to a registered Express route, and every one of them is reached with the method its route declares. No call goes to a path that does not exist.
- **Schema and seed agree.** Parsed `database/schema.sql` as PostgreSQL (9 tables, valid) and checked every `INSERT` column in `database/seed-digicha.sql` against those tables: 0 mismatches. The staff-grant snippet in the README also matches the schema (its columns, the role check, and the `on conflict (user_id, shop_id)` target).
- **Environment agrees.** The backend reads 13 environment variables and `backend/.env.example` declares exactly those 13 — nothing missing, nothing unused.
- **Same-origin fix re-verified end to end.** Driving the real sign-in form in a browser shows the POST arriving with **no `Origin`** header and `Sec-Fetch-Site: same-origin` — the browser behaviour that caused the bug — and it now reaches the controller (503, configure Supabase) instead of being refused. Five cross-site attempts (foreign `Origin`, `cross-site` + foreign `Referer`, foreign `Referer` alone, `Origin: null` from a sandboxed frame, and no signals at all) are still refused with 403.
- **The shop driven end to end against a configured backend.** With the real API pointed at the local stand-in in `backend/tests/support/fake-supabase.js`, a browser run took the whole loop: the catalog rendered the stand-in's products (and not the built-in samples), sign-in returned `200 {"authenticated":true}` and "Welcome, Test Owner", the cart priced the item at ₱123.45, checkout quoted through `quote_shop_cart`, `POST /orders` answered 201 with `create_shop_order`'s result, the page showed "Reference: DC-1001 … Payment status: Unpaid", and an immediate reload listed DC-1001 and its line item from the database. This is the same code path the owner's project will use, exercised without any Supabase account.
- **The database access layer matches the schema.** Every table, every column named in a `select`, every field written by an `insert`/`update`, every filter, and all 8 + 5 parameters of the two RPC calls were checked against `schema.sql` and the migration: no mismatches. This is why the setup guide is safe to follow — a typo here would have surfaced only during the owner's setup.
- **The admin panel driven against the stand-in database.** Signed out, the workspace stays hidden behind the sign-in panel. Signing in with the staff account loads the workspace: role badge “admin · DigiCha”, overview stats “Recent orders 1 · Catalog entries 2 · Unpaid / pending 1”, the two stand-in products, and — notably — order DC-1001 placed minutes earlier through the storefront, read back across surfaces. Submitting the order-status form sent `PATCH /api/admin/shops/digicha/orders/…/status` (200) and the database row now reads `ready_for_pickup`; saving settings sent `PATCH …/settings` (200) and bumped the row's `updated_at`. Creating a product through the admin form returned 201 and “Admin-created Keychain · ₱95.50” joined the list; creating a promotion returned 201 and “Test launch promo · 10% off” appeared. Both then showed up on the public storefront API — the product in the catalog and LAUNCH10 in the deals feed. No page errors across any run.
- **What the four Supabase setup steps rest on.** The pieces the owner's setup depends on are each verified above: the suite passes, the API boots and answers, the guard no longer refuses its own writes, the schema parses, the seed matches the schema, and the environment template is complete. Nothing here has been exercised against a real Supabase project.

## Not verified

- **A real Supabase project.** The shop's sign-in, prices, quote, order and dashboard paths are now verified against the local stand-in described above, but no statement here was taken from a live Supabase project: the SQL has never been executed by Postgres, PostgREST's real filter and embedding semantics have not been exercised, and no email, RLS, JWT or Stripe behaviour has been observed. With credentials absent, every one of those routes still answers 503 by design.
- **The promo-code instruction is not complete.** The Digicha shop still renders a "Have a promo code?" field, and promotion logic remains in `shared/storefront.js` (55 references), `admin/admin.js` (76), `backend/controllers/adminController.js` (23), and `database/schema.sql` (87). Awaiting a decision on whether to remove it.
- **Content that only the owner can confirm**: the expected college completion year (the page shows 2027–2028), the phone number's display format, the exact TESDA certificate title, the LinkedIn slug (LinkedIn blocks automated requests — the page uses `…-2b86492a`, confirmed by the owner), and ownership of every photo. The resume's GitHub link (`https://github.com/mrnchrty`) was checked and resolves to the profile named "Maroine Charity Recaña De Roy".
- **Storefront contrast** is below AA in its own brand palette (3.75–3.82:1 on the pink buttons, 2.27–2.40:1 on the kicker text). Left unchanged deliberately; it is a separate brand decision.
- **The full list of visual asset generation and photography requirements** has not been validated.

## Recommended next steps

1. Configure `backend/.env` from `.env.example` (no secrets committed), run `database/schema.sql` then `database/seed-digicha.sql`, and repeat the cart and checkout flow against the real project.
2. Decide the promo-code question above, then either finish the removal or strike the note.
3. Confirm the owner-only content items listed under "Not verified".

## A quirk worth knowing (not a defect)

A product with a required option group is blocked by the browser's own `required` validation until an option is chosen, so the add-to-cart button appears to do nothing if the select is skipped. The native validation bubble explains it in a real browser.
