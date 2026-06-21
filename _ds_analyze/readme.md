# Evo Notes — Design System

Evo Notes is a study app for students. They upload or import learning materials (PDFs, docs, notes, images), which are processed into a GraphRAG / LightRAG knowledge base, then they generate **summaries, flashcards, and quizzes** and **chat** with an assistant grounded in their own sources. Work is organized into **workspaces** — either a free-form **Workspace** or a structured **Course** (chapters + quiz tracking + per-chapter performance analysis).

The product targets a teenage audience but is designed to feel friendly and modern for all ages: a light theme with a calm sage-green canvas, white XL-rounded cards, near-black primary actions, and **purple + green** accents.

## Sources

This system was derived from:
- **Wireframes** — Evo Notes lo-fi wireframes (Dashboard, Workspaces grid, opened Workspace 3-column, Practice), 2 variants each, plus responsive notes. Project: `https://claude.ai/design/p/4d4415a7-c7b1-4717-b492-35ae01bc05b1?file=Evo+Notes+Wireframes.dc.html` (file `Evo Notes Wireframes.dc.html`, sidebar in `WireSidebar.dc.html`).
- **Visual reference** — a hi-fi "EduWay" study-dashboard mockup supplied by the user: `uploads/original-ea8ff46993de03bb55086611845418a7.webp`. The color palette, card treatment, sticky-note style, and sidebar active-state come from here.
- **Color tokens** — the user supplied a DaisyUI-style palette (white bases, `#222` primary, `#8c7bd9` secondary/accent, semantic green/blue/amber/coral).

> The reader may not have access to the wireframe project; the layouts it defines are recreated in `ui_kits/web-app/`.

---

## Content fundamentals

How Evo Notes writes copy:

- **Voice — warm, plain, second person.** Address the student directly: "Ask about your sources…", "Generate quiz", "Focus on these chapters", "Back to dashboard". Encouraging, never clinical.
- **Casing — sentence case everywhere.** Buttons, headings, menu items: "Create quiz", "New course / workspace", "Add event". **Badges use proper case, never all-caps** ("Course", "Workspace"). The only uppercase is small letter-spaced eyebrow labels inside panels ("OUTPUT", "CHAPTER SCOPE").
- **Headings are short nouns.** "My notes", "Workspaces", "Quizzes", "Flashcards", "Schedule", "Quick Actions", "Activity". No verb-y page titles.
- **Labels are concrete and scannable.** Counts and metadata are terse: "6 chapters · 24 files", "10 Q · 2 days ago", "32 cards · 80% known", "B3 · Room 124". The middot ` · ` is the standard separator.
- **Verbs for actions.** Primary buttons lead with a verb: "Generate quiz", "Create quiz", "Add event", "Upload", "Retake".
- **Numbers carry meaning, not decoration.** Percentages = accuracy/progress; "x/y" = quiz score; everything else is a real count. No vanity stats.
- **Tone of AI surfaces — grounded and honest.** The chat footer reads "Answers grounded in this workspace's sources · GraphRAG". Generation is framed as scoped to chapters the student picks.
- **Emoji — none.** The brand uses line icons, never emoji.

---

## Visual foundations

**Palette.** Light, near-monochrome base with two accent families.
- Surfaces: white cards (`#fff`) on a `#f2f4f3` page, framed against a `#e3e9e4` sage wash (the outer/device background). Right rails and inset panels use `#fcfcfc`.
- Ink: `#222` primary text, `#6b6b6b` secondary, `#9a9a9a` meta, `#bcbcbc` placeholder.
- **Primary is near-black** (`#222`), not a color — CTAs, the active sidebar pill (white-on-pill, actually: white pill with dark text + soft shadow), segmented selection, send button.
- **Purple** (`#8c7bd9`) is the brand accent: notification button tint, "Ask AI", assistant header, sticky notes, badges. Tints: `#ece6f6` surface, `#5b4aa8` ink-on-tint.
- **Green** (`#7bd9ab` success, `#aef07f` saturated note) signals progress, correct, and positive sticky notes.
- Semantic: info blue `#8ec9f9`, warning amber `#ffcc61`, error coral `#f98e9e` — each with a soft tint surface and a darker ink for text. Used for type tags (Course=blue, Workspace=amber), accuracy states (green/amber/coral), and schedule dots.

**Type.** Fustat throughout — a single, rounded, friendly geometric sans (the only typeface for now). Headings are **extrabold (800)** with tight tracking (-0.02em); body is 400–500. Sizes: page title 24–28, section 16–22, body 14, meta 12, label 11 caps.

