# Cha’s portfolio and shop system

A readable, responsive portfolio and one independently styled storefront. The portfolio uses semantic HTML, CSS, and vanilla JavaScript; the ordering API uses Node.js 18+, Express, Supabase Auth/PostgreSQL, and optional Stripe-hosted Checkout. It uses a single Supabase project.

The two front ends are organized into separate `portfolio/` and `digicha-shop/` folders. They share this project’s Express backend and common UI/assets; the portfolio’s shop button links to the sibling shop folder. The source is intentionally kept editable: HTML files are full documents from `<!doctype html>` through their footers, and CSS, browser JavaScript, server code, and SQL remain separate, unminified files.

## Project contents

- **Home** — a screenshot-inspired Y2K glassmorphism hero with a portrait image slot and the four-item main navigation.
- **About Me** — brief introduction, seven years in Mabini, a five-image gallery, and the supplied interests and games as text-first labels. Resume information lives on its own page, which has a **Resume** entry in the main navigation.
- **Projects** — scrollable System Development, Graphics (Publication Materials and Certificates), and Writing galleries. Empty image slots, hover/tap descriptions, and an accessible image-preview dialog are included.
- **Discover Mabini** — short municipality history, resorts and places to research, the requested café names, map searches, and a reminder to check current local information. The guide does not claim personal visits.
- **Shop directory** — the “Visit” link opens the storefront in a new tab.
- **DigiCha** — the storefront, with catalog search/filtering, product options, carts, server quotes, suggestions, a customer dashboard, and order tracking. It can show configured promotions.
- **Admin** — shop-specific staff-only catalog, order-status, promotion, and settings screens. Admin sign-ins and staff permissions are checked against the selected shop’s Supabase project.
- **Express API / SQL** — server-side database and Auth client, HttpOnly session cookies, server-calculated PHP totals, order snapshots, optional Stripe Checkout, schema, and a starter seed.

## Folder map

```text
portfolio/                        portfolio pages, galleries, and shop directory
  index.html                       portfolio homepage
  resume/                          standalone resume page: contact block,
                                   educational background, core skills, tech stack,
                                   project experience, certifications, leadership
  about/                           About Me, gallery, and interests
  projects/                        project and article galleries
  mabini/                           Discover Mabini
  shops/                            Shop directory linking to the storefront folder
digicha-shop/                       DigiCha standalone storefront files
admin/                              protected shop admin interface
shared/                             shared storefront UI and API helpers
assets/icons/                       technology and platform logo SVGs
assets/images/                      blank image slots
backend/                             Express API, auth, admin, and payment logic
database/                            schema, seed, and migration
```

## Run locally

Requirements: Node.js 18 or newer, npm, and a Supabase project configured for the shop.

1. Extract the ZIP and open the `cha-portfolio` folder in a terminal.
2. Install the server dependencies:

   ```bash
   cd backend
   npm ci
   ```

3. Copy `backend/.env.example` to `backend/.env` and fill in the shared Supabase settings below. Never put service-role keys in frontend code or commit `.env`.
4. In the Supabase project's SQL Editor:
   - For a new project, run `database/schema.sql`.
   - If this is an existing project created with the older schema in this package, back up the database, run `database/migrations/001_upgrade_existing_shop_schema.sql`, then run `database/schema.sql`.
   - Then run `database/seed-digicha.sql`.
6. Start Express from the `backend` folder:

   ```bash
   npm start
   ```

7. Open `http://localhost:3000`. Check `http://localhost:3000/api/health` for the configuration flag and `supabaseMissingSettings` variable-name list. The health response never returns key values. A configured flag only means the URL/keys are present; it does not prove SQL, Auth, or payment setup is complete. The server loads `backend/.env` relative to `backend/server.js`, even if launched from another working directory.

**Run `database/seed-digicha.sql` once in the project.** If an older combined seed was already applied, back up and review its data before removing anything.

For Node watch mode, use `npm run dev`. Run `npm run check` in `backend/` to syntax-check the server, routes, and browser JavaScript; `npm test` runs local tests for Supabase configuration and shop-scoped sessions.

## Supabase and authentication setup

For one shared project, set these values in `backend/.env`:

```dotenv
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=your_public_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

For separate projects, set the shop-specific values below:

```dotenv
PORT=3000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
PUBLIC_APP_URL=http://localhost:3000

DIGICHA_SUPABASE_URL=https://YOUR-DIGICHA-PROJECT-REF.supabase.co
DIGICHA_SUPABASE_ANON_KEY=your_digicha_public_anon_or_publishable_key
DIGICHA_SUPABASE_SERVICE_ROLE_KEY=your_digicha_server_only_service_role_key

