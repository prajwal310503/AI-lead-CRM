import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './pages/auth/LoginPage'
import AcceptInvitePage from './pages/auth/AcceptInvitePage'
import OverviewPage from './pages/dashboard/OverviewPage'
import ManagerDashboard from './pages/dashboard/ManagerDashboard'
import DeveloperDashboard from './pages/dashboard/DeveloperDashboard'
import DesignerDashboard from './pages/dashboard/DesignerDashboard'
import LeadsPage from './pages/leads/LeadsPage'
import InterestedLeadsPage from './pages/leads/InterestedLeadsPage'
import LostLeadsPage from './pages/leads/LostLeadsPage'
import CRMPage from './pages/leads/CRMPage'
import ProposalsPage from './pages/proposals/ProposalsPage'
import AgreementsPage from './pages/agreements/AgreementsPage'
import TasksPage from './pages/tasks/TasksPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import VaultPage from './pages/vault/VaultPage'
import TeamPage from './pages/team/TeamPage'
import SettingsPage from './pages/settings/SettingsPage'
import ClientLoginPage from './pages/portal/ClientLoginPage'
import ClientDashboard from './pages/portal/ClientDashboard'
import WorkingClientsPage from './pages/clients/WorkingClientsPage'
import ClosedClientsPage from './pages/clients/ClosedClientsPage'
import WhatsAppCenterPage from './pages/whatsapp/WhatsAppCenterPage'
import useAuthStore from './stores/useAuthStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min — cached data shown instantly on navigation
      gcTime:    15 * 60 * 1000,  // 15 min — keep in memory across page switches
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})

function ProtectedRoute({ children, roles }) {
  const { user, profile } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return children
}

// Redirect to role-appropriate home dashboard
function RoleHomePage() {
  const { user, profile } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  const role = profile?.role
  if (role === 'manager') return <ManagerDashboard />
  if (role === 'developer') return <DeveloperDashboard />
  if (role === 'designer') return <DesignerDashboard />
  return <OverviewPage /> // admin, agency
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          {/* Client Portal — completely isolated */}
          <Route path="/client-login" element={<ClientLoginPage />} />
          <Route path="/portal/dashboard" element={<ClientDashboard />} />

          {/* Protected dashboard routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<RoleHomePage />} />

            {/* Lead Management */}
            <Route path="leads" element={<ProtectedRoute roles={['admin','manager','agency']}><LeadsPage /></ProtectedRoute>} />
            <Route path="leads/crm" element={<ProtectedRoute roles={['admin','manager','agency']}><CRMPage /></ProtectedRoute>} />
            <Route path="leads/interested" element={<ProtectedRoute roles={['admin','manager','agency']}><InterestedLeadsPage /></ProtectedRoute>} />
            <Route path="leads/lost" element={<ProtectedRoute roles={['admin','manager','agency']}><LostLeadsPage /></ProtectedRoute>} />
            <Route path="leads/whatsapp" element={<ProtectedRoute roles={['admin','manager','agency']}><WhatsAppCenterPage /></ProtectedRoute>} />

            {/* Proposals */}
            <Route path="proposals" element={<ProtectedRoute roles={['admin','manager','agency']}><ProposalsPage /></ProtectedRoute>} />

            {/* Agreements */}
            <Route path="agreements" element={<ProtectedRoute roles={['admin','manager','agency']}><AgreementsPage /></ProtectedRoute>} />
            <Route path="agreements/pending" element={<ProtectedRoute roles={['admin','manager','agency']}><AgreementsPage /></ProtectedRoute>} />
            <Route path="agreements/signed" element={<ProtectedRoute roles={['admin','manager','agency']}><AgreementsPage /></ProtectedRoute>} />

            {/* Tasks */}
            <Route path="tasks" element={<ProtectedRoute roles={['admin','manager','developer','designer']}><TasksPage /></ProtectedRoute>} />

            {/* Finance */}
            <Route path="payments" element={<ProtectedRoute roles={['admin','manager','agency']}><PaymentsPage /></ProtectedRoute>} />

            {/* Vault */}
            <Route path="vault" element={<ProtectedRoute roles={['admin','manager','developer','designer']}><VaultPage /></ProtectedRoute>} />

            {/* Working & Closed Clients (sub-module of Lead Management) */}
            <Route path="leads/working" element={<ProtectedRoute roles={['admin','manager','agency']}><WorkingClientsPage /></ProtectedRoute>} />
            <Route path="leads/closed"  element={<ProtectedRoute roles={['admin','manager','agency']}><ClosedClientsPage /></ProtectedRoute>} />

            {/* Team */}
            <Route path="team" element={<ProtectedRoute roles={['admin']}><TeamPage /></ProtectedRoute>} />

            {/* Settings */}
            <Route path="settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
