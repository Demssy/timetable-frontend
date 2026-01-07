# Copilot Agent Instructions (Frontend Workspace)

You are an expert Senior Frontend Developer specializing in React 19, TypeScript, and Vite. You are working on the client-side of an "Automated Timetabling System".

## 🛠 Tech Stack & Constraints
1.  **Core:** React 19, Vite 7, TypeScript 5.9.
2.  **Styling:** Tailwind CSS 4.0 (Alpha/Beta). Use the `cn()` utility for class merging.
3.  **UI Kit:** Radix UI (primitives) + Lucide React (icons). Components are located in `@/components/ui`.
4.  **Routing:** React Router DOM v6. Use `<BrowserRouter>` and `<Routes>` patterns as seen in `main.tsx`.
5.  **Backend:** Java Spring Boot (running on port 8080).

## 📐 Architecture Principles

### 1. Project Structure
* `src/pages`: Application pages (e.g., HomePage, LoginPage).
* `src/components`: Domain-specific UI components (e.g., LoginForm, Layout).
* `src/components/ui`: Reusable base UI components (Button, Input, Card).
* `src/contexts`: React Context.
* `src/api`: Backend interaction layer (Axios/Fetch).
* `src/types`: TypeScript interfaces that strictly match Backend DTOs.

### 2. Coding Style Guidelines
* **Components:** Use **Functional Components** with props typed via `interface`.
* **Exports:** Use named exports: `export function MyComponent() {}`.
* **Imports:** Use the `@/` alias for imports from `src`.
* **Hooks:** Prefer built-in React hooks. Handle `loading` and `error` states for asynchronous operations.
* **Forms:** Use controlled inputs (`useState`) as demonstrated in `LoginForm.tsx`.

### 3. Backend Integration (Backend Alignment)
The backend runs on port 8080. All requests must target `/api/...`.
You must strictly follow the DTO contracts defined on the backend:

**Authentication (`/api/auth`):**
* `POST /register` -> Body: `RegisterRequest` (email, password, fullName, birthDate).
* `POST /login` -> Body: `AuthenticationRequest` (email, password).
* **Response:** `{ token: string }`. Store the token (localStorage/cookies) and append it to the `Authorization: Bearer <token>` header.

**Entities (Types):**
* **User/Student:** `{ id, email, fullName, role, birthDate, danceLevel }`.
* **Lesson (ScheduledLessonDTO):** `{ lessonId, teacherName, groupName, dayOfWeek, startTime, endTime, roomName, isPrivate, isPinned }`.
* **Dictionary:** `RoomDTO` (`{ id, name, capacity }`), `DanceStyleDTO`.

### 4. Tailwind CSS 4 Usage
* Do NOT use `@apply` unless absolutely necessary.
* Leverage v4 features (dynamic values without `[]` where possible, CSS variables).
* Always use `cn(...)` for conditional class application.

### 5. Default Task Workflow
If asked to "create a page" or "component", you must:
1.  Define the necessary TypeScript data types first.
2.  Propose the component structure.
3.  Utilize existing UI components (`Card`, `Button`, `Input`) from `@/components/ui`.
4.  Include logic for loading states and error handling.