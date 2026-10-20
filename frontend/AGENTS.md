<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- The desktop-style shell (title bar, sidebar, AI drawer) lives in `src/components/vq/app-shell.tsx` and wraps `<Outlet />` in `__root.tsx`; pages render only their main canvas so navigation stays consistent.
- Shared UI primitives (Btn, Chip, Panel, StatCard, Bar, SegTabs, PageHeader…) live in `src/components/vq/primitives.tsx`; pages compose these instead of ad-hoc styled elements so the theme stays in one place.
- Theme is dark-only; all colors are oklch tokens in `src/styles.css` (surface-0..4, primary, success, warning, danger). Never use raw color utilities in components.
- The assistant is a deterministic mock in `src/lib/assistant.ts`, shared by the `/assistant` page and the drawer via `assistant-context`; swap this module to connect a real model.
- All data is local mock state in each route; nothing is persisted — VORQEN UI must never imply automatic deletion.
- Sidebar nav entries are declared in `src/components/vq/nav.ts`; every entry needs a matching route file.
