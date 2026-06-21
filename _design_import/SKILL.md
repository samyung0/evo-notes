---
name: evo-notes-design
description: Use this skill to generate well-branded interfaces and assets for Evo Notes, a student study app (upload materials → GraphRAG → generate summaries/flashcards/quizzes + chat), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map
- `styles.css` — link this one file; it imports all tokens + fonts. Everything is driven by `--ev-*` custom properties.
- `tokens/` — colors, typography, spacing/radius/shadow, fonts.
- `components/core/` — reusable React primitives (`Button`, `IconButton`, `Badge`, `Avatar`, `Card`, `NoteCard`, `ProgressBar`, `Input`, `SegmentedControl`, `Tabs`, `Checkbox`, `Switch`, `Icon`). Each has a `.prompt.md` with usage.
- `ui_kits/web-app/` — full-screen recreations (Dashboard, Workspaces, opened Workspace / NotebookLM 3-col, Practice, Schedule) + interactive `index.html`.
- `guidelines/*.card.html` — foundation specimens.
- `assets/` — logo mark + lockup.

## House rules (the short version)
- Light theme: white cards on `#f2f4f3`, framed on a `#e3e9e4` sage wash. **Primary = near-black `#222`**, accents **purple `#8c7bd9`** + **green `#7bd9ab`/`#aef07f`**.
- Plus Jakarta Sans → **Fustat**; headings extrabold (800), tight tracking; sentence case; badges proper-case (never all-caps); uppercase only for tiny letter-spaced panel labels.
- **XL rounded corners and generous padding** on every card and icon button. Soft, low-contrast double shadows — reserved for the app frame and floating elements; in-grid cards rest on a border.
- Line icons only (the in-bundle `Icon`, Lucide-style) in soft-tinted rounded tiles. No emoji, no gradients, no background imagery.
- Three-column layouts are the signature; the opened-workspace view collapses nav to a 58px icon rail.

In a project that consumes this design system, load the compiled bundle and read components from `window.<Namespace>` (run the design-system check to get the exact namespace), or copy the token CSS + assets for static HTML artifacts.