ALLOW_SAMPLE_ORDERS=true
```

- The DigiCha variables point to the shop’s project. The application selects the project by the storefront URL’s shop slug; the shared `SUPABASE_*` values are the fallback when the DigiCha variables are unset or still placeholders.
- Enable the email/password provider in the Supabase Auth project. Configure confirmation email delivery as needed and set the Site URL to the deployed site origin (for local development, `http://localhost:3000`).
- The public/anon key is used by the server for Auth calls; the **service-role key is server-only** for database operations. Keep it in `.env` or your host’s secret manager, never in frontend code, GitHub, or chat.
- Accounts live in that one project. Sessions use shop-specific HttpOnly cookies, so the cookie names stay stable if a second shop is ever added.
- `FRONTEND_ORIGIN` is an optional extra allowed browser origin if the frontend and API are deployed on different origins. Same-origin requests are accepted automatically. Use the exact HTTPS origin in a real deployment.
- `ALLOW_SAMPLE_ORDERS=true` works only outside `NODE_ENV=production`. Development orders remain test/unpaid orders. GCash, Maya, and Other are manual selection labels; they do not transfer funds or verify that a customer paid.
- Production cookies require HTTPS. Use a trusted HTTPS host and set `NODE_ENV=production` before launch.

The schema enables Row Level Security and revokes direct table access from browser roles. Express selects the server-side project and mediates authenticated profile/order/admin requests. Do not weaken RLS or expose a service-role key to make a frontend request work.

### Grant shop-admin accounts

The customer account and the staff membership must exist in the same project.

1. Register the owner through that shop’s storefront and confirm the email if the project’s Auth settings require confirmation.
2. In the project’s SQL Editor, run the staff insert below; replace the email with the owner’s account email in that project:

   ```sql
   insert into public.staff_members (user_id, shop_id, role, is_active)
   select auth_user.id, shop.id, 'admin', true
   from auth.users as auth_user
   join public.shops as shop on shop.slug = 'digicha'
   where lower(auth_user.email) = lower('real-account@example.com')
   on conflict (user_id, shop_id)
   do update set role = excluded.role, is_active = true;
   ```

3. Visit `admin/admin.html?shop=digicha` and sign in using that account. The customer dashboard only shows the admin link for a staff account in the shop’s project.

A staff member manages the shop’s products, order fulfillment status, promotions, and settings. Categories are selected from the shop’s database; category creation is not included in the admin UI. Add a category through the selected Supabase project’s SQL Editor using the correct `shop_id`, then refresh the admin page.

## Catalog, orders, and totals

- Products, categories, promotions, settings, users, profiles, and orders are held in the shop’s Supabase project, and DigiCha API routes read and write only that shop’s data.
- `POST /api/shops/:slug/quote` recalculates price, product options, and promotion eligibility from the selected shop’s Supabase project. `POST /api/shops/:slug/orders` calculates again inside that project’s `create_shop_order` SQL function and saves the order plus line-item snapshots atomically. Browser-supplied totals are not accepted.
- Customer accounts use the project’s Supabase Auth with server-managed HttpOnly cookies named per shop. Order history is restricted to the signed-in customer in that project. Admin order-state changes update only that shop’s database.
- Manual GCash, Maya, and Other methods create **unpaid** orders. Add verified account instructions to each shop’s settings only when ready; the admin cannot mark manual orders paid. This project does not receive or verify manual transfers.
- The seed file has no promotions. Only configured, active, in-date offers appear; fixed discount amounts, minimums, and totals use the shop currency (seeded as PHP) and are rechecked by the server.
- DigiCha’s editable sample catalog includes at least three listings each for stickers, mugs, keychains, tarpaulins, and certificates, plus the previously requested personalized notebook and pen/mug set. The sample prices/options are suggestions, and product specifications and images remain replaceable.
- DigiCha product options demonstrate editable size, finish, print, and layout choices; its checkout notes field accepts the customer’s written personalization/fulfillment details. Do not promise artwork upload; files and final proofs must be arranged with the shop.
- Both seeds keep each shop in demo mode; newly suggested rows are `is_sample`. Before launch, review product names/prices/options and replace image slots, mark only confirmed products as non-samples, configure real fulfillment/payment settings, and turn off demo mode. Manual payments still remain unpaid until verified separately.
- Storefront suggestions show available catalog rows, prefer shop-featured items, and avoid items already in the current cart when possible. They use catalog/cart state only, not fabricated sales history or customer profiling.
- Product-image paths still point to blank, clearly replaceable image-slot SVGs—not product artwork. No active discount values are seeded because no offer amounts or terms were provided.

### Optional Stripe Checkout

Stripe is not enabled unless its server secrets are configured and a shop owner selects the online payment method. The Stripe account/webhook keys are configured separately from the two Supabase projects; Stripe Checkout is optional and does not combine the stores’ database records.

