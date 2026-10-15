# Automated Timetabling System for Dance School (Frontend Web Client)

## 1. Project Overview

The **Automated Timetabling System for Dance School** frontend is a responsive web client for dance-studio administrators, teachers, and students. It provides tools to manage scheduling inputs, submit and review generated timetables, configure availability, and inspect constraint and assignment reports.

The client communicates with a Spring Boot REST API. Administrators manage users and scheduling resources and review generated schedules; teachers and students manage their own availability and view lessons relevant to their roles. A user can hold both teacher and student roles.

## 2. Technology Stack and Prerequisites

### Technology stack

| Area | Technologies used |
| --- | --- |
| Framework and language | React 19, TypeScript 5.9 |
| Build and development | Vite 7, SWC |
| Styling and UI | Tailwind CSS 4, Radix UI primitives with shadcn/ui-style components, Lucide React |
| Routing | React Router DOM 6 |
| Client-side data and state | React Context, TanStack Query 5, component-level React state |
| API transport | Browser Fetch API wrappers with typed responses and cookie credentials |
| Calendar and visualization | Custom timetable views, React Big Calendar, dnd-kit, React DnD, Recharts |
| Production static serving | Express 5 SPA server |

> **Implementation note:** This repository currently uses React 19 (not React 18) and the Fetch API (not Axios). API calls include credentials for HTTP-only cookie authentication. There is no Axios client or JWT interceptor in the current frontend implementation.

### Prerequisites

- Node.js **20.19+** (Node.js 20 LTS recommended). Vite 7 requires a recent Node 20 or 22 release.
- npm **9+**.
- The Automated Timetabling System Spring Boot backend running at `http://localhost:8080` for API-backed workflows.

## 3. User Experience and Business Workflows

### 3.1 Authentication and role-aware access

Users sign in or register through the public `/login` and `/signup` pages. `AuthContext` obtains the authenticated profile from the backend, keeps it in React state, and exposes role flags to components. Requests send the HTTP-only authentication cookie; the browser does not store or attach a JWT bearer token in application code.

Protected routes require an authenticated user. Administrator routes are additionally wrapped by `AdminRoute`. The application supports `STUDENT`, `TEACHER`, and `ADMIN` roles, including accounts with both teacher and student roles.

### 3.2 Weekly timetable and lesson operations

`src/components/weekly-timetable.tsx` presents a responsive weekly timetable. Users can move between weeks, jump to the current week, choose a week by date, and switch between table and classic grid views on desktop. Lesson cards show the teacher, room, day, time, and relevant group or student information. The administrator view can filter by teacher; teacher and student views are scoped to the current user's lessons or enrolled groups.

Administrators can open the schedule editor and use `AddManualLessonModal.tsx` to add a private lesson by choosing a teacher and student for a timeslot. Authorized teachers and administrators can cancel lessons, optionally provide a reason, and administrators can restore cancelled lessons. **Room and dance style are shown in lesson information where available; the current weekly timetable does not provide room or dance-style filter controls.**

### 3.3 Schedule generation and post-generation analysis

Administrators create and manage schedules, launch the backend solver, and follow its asynchronous status. The solver API and polling hook retrieve the generated solution for display in the timetable and schedule detail views.

The schedule reports support review of solver quality and assignments:

- **`ScoreExplanationPanel.tsx`** displays hard-score violations, soft penalties, and rewards. Constraint rows are expandable and can show involved users, descriptions, timeslot information, lesson information, match counts, and score impacts.
- **`TeacherWorkloadPanel.tsx`** summarizes each teacher's requested and assigned lessons, workload difference, and lessons outside availability.
- **`UnmetStudentsPanel.tsx`** lists students who did not receive all requested lessons, with requested, assigned, and missing counts. It also reports when all students were served.
- **`AnalyticsDashboardPage.tsx`** provides administrative analytics, including utilization and workload visualizations.

These reports explain the returned solver result; the backend remains responsible for constraint evaluation and schedule generation.

### 3.4 Availability management

The availability feature under `src/features/availability/` provides a weekly time-grid for viewing and editing availability slots. The administrator availability view can select a user, add, edit, and delete slots, and display weekly totals and metrics. For dual-role users, role tabs separate **As Teacher** and **As Student** availability.

`OneTimeUnavailabilityManager.tsx` supports date-specific exceptions with start and end times and an optional reason. Availability data is submitted through the availability API and is distinct from recurring weekly slots.

### 3.5 Dual-role accounts and registration

`MySchedulePage.tsx` supports role-aware lesson views. A dual-role user can switch between **I teach**, **I learn**, and **Everything**; the combined view labels lessons by role. The page also displays cancellation status and availability-related empty states.

`SignUpForm.tsx` adapts its fields to the selected student or teacher registration mode. Teacher registration includes teaching details and an optional **also attend classes as a student** choice, which reveals student preference fields and enables dual-role registration.

## 4. Architecture and State Management

The application is organized around route-level pages, reusable components, feature modules, API wrappers, and backend-aligned TypeScript types.

