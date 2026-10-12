### TASK: Overhaul UX/UI & Information Architecture for Intuitive New-User Experience

#### 1. Core Problem & Goal
Currently, the application feels complex, technical, and overwhelming for first-time dance school users (students and teachers).
We need to transform the frontend into a modern, welcoming, and intuitive Web application:
- Humanize terminology (replace solver/backend jargon with friendly everyday language).
- Implement role-based onboarding (checklists/banners guiding first-time users on what to do next).
- Redesign empty states with actionable call-to-actions (CTAs).
- Streamline the weekly schedule and availability views with clear visual hierarchy, badges, and tooltips.

---

#### 2. Information Architecture & Navigation (`src/components/Layout.tsx`)
1. **Role-Tailored Navigation**:
   - Clean up the top navbar / sidebar so users only see links relevant to their primary workflow:
      - **Students**: *My Schedule (Моё расписание)*, *My Availability (Удобное время)*, *Browse Groups (Направления и группы)*, *Profile (Профиль)*.
      - **Teachers**: *My Teaching & Classes (Расписание и уроки)*, *Set Availability (Моя доступность)*, *My Groups (Мои группы)*, *Profile (Профиль)*.
      - **Admins only**: Keep management views (*Solver*, *Users*, *Rooms*, *Timeslots*, *Analytics*) clearly separated under an "Administration" section or dropdown.
2. **User Status & Active Role Badge**:
   - In the header, display the logged-in user's name, avatar, and active role pill/badge (e.g. `🎓 Студент` / `💃 Преподаватель`).
   - For dual-role users, show a neat segmented switch or role indicator in the header.

---

#### 3. First-Time Experience & Actionable Onboarding
1. **Welcome Onboarding Card / Banner (`src/pages/HomePage.tsx` / `MySchedulePage.tsx`)**:
   - Add a dismissible "Quick Start Checklist" (Шаги для начала работы) for new accounts:
      - For Students:
         1. [x] Профиль создан.
         2. [ ] Укажите удобные дни и часы (`/availability`) — *[Кнопка: «Настроить время»]*.
         3. [ ] Выберите желаемые стили танцев — *[Кнопка: «Выбрать стили»]*.
         4. [ ] Дождитесь публикации расписания.
      - For Teachers:
         1. [ ] Укажите часы, в которые вы можете вести занятия.
         2. [ ] Проверьте привязанные залы и направления.
2. **Actionable Empty States (Zero-Data States)**:
   - Never show a blank white grid or empty table with just "No data".
   - Replace with friendly illustrations/icons, clear explanation, and primary action button:
      - *If schedule is not published yet*: "Расписание на эту неделю ещё формируется администратором. Убедитесь, что ваше удобное время заполнено!" + Button `Перейти к доступности`.
      - *If no availability is set*: "Вы ещё не указали часы посещения. Нажмите ниже, чтобы выбрать дни!" + Button `Заполнить доступность`.

---

#### 4. Humanizing Terminology & Solver Data
Replace technical backend terms throughout all tooltips, headers, and buttons:
- `Hard score / Soft score` ➔ **«Качество расписания»** (показывать понятный процент или бейдж: `98% оптимально`, `0 конфликтов`).
- `Resource Unavailability` ➔ **«Недоступные дни / Отгулы»** (или «Когда я не могу»).
- `Weekly Availability` ➔ **«Моё стандартное недельное расписание»** (или «Удобное время»).
- `Timeslot` ➔ **«Время урока»** (например, `Пн, 18:00 - 19:30`).
- `Unmet Students` ➔ **«Студенты, ожидающие распределения»**.
- `Feasibility` ➔ **«Конфликты расписания»** (зеленый бейдж: *Конфликтов нет*, красный: *Есть пересечения*).

---

#### 5. Improving Weekly Schedule UI (`src/components/weekly-timetable.tsx` & `event-card.tsx`)
1. **Card Visual Polish**:
   - Show clear color indicators for dance styles (e.g. Salsa — warm orange, Contemporary — soft purple, Hip-hop — cool blue) via `class-legend.tsx`.
   - Card content hierarchy:
      - **Top row**: Time pill (`18:00 - 19:30`) + Room pill (`Зал 1`).
      - **Title**: Style & Level (`Salsa • Начальный`).
      - **Footer**: Teacher name with small avatar + enrolled student count chip.
2. **Schedule Controls**:
   - Add intuitive week navigation buttons: `[< Предыдущая неделя] [Текущая неделя] [Следующая неделя >]`.
   - Add simple filter pills: `[Все стили] [Мой уровень] [Только мои уроки]`.
   - Ensure the mobile view falls back to a clean daily agenda list instead of squeezing 7 columns horizontally.

---

#### 6. Simplifying Availability Management (`src/features/availability/`)
1. **Intuitive Grid Selection (`WeeklyAvailabilityGrid.tsx`)**:
   - Provide visual cell states with high contrast:
      - Green / Soft teal: **«Свободен / Могу прийти»**
      - Light gray / Red striped: **«Занят»**
   - Add "Quick Presets" buttons at the top of the grid to save clicks:
      - `[Выбрать все вечера (18:00-22:00)]`
      - `[Только выходные]`
      - `[Очистить всё]`
2. **Contextual Help & Tooltips**:
   - Place a short, friendly explanation banner at the top:
     *"Отметьте зеленым цветом слоты, в которые вам комфортно приходить на занятия. Алгоритм составит расписание с учетом этих пожеланий."*

---

#### 7. Micro-Interactions, Feedback & Safety
1. **Interactive Feedback**:
   - Use toasts (`sonner` or `shadcn/ui toast`) on every user action:
      - *«Доступность успешно сохранена!»*
      - *«Заявка на урок отправлена»*.
2. **Loading States**:
   - Replace full-page blocking spinners with subtle skeleton loaders (`<Skeleton />` from shadcn/ui) in timetable cards and tables to avoid sudden UI jumps.
3. **Modal Dialogs**:
   - Every deletion or cancellation action (`CancelLessonModal`, `DeleteSlot`) must have a clear confirmation dialog explaining the consequence in plain Russian.

---

#### 8. Coding Standards & Execution Guidelines
- **Important**: Any internal code comments within code blocks MUST be written in English.
- Use existing Tailwind CSS color tokens and `shadcn/ui` components (`Button`, `Card`, `Badge`, `Tabs`, `Dialog`, `Tooltip`, `Skeleton`).
- Verify TypeScript compilation without errors (`npx tsc --noEmit`).