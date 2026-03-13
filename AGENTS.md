# AI Agent Guide: Timetable Frontend

This guide outlines the architectural decisions, development workflows, and conventions for the "Automated Timetabling System" frontend.

## 🏗 Architecture & Core Patterns

### Tech Stack
- **Framework:** React 19 + Vite 7 + TypeScript 5.9
- **Styling:** Tailwind CSS 4 (OKLCH variables in `index.css`) + Radix UI Primitives
- **Routing:** React Router DOM v6
- **State:** React Context (`AuthContext`) + Local State
- **Icons:** Lucide React

### API Layer & Data Flow
- **Client:** `src/api/client.ts` provides a `fetch` wrapper.
  - **Base URL:** `http://localhost:8080` (Proxied via Vite in dev).
  - **Auth:** Uses `credentials: "include"` to handle HTTP-only JWT cookies automatically.
  - **Error Handling:** Throws typed errors from JSON responses.
- **Services:** `src/services/` (e.g., `authService`, `userService`) encapsulate API calls.
  - *Pattern:* Service methods return Promises resolving to DTOs.
- **Types:** strict DTO parity with Backend in `src/types/`.
  - **Enums:** Manually synced in `src/types/enums.ts` (e.g., `DanceLevel`, `UserRole`).

### Authentication & Security
- **Mechanism:** Stateless JWT via HTTP-only cookies.
- **Context:** `AuthContext` provides `user`, `login`, `register`, `logout`.
- **Protection:** `ProtectedRoute` component handles role-based access control (RBAC).
  - Example: `<ProtectedRoute requiredRole="ADMIN">...</ProtectedRoute>`

## 💻 Developer Workflows

### Critical Commands
- **Dev Server:** `npm run dev` (Runs on port 3000, proxies `/api` to 8080).
- **Type Check & Build:** `npm run build` (Runs `tsc -b` then `vite build`).
- **Lint:** `npm run lint` (ESLint 9).

### Project Structure
- `@/` alias maps to `src/`.
- `components/ui/` contains reusable shadcn-like components (Button, Input).
- `pages/admin/` contains admin-specific views.
- `hooks/` contains custom logic (e.g., `useSolverPolling.ts` for async solver status).

## 🎨 Styling & UI Conventions

### Tailwind CSS 4
- **CSS Variables:** Theme colors defined in `src/index.css` using OKLCH (e.g., `--primary`).
- **Class Merging:** ALWAYS use `cn()` utility from `@/lib/utils` when accepting `className` props.
  - *Correct:* `<div className={cn("p-4", className)} />`
  - *Incorrect:* `<div className={`p-4 ${className}`} />`
- **Dark Mode:** Supported via `.dark` class strategy.

### Component Guidelines
- **Exports:** Use **Named Exports** (`export function MyComponent`).
- **Props:** Define generic interfaces in `types/` if reused, or inline if specific.
- **Forms:** Controlled inputs usage pattern (see `LoginForm.tsx`).

## 🔗 Integration Points

- **Solver Workflow:**
  1. Admin triggers solve.
  2. Frontend polls status via `useSolverPolling` hook.
  3. Updates UI upon `SOLVED` status.
- **Backend Contract:**
  - Strict field matching required (e.g., `scheduledLessonDTO` fields).
  - Pay attention to Date/Time formats (Backend uses Java `LocalTime`/`LocalDate`).

