# Requirements status (12 October 2026)

This document distinguishes verified changes from requested work that has not been verified. Do not interpret the presence of a UI as proof of a working backend.

## Verified in source
- `portfolio/about/index.html`, `style.css`, `script.js` and `portfolio/resume/index.html`, `style.css`, `script.js` are separate editable pages.
- Fixed `backend/package.json`'s `npm run check` command, which incorrectly referenced the deleted `portfolio/about/about.js`. `npm run check` now exits successfully.

- Storefront headers use a single account entry point (Log In | Create Account, then the account image with My Account), and owner-directed instruction text was removed from the visitor-facing shop copy. `backend/tests/storefront-account.test.js` covers both states with a stubbed session; the signed-in state has still **not** been exercised against a live Supabase project.

## Outstanding / not verified
- The Digicha shop still contains a promo-code field, and shared storefront logic still references promo codes. The instruction to remove all promo-code functionality is **not complete**.
- The provided project has not undergone browser interaction, accessibility, responsive, or end-to-end tests.
- Supabase authentication, payment verification, order persistence, and secure digital downloads require configured credentials and integration tests.
- `npm test` needs dependencies from `backend/`; after `npm install` it runs the Supabase isolation tests plus the storefront account-header checks in jsdom. The packaged workspace ships without `node_modules`.
- Real social profile URLs, menu/prices, certifications, actual screenshots, and image ownership must be confirmed before presenting them as verified.
- The full list of visual asset generation and photography requirements has not been validated.

## Recommended test steps
1. Run `cd backend && npm install && npm run check && npm test`.
2. Configure backend environment variables from `.env.example` without committing secrets.
3. Set up the PostgreSQL schema in Supabase and test authenticated API calls.
4. Test both storefronts with logged-out browsing, cart persistence, login return, price recalculation, payment sandbox and order history.
5. Review all portfolio pages at mobile and desktop widths, inspect image links, and validate social URLs.
