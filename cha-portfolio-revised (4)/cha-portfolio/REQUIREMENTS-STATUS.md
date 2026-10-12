# Requirements status (12 October 2026)

This package ships **one** storefront, DigiCha. The second shop was removed on request; `PORTFOLIO-CONTENT-DESIGN-UPDATES.md` lists everything that was deleted with it.

This document distinguishes verified changes from requested work that has not been verified. Do not interpret the presence of a UI as proof of a working backend.

## Verified in source
- `portfolio/about/index.html`, `style.css`, `script.js` and `portfolio/resume/index.html`, `style.css`, `script.js` are separate editable pages.
- Fixed `backend/package.json`'s `npm run check` command, which incorrectly referenced the deleted `portfolio/about/about.js`. `npm run check` now exits successfully.

## Outstanding / not verified
- The Digicha shop still contains a promo-code field, and shared storefront logic still references promo codes. The instruction to remove all promo-code functionality is **not complete**.
- Browser, responsive, and contrast checks were run on 12 October 2026 against the static preview and passed: all 9 HTML pages plus the two redirect roots return HTTP 200 with no broken images and no unexpected console errors; no horizontal overflow on those pages at 320, 360, 390, 414, 768, or 1440px; all local `href`/`src` references resolve; and every text colour on the resume page meets WCAG AA (4.5:1) against the background it is actually rendered on. Still **not** covered: end-to-end interaction tests — the checkout, cart, promo-code, and admin flows have not been exercised in a browser against a running backend, since that needs configured Supabase credentials.
- Contrast: every text colour on the six portfolio pages and the resume now meets WCAG AA (4.5:1), including white text on the gradient call-to-action buttons, whose gradients were darkened to 4.55:1 at the worst point (4.67:1 measured from the rendered pixels). The storefront still has white-on-brand-colour text below 4.5:1 in places (3.75–3.82:1 on its pink buttons and 2.27–2.40:1 on its kicker text); that is a separate brand palette and was left unchanged.
- Supabase authentication, payment verification, order persistence, and secure digital downloads require configured credentials and integration tests.
- `npm test` could not execute because required Node dependencies are not installed in this packaged workspace. Run `npm install` in `backend/` first.
- Real social profile URLs, menu/prices, certifications, actual screenshots, and image ownership must be confirmed before presenting them as verified. The resume's GitHub link (`https://github.com/mrnchrty`) was checked and resolves to the profile named “Maroine Charity Recaña De Roy”. The LinkedIn link could not be checked from this environment (LinkedIn blocks automated requests) and its slug should be confirmed in a browser.
- The full list of visual asset generation and photography requirements has not been validated.

## Recommended test steps
1. Run `cd backend && npm install && npm run check && npm test`.
2. Configure backend environment variables from `.env.example` without committing secrets.
3. Set up the PostgreSQL schema in Supabase and test authenticated API calls.
4. Test both storefronts with logged-out browsing, cart persistence, login return, price recalculation, payment sandbox and order history.
5. Review all portfolio pages at mobile and desktop widths, inspect image links, and validate social URLs.
