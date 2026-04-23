import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';

import AuthLayout from './components/layout/AuthLayout';
import DashboardLayout from './components/layout/DashboardLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import ParentDashboard from './pages/dashboards/ParentDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import SectionDashboard from './pages/dashboards/SectionDashboard';
import PerformanceDetail from './pages/dashboards/PerformanceDetail';
import TimetableDetail from './pages/dashboards/TimetableDetail';
import SmartBoardSimulator from './pages/test/SmartBoardSimulator';
import Notifications from './pages/dashboards/Notifications';
import Profile from './pages/auth/Profile';
import NotesViewer from './pages/notes/NotesViewer';
import LiveQuiz from './pages/quiz/LiveQuiz';
import QuizBuilder from './pages/quiz/QuizBuilder';
import SoloQuizRunner from './pages/quiz/SoloQuizRunner';
import MockTestCreate from './pages/mockTest/MockTestCreate';
import MockTestRunner from './pages/mockTest/MockTestRunner';
import MockTestResults from './pages/mockTest/MockTestResults';
import StudentPortalData from './pages/dashboards/StudentPortalData';
import TeacherClassroom from './pages/dashboards/TeacherClassroom';
import StudentClassroom from './pages/dashboards/StudentClassroom';
import SketchBoard from './pages/SketchBoard';
import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient();

const DashboardRouter = () => {
  const { user } = useAuthStore();
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'TEACHER') return <TeacherDashboard />;
  if (user?.role === 'PARENT') return <ParentDashboard />;
  return <StudentDashboard />;
};

function App() {
  return (
    <GoogleOAuthProvider clientId="560108839953-u5gqg9fg69o8io9tbo4msk5alqho7ait.apps.googleusercontent.com">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Root always goes to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public Gateway Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              {/* Req 2: Student Registration */}
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Protected Institutional Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardRouter />} />
              {/* Req: My Section Collaboration */}
              <Route path="/section" element={<SectionDashboard />} />
              <Route path="/performance" element={<PerformanceDetail />} />
              <Route path="/timetable" element={<TimetableDetail />} />
              <Route path="/test/sync" element={<SmartBoardSimulator />} />
              <Route path="/notes" element={<NotesViewer />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/quiz/builder" element={<QuizBuilder />} />
              <Route path="/quiz/:quizId/solo" element={<SoloQuizRunner />} />
              <Route path="/mock-tests/create" element={<MockTestCreate />} />
              <Route path="/mock-tests/:testId/results" element={<MockTestResults />} />
              <Route path="/academic-data" element={<StudentPortalData />} />
              <Route path="/classroom" element={<TeacherClassroom />} />
              <Route path="/my-classrooms" element={<StudentClassroom />} />
            </Route>

            <Route path="/quiz/:sessionCode" element={<LiveQuiz />} />
            <Route path="/mock-tests/:testId/take" element={<MockTestRunner />} />
            <Route path="/board/:shareToken" element={<SketchBoard />} />

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
