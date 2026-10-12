# DigiCha storefront

This folder contains the standalone DigiCha storefront page, responsive black-and-pink styles, and offline catalog fallback. The page is served at `/digicha-shop/` by the shared Express app and requests catalog, account, and order services from `/api/shops/digicha`.

The catalog has four categories — Mugs, Notebooks, Stickers, and Invitation Cards — each with ready-made and personalized sample listings. Every product ships with its own local photo under `../assets/images/products/`. PHP prices, stock counts, sale prices, and option deltas are editable suggestions for owner review.

The app shares common storefront UI from `../shared/` and image slots from `../assets/`. Its catalog, customer accounts, and orders use DigiCha’s shop data, selected by the shared `SUPABASE_*` variables or the shop-specific `DIGICHA_SUPABASE_*` variables in `../backend/.env`. Run `../database/seed.sql` for the shared project or for a project dedicated to DigiCha. The seed keeps the shop in demo mode, so sample products cannot be used for live orders by default. See the parent README for setup and deployment notes.

For personalized text, the checkout notes field accepts written instructions. The storefront does not upload customer artwork; confirm files, final proof, and fulfillment with the shop owner before printing.
