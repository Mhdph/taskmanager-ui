# Gr8r Studio

A calm, structured project management workspace: home dashboard, inbox, my tasks,
projects with board / list / table / calendar / timeline / files views, members,
teams, activity, and settings.

Built with React, TypeScript, [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview),
[TanStack Router](https://tanstack.com/router), [TanStack Query](https://tanstack.com/query),
and [TanStack Store](https://tanstack.com/store). Vite builds the app; Nitro produces
Node.js or Vercel deployment output. Existing CSS, HTML view modules, and delegated
actions are retained behind a React compatibility layer.

![Gr8r Studio home dashboard](docs/preview.png)

## Getting started

Requires Node.js 22.12 or newer (`.nvmrc` selects Node 22). npm and
`package-lock.json` are the canonical package manager and lockfile.

```bash
npm ci
npm run dev          # http://localhost:5173
npm run check        # TypeScript, including strict null checks
npm run lint
npm test             # API cache, proxy, and Store regression tests
npm run format:check
npm run build
npm start            # production Node server
```

The generated `src/routeTree.gen.ts` is committed so `npm run check` works on a
fresh checkout. Start regenerates it during development and builds; do not edit it.

To run with the bundled sample workspace and no API:

```bash
VITE_DEMO=true npm run dev
```

Demo mode persists changes under the existing `localStorage.gr8r.v2` key. Live
mode uses the Go API and does not display a cached or sample workspace if startup
fails. Set `VITE_DEMO=true` at build time for a demo production build as well.

## Live mode (taskmanager-api)

By default the UI uses the local dev identity and loads the Go backend
(`../taskmanager-api`). Start it with its development identity resolver:

```bash
cd ../taskmanager-api
IDENTITY_DEV_MODE=true APP_PORT=8080 DATABASE_URL=postgres://… ./taskmanager-api
```

The TanStack Start `/api/$` server route forwards `/api/*` requests to the backend,
stripping `/api` and preserving identity headers, bodies, and query strings. This
works in development and production. Configure the upstream with server-side
`API_URL_INTERNAL` (default `http://localhost:8080`); the former
`VITE_API_URL_INTERNAL` setting is also accepted. In deployed environments,
`localhost` must be replaced with the actual backend address.

Alternatively, set build-time `VITE_API_URL` to use a directly reachable API URL;
that backend must allow browser CORS requests. Browser identity headers come from:

1. `localStorage.gr8r.api` containing `{"apiKey","userId","appId"}`;
2. build-time `VITE_API_TOKEN`, `VITE_API_USER`, and `VITE_API_APP`;
3. the built-in local development identity.

`VITE_*` values are public browser configuration. Use the hosted platform's
identity integration for production users.

The UI loads projects, tasks, statuses, members, teams, labels, comments,
attachments, dependencies, favorites, activity, and saved views through the API.
Mutations retain the existing optimistic UI behavior and error toasts.
Notifications, invitations, calendar events, invoices, and files-page example
uploads remain demonstration features from the original UI.

UI IDs are server UUIDs. Statuses map by name and category; subtasks are child tasks
(`parentTaskId`); estimates are seconds (`2d` is `172800`); recurrence values use
lowercase on the wire.

## TanStack responsibilities

- **Start / Router:** file routes, document metadata, history, deep links,
  optional project tabs, and the API proxy. Workspace routes use `ssr: false`
  because persisted state and platform identity belong to the browser. Start
  still renders the document shell and handles server endpoints.
- **Query:** one QueryClient per router instance, provided through
  QueryClientProvider. Workspace bootstrap uses `useQuery`. API reads use
  `fetchQuery` to cache and deduplicate requests with a 30-second stale time.
  Keys include API URL and identity, isolating tenants and users. Writes run
  through Query's mutation cache with no automatic retries, then invalidate
  API reads. Uploads also invalidate those reads. Changing identity clears the
  cache. Focus/reconnect do not replace the optimistic workspace snapshot;
  an explicit workspace retry invalidates reads and reloads it.
- **Store:** canonical workspace and UI state subscriptions. A deep-mutation
  adapter translates existing nested assignments, array edits, and Set selection
  updates into batched revision notifications. React subscribes with `useSelector`.
  `save()` retains the original debounced localStorage persistence.

Additional TanStack packages are unnecessary for the current functionality. The
existing tables and charts remain in the view modules.

## Routes

| URL                                                                | Content                                   |
| ------------------------------------------------------------------ | ----------------------------------------- |
| `/`                                                                | Home dashboard                            |
| `/inbox`, `/my-tasks`, `/favorites`, `/notifications`              | Personal queues                           |
| `/overview`, `/projects`, `/tasks`, `/calendar`, `/timeline`       | Workspace pages                           |
| `/members`, `/teams`, `/activity`, `/archive`                      | People, teams, history, archive           |
| `/projects/$id/{-$tab}`                                            | Optional project tab, defaulting to board |
| `/members/$id`, `/teams/$id`                                       | Member / team detail                      |
| `/search?q=…&cat=…`                                                | Search                                    |
| `/settings?sec=…`                                                  | Settings                                  |
| `/login`, `/signup`, `/forgot`, `/reset`, `/verify`, `/onboarding` | Auth takeover                             |
| `/system`, `/states`                                               | Design system                             |

Unknown URLs show the existing not-found view. `src/lib/router.ts` keeps the action
API `go('project', { id, tab })` mapped to real TanStack Router navigation.

## Project structure

```text
public/favicon.svg             brand mark
vite.config.js                 Start + React + Nitro; Lucide subset plugin
vitest.config.ts               isolated regression test setup
src/router.tsx                 router factory and request-local QueryClient
src/routes/                    TanStack file routes and root document
src/routeTree.gen.ts            generated route tree
src/server/api-proxy.ts        backend forwarding for the /api/$ server route
src/lib/components/Workspace.tsx React shell and HTML view compatibility layer
src/lib/state.ts               canonical workspace, selectors, persistence
src/lib/reactive-state.ts      nested-mutation adapter backed by TanStack Store
src/lib/query-client.ts        QueryClient defaults and browser API integration
src/lib/api.ts                 identity-scoped queries, mutations, uploads
src/lib/hydrate.ts             workspace loading and API-to-UI conversion
src/lib/sync.ts                existing optimistic mutation adapters
src/styles/                    design tokens and CSS
src/pages/, src/views/         existing TypeScript HTML view modules
src/overlays/                  drawers, modals, popovers, palette
src/actions/                   delegated actions, keyboard, drag-and-drop
src/core/, src/data/, src/ui/   utilities, demo data, shared rendering helpers
```

HTML views preserve focus, caret position, and `data-keep` scroll positions when
updated. React's layout effects run custom-select enhancement, popover placement,
focus management, and timeline setup after commits. New components can use React
and Store subscriptions directly; existing `data-a`, `data-in`, and `data-blur`
handlers continue to work.

## CI and deployment

CI runs lint, formatting, regression tests, TypeScript checks, and the production
build. For a Node deployment, run `npm run build` then `npm start`; Nitro emits
`.output/server/index.mjs` and `.output/public`.

`vercel.json` selects `tanstack-start`. Nitro selects the deployment preset from
the environment. Set `API_URL_INTERNAL` in the hosting environment. No deployment
is performed by the migration.

## Persian interface

The interface uses Persian (`fa-IR`), right-to-left layout, and the locally hosted
Estedad variable font (weights 100–900). Its SIL Open Font License is included in
`public/fonts/OFL-Estedad.txt`. Calendar navigation and displayed dates use the
Persian calendar; API and native date-input values keep Gregorian ISO dates. New
preferences start the week on Saturday and use the Tehran time zone. Existing
workspace content is preserved. Role, recurrence, and permission values remain
canonical and are translated only for display by `src/core/locale.ts`.