| Concern | Implementation |
| --- | --- |
| Routes and composition | `src/main.tsx` defines the `BrowserRouter` tree, public routes, protected routes, and administrator routes. |
| Authentication state | `src/contexts/AuthContext.tsx` loads the current user and exposes sign-in, registration, sign-out, loading, and role state. Authentication is held in React memory; the HTTP-only cookie is managed by the backend/browser. |
| Remote data | Typed API modules in `src/api/` and service modules in `src/services/` perform Fetch requests. TanStack Query is used in feature components for query caching, mutations, and invalidation where appropriate. |
| Local interaction state | React hooks (`useState`, `useEffect`, `useMemo`, and related hooks) manage component-specific forms, filters, dialogs, loading states, and views. |
| Domain contracts | Interfaces and enum definitions in `src/types/` and `src/features/availability/types/` describe frontend DTOs and domain values. |
| Styling | Tailwind CSS utility classes, shared UI primitives, and the `cn()` helper are used for component styling. |

### Directory structure

```text
src/
├── api/                  # Fetch client and typed API modules (schedules, solver, rooms, lessons, etc.)
├── components/           # Shared layout, timetable, reporting panels, forms, and dialogs
│   ├── calendar/         # Calendar-specific components
│   └── ui/               # Reusable Radix-based UI primitives
├── contexts/             # Authentication context
├── features/
│   └── availability/     # Availability APIs, components, and DTO types
├── hooks/                # Reusable hooks, including solver polling
├── lib/                  # Shared helpers such as cn()
├── pages/                # Route-level pages
│   └── admin/            # Administrator resource, schedule, and analytics pages
├── services/             # Authentication and domain service logic
├── types/                # Domain models, enums, and backend DTO interfaces
└── utils/                # Shared date and time helpers
```

Notable root files include `vite.config.ts` (development port, `@` alias, Tailwind integration, and API proxy), `server/index.js` (production static serving and SPA fallback), and `package.json` (scripts and dependencies).

## 5. Local Setup and Execution

### Step 1: Configure the environment

Create a `.env` file in the project root:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api
```

**Important:** The current API client uses relative `/api/...` paths and does not read `VITE_API_BASE_URL`. During development, Vite proxies `/api` requests to `http://localhost:8080` using the proxy configured in `vite.config.ts`. The variable above is included for the requested environment setup but does not change the current client behavior. For production, configure the deployment web server or reverse proxy to forward `/api` to the backend.

Start the Spring Boot backend at `http://localhost:8080` before testing API-backed functionality.

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Start the development server

```bash
npm run dev
```

Vite is configured to use `http://localhost:3000` by default. To use the commonly expected port `5173`, start it with:

```bash
npm run dev -- --port 5173
```

The application is then available at `http://localhost:5173` (or `http://localhost:3000` when using the default command). API requests under `/api` are proxied to the backend on port `8080`.

### Step 4: Verify TypeScript and create a production build

Run the requested TypeScript check and production build:

```bash
npx tsc --noEmit
npm run build
```

The `build` script runs the TypeScript project build (`tsc -b`) followed by `vite build`, producing static assets in `dist/`.

### Optional commands

```bash
npm run lint
npm run preview
npm run serve
```

`npm run lint` runs ESLint. `npm run preview` previews the Vite build. `npm run serve` serves the built SPA through Express on port `3000` by default (override with the server-side `PORT` environment variable). The Express server provides SPA fallback but does not proxy backend API requests.

## 6. API Integration and Security

The frontend communicates with the Spring Boot backend using relative `/api/...` endpoints. General API modules call `apiFetch<T>` from `src/api/client.ts`; authentication lifecycle operations are encapsulated in `src/services/authService.ts`.

- Requests use `credentials: "include"` so the browser sends the HTTP-only authentication cookie.
- The frontend does not persist JWTs in local storage or add an `Authorization` bearer header.
- The shared Fetch wrapper sets JSON request headers, parses successful responses, handles `204 No Content`, and surfaces backend error messages where available.
- API domains include authentication, users, teachers, dance groups and styles, rooms, timeslots, lessons, schedules, availability, and solver operations.
- Schedule generation is asynchronous: the frontend starts the solver operation, polls status through `useSolverPolling`, and then requests the resulting solution and reports.

The backend API and its DTO definitions are the source of truth for request and response contracts. Keep frontend interfaces in `src/types/` aligned with the backend when those contracts change.

## 7. Available npm Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server (port `3000` by default). |
| `npm run build` | Type-check using `tsc -b` and build the production bundle in `dist/`. |
| `npm run preview` | Preview the production bundle locally. |
| `npm run lint` | Run ESLint across the project. |
| `npm run serve` | Serve `dist/` with the included Express SPA server. |

## 8. Development Conventions

- Prefer functional React components with typed props and named exports for new components.
- Use the `@/` alias for imports from `src/`.
- Keep API request and response types aligned with backend DTOs.
- Reuse primitives from `src/components/ui/` and the `cn()` helper for class composition.
- Keep network loading and error states visible in user-facing flows.
- Add new administrator functionality as a cohesive API/type/page feature and register its route behind `AdminRoute` in `src/main.tsx`.

---
