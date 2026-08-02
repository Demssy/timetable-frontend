# Automated Timetabling System — Frontend

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

Modern web interface for the **Automated Timetabling System**. It provides interactive schedule views for dance-school users and administrative control panels for managing people, resources, lessons, availability, and generated schedules.

## ✨ Core features

- **Interactive weekly timetable** — visualise schedules in a weekly grid with lesson details, class legend, and schedule views for users and administrators.
- **Resource administration** — manage teachers, students, dance groups, rooms, timeslots, lessons, schedules, and availability from dedicated admin pages.
- **Solver monitoring** — start schedule generation and follow its progress through the `useSolverPolling` hook, which polls the backend solver status until completion.
- **Schedule quality insights** — view solver scores, assignment status, unmet-student information, and timetable results.
- **Role-based access control** — public sign-in/sign-up flows, authenticated routes, and administrator-only routes.
- **Cookie-based authentication** — authentication state is managed with `AuthContext`; requests include HTTP-only JWT cookies and retry once after a token refresh when appropriate.
- **Availability management and analytics** — collect weekly and one-time availability and explore administrative metrics.

## 🧰 Tech stack

| Area | Technologies |
| --- | --- |
| Framework & tooling | React 19, TypeScript 5.9, Vite 7, SWC |
| UI & styling | Tailwind CSS 4, shadcn/ui-style components built on Radix UI, Lucide React icons |
| Routing & state | React Router DOM 6, React Context (`AuthContext`), TanStack Query |
| Scheduling & visualisation | React Big Calendar, dnd-kit, React DnD, Recharts |
| API client | Fetch API wrappers with typed responses and `credentials: "include"` for Spring Boot REST API communication |
| Production serving | Express static server with SPA fallback |

## 🗂️ Project structure

```text
src/
├── api/             # Typed API modules and the shared apiFetch client
├── components/      # Shared UI, layout, forms, route guards, timetable widgets
│   └── ui/          # Reusable base UI primitives (Button, Card, Input, Dialog, ...)
├── contexts/        # Cross-cutting React state, including AuthContext
├── features/        # Feature-oriented modules (for example, availability)
├── hooks/           # Reusable hooks, including useSolverPolling
├── pages/           # Route-level pages
│   └── admin/       # Administrator-only pages and schedule management views
├── services/        # Application services, including authentication lifecycle logic
├── types/           # TypeScript DTOs and const-based enum definitions
└── utils/           # Shared helpers such as time utilities
```

Additional root-level files:

- `vite.config.ts` — Vite setup, the `@` alias for `src`, Tailwind plugin, and local API proxy.
- `server/index.js` — Express server for serving the production `dist/` bundle with client-side-routing fallback.
- `src/main.tsx` — application entry point, router tree, and route protection wiring.

## 🔐 Access model

The application defines `STUDENT`, `TEACHER`, and `ADMIN` roles. Routes are organised as follows:

- **Public:** `/login`, `/signup`
- **Authenticated:** home, profile, groups, and personal schedule pages
- **Administrator-only:** `/admin` and resource-management pages for users, teachers, rooms, timeslots, dance groups, lessons, schedules, availability, and analytics

`ProtectedRoute` redirects unauthenticated users to the login page. `AdminRoute` additionally requires the `ADMIN` role.

## 🚀 Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) **18 or later**
- One package manager: **npm**, **pnpm**, or **Yarn**
- The Automated Timetabling System Spring Boot backend, available during development at `http://localhost:8080`

### 1. Install dependencies

Using npm:

```bash
npm install
```

Equivalent commands for other package managers:

```bash
pnpm install
yarn install
```

### 2. Configure backend connectivity

During local development, Vite proxies every `/api/*` request to:

```text
http://localhost:8080
```

This proxy is configured in `vite.config.ts`, so no environment file is required for the default local setup. Start the Spring Boot backend before using authenticated or administrative functionality.

> **About `VITE_API_BASE_URL`:** the current API client deliberately uses relative `/api/...` URLs and does not read `VITE_API_BASE_URL`. If your deployment standard requires the variable, you may record the intended backend origin in `.env.local`:
>
> ```dotenv
> VITE_API_BASE_URL=http://localhost:8080
> ```
>
> It has no effect until the API client is explicitly updated to consume it. For production, configure your web server or reverse proxy to forward `/api` requests to the Spring Boot service.

### 3. Start development mode

```bash
npm run dev
```

The Vite development server runs at [http://localhost:3000](http://localhost:3000). API calls to `/api` are forwarded to the backend on port `8080`.

### 4. Create a production build

```bash
npm run build
```

The command type-checks the project with `tsc -b` and outputs the optimised application to `dist/`.

Preview the Vite build locally:

```bash
npm run preview
```

To serve the built SPA through the included Express server:

```bash
npm run serve
```

`npm run serve` listens on port `3000` by default; set the server-side `PORT` environment variable to override it. The Express server serves static files and provides an SPA fallback, but it does **not** proxy `/api` to the backend. Configure a reverse proxy in production.

### 5. Lint the codebase

```bash
npm run lint
```

## 🔌 Backend integration

The frontend communicates with the Spring Boot REST API through `/api/...` endpoints.

- General resource APIs use `apiFetch<T>` from `src/api/client.ts`.
- Authentication uses `AuthService` from `src/services/authService.ts`.
- All requests include `credentials: "include"`; do not add an `Authorization` header in the client.
- On a `401` response, the authentication service attempts `POST /api/auth/refresh` once before treating the session as expired.
- Current-user data is retrieved from `GET /api/user/me`.

The solver workflow is asynchronous: an administrator starts a solve operation, `useSolverPolling` checks its status every two seconds, and the completed solution is then displayed in the timetable view.

## 📜 Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server on port `3000`. |
| `npm run build` | Type-check and create the production bundle in `dist/`. |
| `npm run preview` | Preview the Vite production build locally. |
| `npm run lint` | Run ESLint across the project. |
| `npm run serve` | Serve `dist/` with the included Express SPA server. |

## 🧭 Development conventions

- Prefer named exports and functional React components with typed props.
- Use the `@/` import alias for modules under `src/`.
- Keep backend DTOs aligned with interfaces in `src/types/`.
- Use the shared `cn()` helper when conditionally combining Tailwind class names.
- Build new administrator features from an API module, a matching DTO, a page in `src/pages/admin/`, and an `AdminRoute` entry in `src/main.tsx`.

---

Built for efficient, transparent dance-school schedule management. 💃
