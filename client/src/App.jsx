import { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import QueueStatus from './components/QueueStatus';
import AddContentSheet from './components/AddContentSheet';
import { Loader2, Layers } from 'lucide-react';

// Lazy load pages
const Inbox = lazy(() => import('./pages/Inbox'));
const Lists = lazy(() => import('./pages/Lists'));
const ListView = lazy(() => import('./pages/ListView'));
const NoteDetail = lazy(() => import('./pages/NoteDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ShareHandler = lazy(() => import('./pages/ShareHandler'));

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Walkthrough from './components/Walkthrough';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="spinner text-[#33b1ff]" size={32} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function Layout() {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const { user } = useAuth();
  const [showWalkthrough, setShowWalkthrough] = useState(() => {
    return !localStorage.getItem('sortd_onboarding_complete');
  });

  return (
    <div style={{ background: '#f5f7f9', minHeight: '100vh', position: 'relative' }}>
      {showWalkthrough && (
        <Walkthrough onComplete={() => {
          localStorage.setItem('sortd_onboarding_complete', 'true');
          setShowWalkthrough(false);
        }} />
      )}

      <main style={{ paddingBottom: '140px' }}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <QueueStatus />
      <BottomNav onAddClick={() => setIsAddSheetOpen(true)} />

      {isAddSheetOpen && (
        <AddContentSheet onClose={() => setIsAddSheetOpen(false)} />
      )}
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Router>
      <Routes>
        {/* Entry Point: Root goes to Inbox or Signup */}
        <Route path="/" element={
          user ? <Navigate to="/inbox" replace /> : (
            <Suspense fallback={<PageLoader />}>
              <Signup />
            </Suspense>
          )
        } />

        <Route path="/login" element={
          user ? <Navigate to="/inbox" replace /> : (
            <Suspense fallback={<PageLoader />}>
              <Login />
            </Suspense>
          )
        } />

        <Route path="/signup" element={
          user ? <Navigate to="/inbox" replace /> : (
            <Suspense fallback={<PageLoader />}>
              <Signup />
            </Suspense>
          )
        } />

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/lists/:id" element={<ListView />} />
          <Route path="/notes/:id" element={<NoteDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/share" element={<ShareHandler />} />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to={user ? "/inbox" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
