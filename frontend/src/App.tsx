import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AuthLayout from './components/layout/AuthLayout';
import DashboardLayout from './components/layout/DashboardLayout';

import Login from './pages/auth/Login';
import RegisterTabs from './pages/auth/RegisterTabs';
import AdminLogin from './pages/auth/AdminLogin';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import ParentDashboard from './pages/dashboards/ParentDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import Profile from './pages/auth/Profile';
import ClassroomList from './pages/classroom/ClassroomList';
import ClassroomDetail from './pages/classroom/ClassroomDetail';
import WhiteboardList from './pages/whiteboard/WhiteboardList';
import WhiteboardEditor from './pages/whiteboard/WhiteboardEditor';
import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient();

// Route based on user role
const DashboardRouter = () => {
  const { user } = useAuthStore();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'STUDENT':
      return <StudentDashboard />;
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'PARENT':
      return <ParentDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterTabs />} />
            <Route path="/admin-login" element={<AdminLogin />} />
          </Route>

          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/profile" element={<Profile />} />

            {/* Classroom */}
            <Route path="/classroom" element={<ClassroomList />} />
            <Route path="/classroom/:classroomId" element={<ClassroomDetail />} />

            {/* Whiteboard */}
            <Route path="/whiteboard" element={<WhiteboardList />} />
            <Route path="/whiteboard/:whiteboardId" element={<WhiteboardEditor />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
