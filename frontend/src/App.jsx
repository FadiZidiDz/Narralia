import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Navbar from './components/shared/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import Stories from './pages/student/Stories';
import StoryDetail from './pages/student/StoryDetail';
import Writer from './pages/student/Writer';
import Results from './pages/student/Results';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StoryManagement from './pages/teacher/StoryManagement';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function MainLayout() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <ErrorBoundary>
            <div className="min-h-screen bg-navy text-slate-200 selection:bg-purple-500/30 selection:text-purple-200">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  <Route path="/dashboard" element={
                    <ProtectedRoute requiredRole="student">
                      <StudentDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/stories" element={
                    <ProtectedRoute requiredRole="student">
                      <Stories />
                    </ProtectedRoute>
                  } />
                  <Route path="/stories/:id" element={
                    <ProtectedRoute requiredRole="student">
                      <StoryDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/results/:submissionId" element={
                    <ProtectedRoute requiredRole="student">
                      <Results />
                    </ProtectedRoute>
                  } />

                  <Route path="/teacher/dashboard" element={
                    <ProtectedRoute requiredRole="teacher">
                      <TeacherDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/teacher/stories" element={
                    <ProtectedRoute requiredRole="teacher">
                      <StoryManagement />
                    </ProtectedRoute>
                  } />
                </Route>

                <Route path="/stories/:id/part/:partId" element={
                  <ProtectedRoute requiredRole="student">
                    <Writer />
                  </ProtectedRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
