# Portfolio image paths

This folder holds **real photographs and screenshots** you add yourself. It currently contains one file:

- `NEXTGEN CERTI.png` — used in the Projects page, Certificates gallery.

Everywhere else still uses the neutral placeholder illustrations in `assets/images/`. To replace one, edit the `src` in the page and point it here, for example `../../images/meditrack.png` from `portfolio/projects/projects.html`.

Placeholders currently in use, and the slot each one stands in for:

| Placeholder | Used by |
| --- | --- |
| `cha-profile-placeholder.svg` | About Me main portrait and the first gallery tile |
| `creative-placeholder.svg` | About Me tile 2, publication previews, certificate previews, writing samples |
| `food-placeholder.svg` | About Me tile 3 (cooking or baking) |
| `mabini-placeholder.svg` | About Me tile 4, Discover Mabini |
| `project-placeholder.svg` | About Me tile 5, the MediTrack and E-Gasang previews |

The HTML already carries descriptive `alt` text for each slot, so replacing an image needs no markup change beyond the `src`.