For a Stripe test setup, add to `backend/.env`:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_APP_URL=https://your-public-https-host.example
```

Configure the Stripe webhook endpoint at `https://your-public-https-host.example/api/payments/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`. The server verifies webhook signatures and saved order/session amounts, then routes each event to the database named by that session’s `shop_slug`. Use a test-mode secret key with sample products; live Stripe checkout rejects sample products. Test success, cancellation, delayed/failed payment, webhook delivery, and currency support before launch. Never enter a Stripe secret in the browser or admin form.

Without Stripe credentials, checkout only offers configured manual methods and reports the order as unpaid. No card data is collected by this site.

## Replace personal, project, and shop images

The supplied replacement files under `assets/images/` are intentionally blank, labelled slots. No generated product photographs, fabricated project screenshots, or search-result replacement photos are included. Replace the `src` path in the relevant HTML or the product’s `image_url` with your own file.

Suggested paths already called out in the HTML:

- Portrait: `assets/images/cha-profile.jpg` (home/about HTML)
- Mabini feature: `assets/images/mabini/coastline.jpg`
- MediTrack: `assets/images/projects/meditrack.png`
- E-Gasang: `assets/images/projects/e-gasang.png`
- Publication materials: `assets/images/graphics/publication-01.jpg` through `publication-03.jpg`
- Certificates: `assets/images/certificates/certificate-01.jpg` through `certificate-03.jpg`
- Writing images: `assets/images/writing/ripple-guild-01.jpg`, `article-02.jpg`, and `article-03.jpg`
- Store banner: `assets/images/shops/digicha-banner.jpg`

For shop products, upload the image to the matching project’s public storage bucket or another HTTPS host and set `products.image_url` in that shop database. A root-relative project path such as `/assets/images/shops/your-product.jpg` also works. The admin editor stores a path/URL but does not upload image files. Add useful alternative text when replacing portfolio `<img>` elements. Preserve certificate proportions (`object-fit: contain`).

For a résumé file, place your real PDF at `assets/documents/cha-resume.pdf` only if you want to retain it in your project records. The site has a standalone Resume page and no download button; the Print / Save as PDF button was removed on request. The Resume page carries the contact block, so the phone and email rows there are live `tel:` and `mailto:` links.

## Content and source notes

- Only the navigation items **Home, About Me, Projects, Shop** appear in the portfolio navigation. “Discover Mabini” is an About Me feature and a linked informational page, not a navigation tab.
- The Resume page carries the live profile links: GitHub `https://github.com/mrnchrty` and LinkedIn `https://www.linkedin.com/in/maroine-charity-de-roy-2b86492a/`. Its contact, skill, and section marks are local SVGs in `assets/icons/` (see `ASSET-SOURCES.md`); the About Me page's own icons are described below. The supplied game titles are shown as text-first labels (with a local Roblox mark); no game artwork or additional titles are guessed.
- The Mabini page includes the café names **Amaro, Xentea, Alwan, El Raffis, and But First Coffee** as requested. Search links are not a claim that a café is currently at a particular address or open.
- The history note links to the Municipality of Bauan’s history page: <https://bauan.gov.ph/history/>. Resort/operator references include <https://vivereazure.com/>, the Aiyanar PADI listing at <https://www.padi.com/dive-center/philippines/aiyanar-beach-dive-resort/>, and Camp Netanya’s public page at <https://www.facebook.com/campnetanya/>. Other “Search on Maps” links are search queries; confirm each business, current facilities, and access directly. The page does not claim personal visits.
- The referenced PDF and grading rubric were not present in the workspace. Replace or verify all education, experience, project, and biographical details before publishing.

## Current limitations and launch checklist

Before launch, provide actual profile/project/certificate/writing and shop-product images; confirm DigiCha prices, options, and availability; and configure fulfillment, GCash/Maya instructions, privacy/terms, and any real discount rules. No Supabase or Stripe credentials, payment account details, or product photos were supplied for this revision.

The following are **not** implemented or confirmed: live payment collection, manual-payment verification, email receipts/order notifications, password recovery, shipping/tax/fee calculation, stock quantity/reservation, automatic digital-file delivery, category editing, image uploads, or a privacy/retention policy specific to a live business. The supplied PDF/rubric could not be checked. Neither Supabase nor Stripe was connected to a user-owned account; run the setup and test the project before using real orders.

## API route overview

- `GET /api/health` — reports whether the Supabase configuration is present, plus the shop flag.
- Shop-specific auth: `POST /api/shops/:slug/auth/register`, `/login`, `/logout`, `GET /me`, and `PATCH /profile`.
- Catalog/order: `GET /api/shops/:slug/products`, `/deals`, `/checkout-config`, `POST /quote`, `GET /dashboard`, and `POST /orders`.
- Shop-specific Stripe status: `GET /api/shops/:slug/payments/sessions/:sessionId`; shared signed webhook: `POST /api/payments/webhook`.
- Admin: `GET /api/admin/shops/:slug/overview`, `PATCH /api/admin/shops/:slug/settings`, and product/order/promotion management under `/api/admin/shops/:slug/...`.
