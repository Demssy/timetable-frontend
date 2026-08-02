import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import SignInPage from './pages/SignInPage'
import ProfilePage from './pages/ProfilePage'
import Layout from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminPage from './pages/AdminPage'
import { TeachersPage } from './pages/admin/TeachersPage'
import { RoomsPage } from './pages/admin/RoomsPage'
import { TimeslotsPage } from './pages/admin/TimeslotsPage'
import { LessonsPage } from './pages/admin/LessonsPage'
import { DanceGroupsPage } from './pages/admin/DanceGroupsPage'
import { SchedulesPage } from './pages/admin/SchedulesPage'
import { ScheduleDetailPage } from './pages/admin/ScheduleDetailPage'
import { TimetableViewPage } from './pages/admin/TimetableViewPage'
import { AdminRoute } from './components/AdminRoute'
import { AvailabilityPage } from './pages/admin/AvailabilityPage'
import { AnalyticsDashboardPage } from './pages/admin/AnalyticsDashboardPage'
import GroupsPage from './pages/GroupsPage'
import { MySchedulePage } from './pages/MySchedulePage'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

            {/* ── Admin routes ── */}
            <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path="admin/teachers" element={<AdminRoute><TeachersPage /></AdminRoute>} />
            <Route path="admin/rooms" element={<AdminRoute><RoomsPage /></AdminRoute>} />
            <Route path="admin/timeslots" element={<AdminRoute><TimeslotsPage /></AdminRoute>} />
            <Route path="admin/dance-groups" element={<AdminRoute><DanceGroupsPage /></AdminRoute>} />
            <Route path="admin/lessons" element={<AdminRoute><LessonsPage /></AdminRoute>} />
            <Route path="admin/schedules" element={<AdminRoute><SchedulesPage /></AdminRoute>} />
            <Route path="admin/schedules/:id" element={<AdminRoute><ScheduleDetailPage /></AdminRoute>} />
            <Route path="admin/schedules/:id/timetable" element={<AdminRoute><TimetableViewPage /></AdminRoute>} />
            <Route path="admin/availability" element={<AdminRoute><AvailabilityPage /></AdminRoute>} />
            <Route path="admin/analytics" element={<AdminRoute><AnalyticsDashboardPage /></AdminRoute>} />

            {/* ── Public routes ── */}
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignInPage />} />
            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
            <Route path="my-schedule" element={<ProtectedRoute><MySchedulePage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
