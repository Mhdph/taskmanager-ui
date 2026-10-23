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
that backend must allow browser CORS requests. Hosted authentication follows the NUP admin app contract:

1. Open the app with the platform's single-use `?tt=<bridge-token>` parameter.
2. Before mounting the workspace, the UI removes `tt` from the address bar and
   posts it once to `/api/auth/bridge`. The Go backend exchanges it with
   `nupConfirmBridgeToken` at its configured `HOSTED_GRAPHQL_ENDPOINT`.
3. The UI writes session cookies `token`, `app-id`, `id`, and
   `from-support-menu` (Path `/`, SameSite=Lax, Secure on HTTPS).
4. REST requests and uploads read those cookies and send `X-APIKEY`, `APP-ID`,
   `USER-ID`, and `FROM-SUPPORT-MENU`. The backend validates identities against
   the hosted profile endpoint. Existing platform cookies also restore a session.
5. Sign-out clears these cookies and the query cache. An unauthenticated
   production visit asks the user to open the app from the main panel; the local
   login/signup screens are demo-only.

Production never falls back to `localStorage.gr8r.api`, build-time tokens, or the
built-in dev admin. Local `npm run dev` still accepts `gr8r.api` and
`VITE_API_TOKEN` / `VITE_API_USER` / `VITE_API_APP`, then the built-in dev identity
when there are no platform cookies. `VITE_*` settings are public browser values;
never put a shared production credential in them.

The UI remains standalone: it does not import modules from `nup-panel-ui`.
The Go backend is the only component that needs `HOSTED_GRAPHQL_ENDPOINT`.
Use `APP_ENV=production` and `IDENTITY_DEV_MODE=false` for deployed backends.

The UI loads projects, tasks, statuses, members, teams, labels, comments,
attachments, dependencies, favorites, activity, and saved views through the API.
Mutations retain the existing optimistic UI behavior and error toasts.

The Members → **ظرفیت و بار کار** tab and member profiles expose backend capacity
schedules and workload reports (requires API migration 24). Workspace managers can
set daily hours, ISO working days and an IANA time zone, or clear a schedule.
Reports include date ranges up to 92 days, paginated workspace members, daily
capacity/overload and unestimated, unscheduled and overdue work. Ordinary members
see their own report, scoped to accessible projects. Unconfigured capacity stays
unknown; zero hours and empty working days explicitly mean no availability.
Project tabs also include **اسپرینت‌ها**, **اتوماسیون**, and **گفتگو**:

- Sprints: create/edit, plan tasks from the backlog, start, complete with carryover,
  and read live or frozen reports. Project managers administer sprints; members
  can plan unfinished tasks. Requires migration 20.
- Automation: create/edit rules with the four supported triggers and up to five
  ordered assignment/notification actions; enable, disable, or delete rules.
  Project managers administer rules; other project members can read them.
  Requires migration 21. Notification delivery requires `NOTIFICATION_SERVICE_URL`.
- Chat: `/chat` lists direct, group, and project conversations; the project chat
  tab opens its decision thread. Supports messages, paginated history, attachments,
  editing/deletion, read cursors, group members, mentions, notification preferences,
  typing and presence. Sending retries use the same client message ID. WebSocket
  reconnects use a fresh one-time ticket, open before REST replay, and reload the
  latest page for missed edits/deletes. REST polling every ten seconds also keeps
  the open thread current when the stream is unavailable.

The Nitro WebSocket proxy forwards `/api/chat/stream` to the same
`API_URL_INTERNAL` backend as REST. No separate browser URL is needed with the
normal Node deployment. On hosts without WebSocket support, REST polling still
works; typing and live presence need a WebSocket-capable host. With a direct
`VITE_API_URL`, the client connects to that API's `/chat/stream` using its one-time
ticket; configure the backend's `CHAT_WS_ORIGINS` for the UI origin. Apply all
backend chat migrations through 19 before testing.

Task and subtask drawers include **تحویل و تأیید کار** (requires migration 22).
The assignee, creator of an unassigned task, project manager, or hosted admin can
submit a version with output notes, an optional HTTP(S) link, and another current
project member/manager as reviewer. Only that designated reviewer can approve or
request changes; a reason is required for changes. Submitters and managers can
withdraw a pending submission. The panel keeps paginated version history and
allows a new submission once the previous one is resolved. Approval does not
change the task's board status or mark it complete. The panel refreshes every
15 seconds and offers a manual refresh. Task reminders remain API-only.

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
| `/inbox`, `/chat`, `/my-tasks`, `/favorites`, `/notifications`     | Personal queues                           |
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
