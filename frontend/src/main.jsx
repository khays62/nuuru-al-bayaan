import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import './index.css';
import App from './App';
import LoginPage from './pages/LoginPage';
// WAA LA SAXAY: Hadda waxaan isticmaalaynaa qaabka saxda ah ee folder/file
import DashboardPage from './pages/DashboardPage'; 
import StudentPage from './pages/StudentPage';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import ProfileTab from './components/student/dashboard/ProfileTab';
import EnrollmentsTab from './components/student/dashboard/EnrollmentsTab';
import TranscriptTab from './components/student/dashboard/TranscriptTab';
import AttendanceTab from './components/student/dashboard/AttendanceTab';
import LibraryTab from './components/student/dashboard/LibraryTab';
import GradePage from './pages/GradePage';
import SubjectPage from './pages/SubjectPage';
import ExamManagementPage from './pages/ExamManagementPage';
import ResultPage from './pages/ResultPage';
import TranscriptPage from './pages/TranscriptPage';
import TransfersPage from './pages/TransfersPage';
import UserManagementPage from './pages/UserManagementPage';
import NotFoundPage from './pages/NotFoundPage';
import PromotionPage from './pages/PromotionPage';
import CohortsPage from './pages/CohortsPage';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

const router = createBrowserRouter([
  // Top-level routes that do not use the App shell
  { path: '/login', element: <LoginPage /> },
  // Dedicated 404 outside the app layout (no sidebar/navbar)
  { path: '/404', element: <NotFoundPage /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'students', element: <StudentPage /> },
      // New Student Dashboard with nested tabs; keep old profile route for now
      {
        path: 'students/:studentId',
        element: <StudentDashboardPage />,
        children: [
          { index: true, element: <ProfileTab /> },
          { path: 'profile', element: <ProfileTab /> },
          { path: 'enrollments', element: <EnrollmentsTab /> },
          { path: 'transcript', element: <TranscriptTab /> },
          { path: 'attendance', element: <AttendanceTab /> },
          { path: 'library', element: <LibraryTab /> },
        ],
      },
      // Make this absolute to avoid any edge matching issues when deep-linking
      { path: '/grades', element: <GradePage /> },
      { path: 'subjects', element: <SubjectPage /> },
      { path: 'exams', element: <ExamManagementPage /> },
  { path: 'promotions', element: <PromotionPage /> },
  { path: 'cohorts', element: <CohortsPage /> },
      { path: 'results', element: <ResultPage /> },
        { path: 'transfers', element: <TransfersPage /> },
  { path: 'transcripts', element: <TranscriptPage /> },
      { path: 'users', element: <UserManagementPage /> },
  // In-app wildcard: redirect to top-level 404 so layout (Sidebar/Navbar) is not rendered
  { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
  // Global wildcard (any unmatched) → 404
  { path: '*', element: <NotFoundPage /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
  <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);

