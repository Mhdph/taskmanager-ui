# Gr8r Studio

A calm, structured project management workspace: home dashboard, inbox, my tasks, projects with
board / list / table / calendar / timeline / files views, members, teams, activity and settings.

Built with [SvelteKit](https://kit.svelte.dev) (Svelte 5 runes), TypeScript and CSS,
deployed to [Vercel](https://vercel.com). The workspace state lives in a runes store
persisted to `localStorage`. Shell, sidebar and task lists are idiomatic Svelte
components with `onclick` handlers; remaining page templates render from the store
through `{@html}` bridges and stay interactive through the `data-a` action delegation.

![Gr8r Studio home dashboard](docs/preview.png)

## Getting started

Requires Node.js 18 or newer (`.nvmrc` pins 22).

```bash
npm install
npm run dev       # http://localhost:5173 with hot reload
npm run build     # production build (adapter-vercel)
npm run check     # svelte-check type gate (must stay at 0 errors)
npm run lint      # ESLint
npm run format    # Prettier
```

## Live mode (taskmanager-api)

Without a backend the app runs on its bundled demo seed exactly as before. When
an identity is configured it hydrates the workspace from the Go API
(`../taskmanager-api`) and every mutation (tasks, labels, comments,
attachments, dependencies, favorites, saved views, teams, members, bulk ops,
reordering) is forwarded to the server.

For local development the API starts with a dev identity resolver (the hosted
platform stays the auth source of truth in production):

```bash
cd ../taskmanager-api
IDENTITY_DEV_MODE=true APP_PORT=8080 \
DATABASE_URL=postgres://… ./taskmanager-api
```

The UI proxies same-origin `/api/*` to `http://localhost:8080`
(`vite.config.js`; override the target with `VITE_API_URL_INTERNAL`, or point
`VITE_API_URL` at a remote base URL). Identity headers come from:

1. `localStorage.gr8r.api` → `{"apiKey","userId","appId"}` (set from the console),
2. build-time `VITE_API_TOKEN` / `VITE_API_USER` / `VITE_API_APP`,
3. a built-in dev identity (`dev-user`, `dev-tenant`) so `npm run dev`
   against an API started with `IDENTITY_DEV_MODE=true` works out of the box.

Contract notes: UI ids are the server UUIDs; board statuses map by name and
category (`Backlog/To Do/In Progress/Review/Done` slots fall back gracefully
for custom statuses); subtasks are child tasks (`parentTaskId`); estimates are
seconds (`'2d'` ↔ `172800`); recurrence values are lowercase on the wire.
Notifications, invites, files-page uploads, calendar events and invoices remain
client-side demonstration data — they belong to the hosted platform, not this
API. There is **no demo fallback in live mode**: if the API is unreachable at
startup the workspace stays empty and a blocking "Can't reach the workspace
server" screen is shown (Try again re-runs hydration) — made-up data is never
displayed while the backend is down.

## Routes

Real URLs replace the old in-memory router. `src/lib/router.js` maps between legacy
route names and paths (`go('project', { id, tab })` → `/projects/p1/board`).

| URL                                                                                                 | Content                                                                                        |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/`                                                                                                 | Home dashboard                                                                                 |
| `/inbox` `/my-tasks` `/favorites` `/notifications`                                                  | Personal queues                                                                                |
| `/overview` `/projects` `/tasks` `/calendar` `/timeline` `/members` `/teams` `/activity` `/archive` | Workspace pages                                                                                |
| `/projects/[id]/[[tab]]`                                                                            | Project tabs: `overview board list table calendar timeline files activity` + saved views `v:…` |
| `/members/[id]` `/teams/[id]`                                                                       | Member / team detail                                                                           |
| `/search`                                                                                           | Search (`?q=` `?cat=`)                                                                         |
| `/settings`                                                                                         | Settings (`?sec=`)                                                                             |
| `/login` `/signup` `/forgot` `/reset` `/verify` `/onboarding`                                       | Auth takeover                                                                                  |
| `/system` `/states`                                                                                 | Design system                                                                                  |

## Project structure

```
static/favicon.svg    brand mark
vite.config.js        Vite + SvelteKit config (adapter-vercel), including the Lucide icon-subset plugin
eslint.config.js      lint rules (ESLint flat config); formatting by Prettier (.prettierrc.json)
.github/workflows/    CI: lint, format check, build
docs/preview.png      README screenshot
src/
  app.html            SvelteKit document shell (fonts, favicon)
  routes/             file-based routing: +layout.svelte (app shell) + one +page.svelte per URL
  lib/
    state.svelte.ts   canonical runes store (`S`, selectors, `save()` persistence)
    router.ts         route <-> URL map, `go()`, `setRoute()`, `syncRouteToStore()`
    tick.svelte.ts    post-mutation render tick for layout-level effects
    types.ts          shared domain/action types (`Task`, `ActionTable`, …)
    events.ts         `popClick()` onclick wrapper for popover triggers
    components/       idiomatic Svelte: Sidebar, Topbar, BottomNav, TaskList,
                      TaskRow (all `onclick`); OverlayLayer, AuthView (bridges)
  styles/             design tokens + all app CSS (loaded by the layout)
  core/               utilities, constants, icons, theme (`store.ts` re-exports the runes store)
  data/seed.js        demo workspace data
  ui/                 shared render helpers, toasts, the select dropdown
  shell/              render loop (Svelte-aware), skeletons, view engine
  components/         task list renderer
  pages/              one HTML module per route (rendered through `{@html}`)
  views/              project views: board, table, calendar, timeline, files, overview
  overlays/           task drawer, modals, popovers, context menu, command palette
  features/           teams, subtasks, archive (rendering)
  actions/            user actions, event wiring, keyboard shortcuts, drag and drop
```

### Layers

Dependencies point downward:

1. `lib/state.svelte.js`, `core/` and `data/` depend on nothing else in the app.
2. `ui/`, `shell/`, `components/`, `pages/`, `views/`, `overlays/` and `features/` render HTML from state.
3. `actions/` change state; every mutation flows through runes reactivity, and the
   layout `$effect` runs post-render enhancements (custom selects, popover
   placement, focus restore, one-shot motion cleanup).

### TypeScript

The codebase is TypeScript (`strict: false`, `npm run check` is the gate, also
enforced by CI). Conventions for the migrated legacy modules:

- Action tables are `ActionTable`; route params are `RouteParams`; tasks are
  `Task` (`src/lib/types.ts`). Untyped pockets use `Record<string, any>`,
  tightened incrementally — never `as` casts inside template literals.
- `$` returns `any` (it queries every element kind); `$$<T>()` is typed, as
  are `closestEl()` and the `querySelectorAll<T>()` call sites.
- SvelteKit v3 notes: config lives in `vite.config.js` (`sveltekit({ … })`),
  `$app/environment` is `$app/env`, `goto()` takes no scroll/focus options,
  `#lib/*` subpath imports need the matching `tsconfig.json` `paths` entry,
  and `.svelte.ts` modules are imported via their `.svelte.js` specifier.

### Rendering notes

- **Runes rule:** never mutate state inside `$derived` or template expressions
  (`state_unsafe_mutation`). Lazy seeding lives in `ensureView()` /
  `setRoute()` / route scripts, which run outside render. The palette's flat
  item list lives in module-level `PAL_FLAT` for the same reason.
- **Idiomatic components** (`Sidebar`, `Topbar`, `BottomNav`, `TaskList`,
  `TaskRow`, My Tasks page) use real Svelte markup with `onclick`. Popover
  triggers go through `popClick()`, which stops propagation: otherwise the
  legacy document delegation (registered first, running last on bubble)
  would see the fresh `S.ui.pop` with no `data-a` ancestor and close it.
  Drag-and-drop, context menus and `data-in`/`data-blur` inputs still use
  document delegation via their `data-*` attributes.
- **Interactions:** elements declare `data-a="actionName"`. `actions/events.js`
  delegates the click to `A.actionName`. Inputs use `data-in`, blur handlers use `data-blur`.
- **SSR is off** (`ssr: false` in `src/routes/+layout.js`): the store is a
  `localStorage`-backed singleton, so pages render in the browser. SvelteKit
  still provides routing, deep links, history and code-splitting. Top-level DOM
  listeners are `SSR_GUARD`-wrapped so the module graph stays import-safe.
- **Layout:** every page edge uses `var(--gutter)`, so the breadcrumb, page header, toolbar,
  list, table and board start on the same line.
- **Dropdowns:** write a normal `<select class="select">`. `ui/select.js` renders it as the
  design-system menu and keeps the native element as the source of truth.
- **Icons:** call `ic('name')` with any [Lucide](https://lucide.dev) icon name. The
  `virtual:icons` plugin bundles only the icons the source uses.

## Continuous integration

Every push and pull request runs lint, the format check, `svelte-check` and a production build
(`.github/workflows/ci.yml`).

## Deploy

`vercel.json` runs the SvelteKit build; `@sveltejs/adapter-vercel` produces the
serverless function + static assets.