**Spacing & radius.** Generous padding is the house rule — cards 16–24px, comfortable gaps (14–16px between cards). **XL rounding everywhere:** inputs 10px, buttons/rows 12px, cards 16px, large panels 20–24px, the app frame 24px, pills/avatars fully round. Icon buttons are square with 10–12px radius and plenty of internal padding.

**Backgrounds.** Flat color only — no gradients, no patterns, no imagery behind content. Depth comes from the sage→white→card layering and soft shadows. Sticky notes are the one place a saturated fill covers a whole card.

**Shadows.** Soft, low-contrast, large-radius. The card shadow is a double layer: a 1–2px contact shadow + a wide `0 12–16px 32–44px` ambient at 4–7% opacity. Active sidebar/segmented chips get a tiny `0 1px 2px / 6%` lift. Menus/dialogs use a single `0 10px 34px / 14%` pop. Most in-grid cards rest with a **border, no shadow** — shadow is reserved for the app frame and floating elements.

**Borders.** Hairline `#e6e6e6` on cards and inputs; `#ececec` dividers. "New item" tiles use a 1.5px dashed `#d8d8d8` border on a transparent fill.

**Hover & press.** Cards lift 2px with the card shadow appearing on hover. Buttons darken slightly (filter) on hover and have a barely-there press scale. Nav rows fill to white. No color inversions, no dramatic motion.

**Animation.** Restrained. Progress/accuracy bars ease in width (`cubic-bezier(.2,.7,.2,1)`, ~0.4s); the switch knob slides; hover transitions are 0.12–0.18s. No bounces, no infinite loops, no entrance choreography in-product.

**Transparency & blur.** Essentially unused — the system is opaque and flat. Overlays (when needed) are a plain scrim, not glass.

**Layout rules.** Three-column is the signature: a fixed-width sidebar (232px) or collapsed icon rail (58px), a fluid center, and a fixed right column (348px rail / 360–372px AI panel). The opened-workspace view collapses the main nav to the icon rail to relieve crowding and makes the source/AI columns resizable. Responsive: tablet → icon rail + stacked panels; phone → top-bar menu nav (no bottom tabs), single column.

**Imagery.** Photographic avatars are circular and warm-toned in the reference; this system ships initials-fallback avatars. No illustration style is defined — keep surfaces clean and let color + type carry the friendliness.

---

## Iconography

- **Line icons, Lucide-style geometry.** 24×24 grid, ~1.8px stroke, round caps and joins, `currentColor` stroke, no fills. Shipped as the in-bundle `Icon` component (`components/core/Icon.jsx`) — **no CDN dependency**, so icons render offline and inherit text color.
- Coverage: nav (dashboard, workspaces, practice, schedule, files, tasks, notes, profile, settings, logout), actions (plus, minus, upload, send, search, sparkles, check, more, filter), content (book, flashcards, quiz, message, bell, clock), and chevrons/arrows.
- **Icon tiles** — in cards and quick actions, an icon sits in a small (26–38px) rounded tile filled with a soft semantic tint (info/green/purple/amber), icon in the matching darker ink. This is the brand's signature "iconographic" motif.
- **No emoji, no icon font, no png icons.** If a glyph is missing, add a path to the `Icon` set rather than reaching for another system. The closest external match is **Lucide** — substitute from there and keep the 1.8 stroke weight.
- The Evo Notes **logo** is a dark rounded tile with an "E" of three bars (one tinted green) and a small purple spark — see `assets/logo-mark.svg` and `assets/logo-lockup.svg`. In dense chrome it reduces to a dark `E` tile.

---

## Index / manifest

**Foundations**
- `styles.css` — global entry (imports only). Link this one file.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `fonts.css` · `base.css` — CSS custom properties (`--ev-*` base + semantic aliases) and `@font-face`.
- `guidelines/*.card.html` — foundation specimen cards (Colors, Type, Spacing, Brand) for the Design System tab.

**Assets**
- `assets/logo-mark.svg`, `assets/logo-lockup.svg`.

**Components** (`components/core/`) — `Icon`, `Button`, `IconButton`, `Badge`, `Avatar`, `ProgressBar`, `Input`, `SegmentedControl`, `Tabs`, `Card`, `NoteCard`, `Checkbox`, `Switch`. Each has `.jsx` + `.d.ts` + `.prompt.md`; cards in `buttons.card.html`, `data-display.card.html`.

**UI kit** (`ui_kits/web-app/`) — `Sidebar` + `DashboardScreen`, `WorkspacesScreen`, `WorkspaceOpenScreen`, `QuizScreen` (All quizzes card grid + Past attempts data table, on the workspaces-style inset surface), `FlashcardsScreen` (deck library), `ScheduleScreen`, interactive `index.html`, `README.md`.

**Skill** — `SKILL.md` (Agent-Skill compatible).

*Generated by the compiler (do not edit): `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`.*
