import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QuestProvider } from './contexts/QuestContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import GoalIntakePage from './pages/GoalIntakePage';
import DashboardPage from './pages/DashboardPage';
import QuestDetailPage from './pages/QuestDetailPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import DuelPage from './pages/DuelPage';
import RewardsPage from './pages/RewardsPage';
import BadgesPage from './pages/BadgesPage';
import SettingsPage from './pages/SettingsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MissionDetailPage from './pages/MissionDetailPage';
import QuestHistoryPage from './pages/QuestHistoryPage';
import MobileShell from './components/layout/MobileShell';
import './index.css';

function ProtectedRoute({ children, requireOnboarding = true }) {
  const { isAuthenticated, isOnboarded, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner--lg" />
        <p className="text-muted">Loading your quest...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireOnboarding && !isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function AppLayout({ children }) {
  return <MobileShell>{children}</MobileShell>;
}

function AppRoutes() {
  const { isAuthenticated, isOnboarded } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            isOnboarded ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <LandingPage />
          )
        }
      />

      {/* Onboarding (no nav) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireOnboarding={false}>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Goal intake (no nav) */}
      <Route
        path="/goals/new"
        element={
          <ProtectedRoute>
            <GoalIntakePage />
          </ProtectedRoute>
        }
      />

      {/* Main app with nav */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quest/:questId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <QuestDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mission/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MissionDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppLayout>
              <QuestHistoryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <AppLayout>
              <GoalIntakePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SchedulePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/duels"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DuelPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rewards"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RewardsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/badges"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BadgesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LeaderboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <QuestProvider>
              <AppRoutes />
            </QuestProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
