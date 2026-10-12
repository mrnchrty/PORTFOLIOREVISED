# Portfolio Content and Design Updates

## Shop header and storefront copy (13 October 2026)
- Each storefront header now carries a single account entry point at the top right: **Log In | Create Account**, separated by a divider.
- Once a customer is signed in, that same spot shows the account image with **My Account**, and opening it shows the customer profile dashboard (portrait, name, contact number, orders, and shop deals).
- The account section shows one form at a time; the header links and the in-form switch links choose between **Log In** and **Create Account**.
- Replaced the storefront descriptions with customer-facing copy and removed owner-directed setup/instruction notes that were visible on the public pages (for example “Confirm each combo before accepting real orders”, “Connect Supabase and configure the shop first”, and the project menu-reference wording). Configuration facts that visitors still need — sample listings, no payment collected, order submission unavailable — remain, in plain language.
- Removed the “Browse the shop” hero button and the other hero sign-in buttons; the header is now the single sign-in path.
- Profile images use `assets/images/account-avatar-default.svg` until a real photo is supplied.

## Applied in this revision
- Reworked About Me with a clear personal narrative and a five-image gallery.
- Each About Me image is replaceable by editing the `src` attribute in `portfolio/about/index.html`.
- Reworked Resume into a formal, readable page with a photo at the top-left, the requested name arrangement, career objectives, education, core skills, technical skills, certifications/trainings, project experience, leadership, and creative skills.
- Removed the “Aspiring Business Analyst” title and removed that phrase from the career objective. Business Analytics remains as the user's academic specialization.
- Matched About Me and Resume to the homepage's existing palette, glassmorphism, gradients, rounded surfaces, and typography. The resume remains formal and includes Print / Save as PDF.
- Kept personal information grounded in the supplied portfolio context. Items whose exact dates/title may need confirmation are noted in the resume rather than presented as verified specifics.

## Replacing About Me pictures
Open `portfolio/about/index.html` and replace the `src` value on the five `<figure class="photo-tile ...">` images. The main portrait is a separate image near the top of the page. Use image files placed in `assets/images/`, for example `../../assets/images/my-photo.jpg` from the About Me page.

## Replacing the formal resume photo
Open `portfolio/resume/index.html` and replace the `src` value for `.resume-photo` with your formal headshot. The current file is a placeholder illustration, not a real photo.

## Content to confirm before final submission
- Confirm the expected college completion year and the exact wording of the Dean's List achievement.
- Confirm the formal certificate title/date for Computer System Servicing NC II and the exact dates for the participation certificates.
- Confirm the exact role dates/titles for each organization entry and which capstone/system projects should appear as completed work.
