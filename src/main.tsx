import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import { SchedulesPage } from './pages/admin/SchedulesPage'
import { ScheduleDetailPage } from './pages/admin/ScheduleDetailPage'
import { TimetableViewPage } from './pages/admin/TimetableViewPage'
import { AdminRoute } from './components/AdminRoute'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
            <Route path="admin/lessons" element={<AdminRoute><LessonsPage /></AdminRoute>} />
            <Route path="admin/schedules" element={<AdminRoute><SchedulesPage /></AdminRoute>} />
            <Route path="admin/schedules/:id" element={<AdminRoute><ScheduleDetailPage /></AdminRoute>} />
            <Route path="admin/schedules/:id/timetable" element={<AdminRoute><TimetableViewPage /></AdminRoute>} />

            {/* ── Public routes ── */}
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignInPage />} />
            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
