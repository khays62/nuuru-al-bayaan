import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import './index.css';
import App from './App';
import LoginPage from './pages/auth/login/LoginPage';
// WAA LA SAXAY: Hadda waxaan isticmaalaynaa qaabka saxda ah ee folder/file
import DashboardPage from './pages/DashboardPage'; 
import StudentPage from './pages/StudentPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import AdminStudentHomeTab from './components/student/dashboard/AdminStudentHomeTab';
import ProfileTab from './components/student/dashboard/ProfileTab';
import EnrollmentsTab from './components/student/dashboard/EnrollmentsTab';
import TranscriptTab from './components/student/dashboard/TranscriptTab';
import AttendanceTab from './components/student/dashboard/AttendanceTab';
import TimetableTab from './components/student/dashboard/TimetableTab';
import LibraryTab from './components/student/dashboard/LibraryTab';
import TransfersTab from './components/student/dashboard/TransfersTab';
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
import AttendancePage from './pages/AttendancePage';
import AttendanceReportsPage from './pages/AttendanceReportsPage';
import TeachersPage from './pages/TeachersPage';
import TimetablePage from './pages/TimetablePage';
import Announcements from './pages/Announcements';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import StudentSelfDashboardShell, { StudentSelfHomeCards } from './components/student/dashboard/StudentSelfDashboardShell';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';

const permsAny = (module, actions) => (Array.isArray(actions) ? actions.map((action) => ({ module, action })) : []);

const studentsAny = permsAny('students', ['view', 'add', 'edit', 'delete', 'transfer', 'deactivate', 'reactivate', 'download']);
const teachersAny = permsAny('teachers', ['view', 'add', 'edit', 'delete', 'assign']);
const subjectsAny = permsAny('subjects', ['view', 'add', 'edit', 'delete']);
const gradesAny = permsAny('grades', ['view', 'add', 'edit', 'delete']);
const attendanceAny = permsAny('attendance', ['view', 'edit']);
const attendanceReportsAny = permsAny('attendanceReports', ['view', 'print', 'download']);
const timetableAny = permsAny('timetable', ['view', 'add', 'edit', 'delete', 'print', 'download']);
const examsAny = permsAny('exams', ['view', 'input']);
const resultsAny = permsAny('results', ['view', 'download', 'print']);
const promotionsAny = permsAny('promotions', ['view', 'preview', 'promote']);
const cohortsAny = permsAny('cohorts', ['view', 'add', 'edit', 'delete']);
const transfersAny = permsAny('transfers', ['view', 'transfer']);
const transcriptAny = permsAny('transcript', ['view', 'print', 'download']);

const router = createBrowserRouter([
  // Top-level routes that do not use the App shell
  { path: '/login', element: <LoginPage /> },
  // Dedicated 404 outside the app layout (no sidebar/navbar)
  { path: '/404', element: <NotFoundPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'students',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={studentsAny}>
            <StudentPage />
          </ProtectedRoute>
        ),
      },
      // New Student Dashboard with nested tabs; keep old profile route for now
      {
        path: 'students/:studentId',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={studentsAny}>
            <StudentDashboardPage />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AdminStudentHomeTab /> },
          { path: 'dashboard', element: <AdminStudentHomeTab /> },
          { path: 'profile', element: <ProfileTab /> },
          { path: 'enrollments', element: <EnrollmentsTab /> },
          { path: 'transcript', element: <TranscriptTab /> },
          { path: 'attendance', element: <AttendanceTab /> },
          { path: 'timetable', element: <TimetableTab /> },
          { path: 'library', element: <LibraryTab /> },
          { path: 'transfers', element: <TransfersTab /> },
        ],
      },
      {
        path: 'grades',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff', 'teacher']} allowedPermissions={gradesAny}>
            <GradePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'subjects',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={subjectsAny}>
            <SubjectPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'attendance',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={attendanceAny}>
            <AttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'attendance-reports',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={attendanceReportsAny}>
            <AttendanceReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'timetable',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={timetableAny}>
            <TimetablePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'exams',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={examsAny}>
            <ExamManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'promotions',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={promotionsAny}>
            <PromotionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'cohorts',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={cohortsAny}>
            <CohortsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'results',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff', 'teacher']} allowedPermissions={resultsAny}>
            <ResultPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'transfers',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={transfersAny}>
            <TransfersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'transcripts',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={transcriptAny}>
            <TranscriptPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <UserManagementPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'teachers',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={teachersAny}>
            <TeachersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'announcements',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff', 'teacher', 'student']}>
            <Announcements />
          </ProtectedRoute>
        ),
      },

      {
        path: 'student-dashboard',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <StudentSelfDashboardShell />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <StudentSelfHomeCards /> },
          { path: 'home', element: <StudentSelfHomeCards /> },
          { path: 'transcript', element: <TranscriptTab /> },
          { path: 'attendance', element: <AttendanceTab /> },
          { path: 'timetable', element: <TimetableTab /> },
          { path: 'library', element: <LibraryTab /> },
          { path: 'profile', element: <ProfileTab /> },
          { path: 'enrollments', element: <EnrollmentsTab /> },
          { path: 'transfers', element: <TransfersTab /> },
        ],
      },
  // In-app wildcard: redirect to top-level 404 so layout (Sidebar/Navbar) is not rendered
  { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
  // Global wildcard (any unmatched) → 404
  { path: '*', element: <NotFoundPage /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryClientProvider>
);

