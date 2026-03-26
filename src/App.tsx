import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedLayout, AdminLayout } from '@/components/layout/ProtectedLayout'

// Public
import { LoginPage } from '@/pages/LoginPage'

// Employee
import { DashboardPage }    from '@/pages/employee/DashboardPage'
import { NewsPage }         from '@/pages/employee/NewsPage'
import { NewsDetailPage }   from '@/pages/employee/NewsDetailPage'
import { EventsPage }       from '@/pages/employee/EventsPage'
import { VacationPage }     from '@/pages/employee/VacationPage'
import { ProfilePage }      from '@/pages/employee/ProfilePage'
import { ProfileEditPage }  from '@/pages/employee/ProfileEditPage'
import { FaqPage }          from '@/pages/employee/FaqPage'

// Admin
import { AdminOverviewPage }    from '@/pages/admin/AdminOverviewPage'
import { EmployeeListPage }     from '@/pages/admin/EmployeeListPage'
import { EmployeeDetailPage }   from '@/pages/admin/EmployeeDetailPage'
import { EmployeeNewPage }      from '@/pages/admin/EmployeeNewPage'
import { VacationReviewPage }   from '@/pages/admin/VacationReviewPage'
import { PlacementsPage }       from '@/pages/admin/PlacementsPage'
import { CrmListPage }          from '@/pages/admin/CrmListPage'
import { CrmDetailPage }        from '@/pages/admin/CrmDetailPage'
import { NewsCreatePage }       from '@/pages/admin/NewsCreatePage'
import { EventCreatePage }      from '@/pages/admin/EventCreatePage'
import { PublishPage }          from '@/pages/admin/PublishPage'
import { CompetencySearchPage } from '@/pages/admin/CompetencySearchPage'
import { BoardsPage }           from '@/pages/admin/BoardsPage'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all authenticated users */}
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"     element={<DashboardPage />} />
        <Route path="/news"          element={<NewsPage />} />
        <Route path="/news/:id"      element={<NewsDetailPage />} />
        <Route path="/events"        element={<EventsPage />} />
        <Route path="/vacation"      element={<VacationPage />} />
        <Route path="/profile"       element={<ProfilePage />} />
        <Route path="/profile/edit"  element={<ProfileEditPage />} />
        <Route path="/faq"           element={<FaqPage />} />

        {/* Admin only */}
        <Route element={<AdminLayout />}>
          <Route path="/admin"                    element={<AdminOverviewPage />} />
          <Route path="/admin/employees"          element={<EmployeeListPage />} />
          <Route path="/admin/employees/new"      element={<EmployeeNewPage />} />
          <Route path="/admin/employees/:id"      element={<EmployeeDetailPage />} />
          <Route path="/admin/vacations"          element={<VacationReviewPage />} />
          <Route path="/admin/placements"         element={<PlacementsPage />} />
          <Route path="/admin/competencies"       element={<CompetencySearchPage />} />
          <Route path="/admin/crm"                element={<CrmListPage />} />
          <Route path="/admin/crm/:id"            element={<CrmDetailPage />} />
          <Route path="/admin/publish"            element={<PublishPage />} />
          <Route path="/admin/boards"             element={<BoardsPage />} />
          <Route path="/admin/news/new"           element={<NewsCreatePage />} />
          <Route path="/admin/news/:id/edit"      element={<NewsCreatePage />} />
          <Route path="/admin/events/new"         element={<EventCreatePage />} />
          <Route path="/admin/events/:id/edit"    element={<EventCreatePage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
