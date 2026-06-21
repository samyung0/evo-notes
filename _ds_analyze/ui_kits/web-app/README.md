# Evo Notes — Web App UI Kit

Interactive recreation of the Evo Notes student study app. Light theme, sage-green page wash, white XL-rounded cards, near-black primary actions, purple + green accents.

## Screens
- **DashboardScreen** — classic 3-column home: sidebar · center (My notes / Workspaces / Files) · right rail (profile cluster, Quick Actions, Activity, Schedule). Mirrors the EduWay reference + wireframe variant A.
- **WorkspacesScreen** — filterable grid of courses (chapters + quiz progress) and free-form workspaces (file tags). Click a card → opens it.
- **WorkspaceOpenScreen** — NotebookLM-style 3-column: collapsed icon rail · chapter-grouped sources · open file · docked AI panel. The **Chat / Generate** segmented toggle swaps the right panel between a grounded chat (GraphRAG) and a generation config (output type · chapter scope · question count · difficulty).
- **PracticeScreen** — course-scoped quiz analytics: stat row, accuracy-by-chapter bars, recent quizzes, flashcard decks.
- **ScheduleScreen** — month calendar with event dots + a day-agenda panel (add/update events).

## Composition
Every screen composes the core primitives (`Sidebar`, `Card`, `Button`, `Badge`, `Icon`, `ProgressBar`, `SegmentedControl`, `Tabs`, `Checkbox`, `Avatar`, `Input`) from the bundle. Screens don't re-implement primitives.

## Running
`index.html` loads the compiled `_ds_bundle.js`, then mounts an interactive shell with working sidebar navigation and the Chat/Generate toggle. The app frames itself as a windowed surface ≥1280px and goes edge-to-edge below that.

## Notes
- Avatars render initials (no photo assets bundled) — pass `src` for real photos.
- The opened-workspace column dividers show resize affordances but aren't drag-wired in this kit.
