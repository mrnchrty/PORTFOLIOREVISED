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
- **Backend tests.** `cd backend && npm install && npm test` passes 6 of 6 (~200 ms), and `npm ci` works from the tracked lockfile.
- **API surface, with no credentials configured.** `GET /api/health` returns 200 with `supabaseConfigured:false` and reports only the `digicha` shop. A configured shop's catalog routes return 503 naming the missing variables; an unknown slug returns 404; the admin overview returns 401 when signed out. The API also serves the static site.
- **Interactions.** Mobile navigation toggle on all six portfolio pages (opens, sets `aria-expanded`, closes back); Projects image lightbox (opens from a `[data-preview]` trigger, advances, closes on Escape, focuses its close button); Projects work cards (expand/collapse); Discover Mabini filters (four chips, one active, 10 visible narrowing to 5); and the storefront cart against the fallback sample catalog — add, increase quantity, remove, and persist across a reload (₱80.00 → ₱160.00 → empty).
- **Signed-out guards.** Checkout scrolls to the account form and shows the setup notice, and "Sign in to place order" is disabled.

## Not verified

- **Anything needing real credentials.** Sign-in, live prices, quote calculation, payment sandbox, order history, and admin writes all require a configured Supabase project; the API returns 503 for them here by design.
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
