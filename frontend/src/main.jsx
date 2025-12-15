import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import './index.css';
import App from './App';
import LoginPage from './pages/auth/login/LoginPage';
// WAA LA SAXAY: Hadda waxaan isticmaalaynaa qaabka saxda ah ee folder/file
import DashboardPage from './pages/DashboardPage'; 
import StudentPage from './pages/StudentPage';
import StudentResultPage from './pages/StudentResultPage';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentDashboardPages from './pages/StudentDashboardPages';
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
import UserProfilePage from './pages/UserProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import PromotionPage from './pages/PromotionPage';
import CohortsPage from './pages/CohortsPage';
import ProtectedRoute from "./components/ProtectedRoute";
import Announcements from "./pages/Announcements";

import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { MantineProvider } from '@mantine/core';

const router = createBrowserRouter([
  // Public route
  { path: "/login", element: <LoginPage /> },

  // Protected layout with Navbar + Sidebar
  {
    path: "/",
    element: (
      <MantineProvider withGlobalStyles withNormalizeCSS>

    
      <ProtectedRoute>
        <App /> {/* Navbar + Sidebar + <Outlet /> */}
      </ProtectedRoute>
      </MantineProvider>
    ),
    children: [
      // Dashboard (default)
      { index: true, element: <DashboardPage /> },

      // Staff Office (admin + staff_office)
      {
        path: "students",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <StudentPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "students/:studentId",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <StudentDashboardPage />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <ProfileTab /> },
          { path: 'profile', element: <ProfileTab /> },
          { path: 'enrollments', element: <EnrollmentsTab /> },
          { path: 'transcript', element: <TranscriptTab /> },
          { path: 'attendance', element: <AttendanceTab /> },
          { path: 'library', element: <LibraryTab /> },
        ],
      },

      // Exam Office (admin + exam_office)
      {
        path: "grades",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <GradePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "subjects",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <SubjectPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "exams",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <ExamManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "results",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <ResultPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "transcripts",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <TranscriptPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "cohorts",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <CohortsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "promotions",
        element: (
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <PromotionPage />
          </ProtectedRoute>
        ),
      },

      // Admin only
      {
        path: "users",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <UserManagementPage />
          </ProtectedRoute>
        ),
      },
      // {
      //   path: "announcements",
      //   element: (
      //     <ProtectedRoute allowedRoles={["admin", "teacher", "exam", "staff", "student"]}>
      //       <Announcements />
      //     </ProtectedRoute>
      //   ),
      // },
      {
        path: "student-dashboard",
        element: (
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboardPages /> {/* You can make a new StudentDashboardPage if you want */}
          </ProtectedRoute>
        ),
      },
      {
        path: "student-results",
        element: (
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentResultPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "student-attendance",
        element: (
          <ProtectedRoute allowedRoles={["student"]}>
            <h1>Attendance Page (Coming Soon)</h1>
          </ProtectedRoute>
        ),
      },
      {
        path: "/users/:userId",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <UserProfilePage />
          </ProtectedRoute>
        ),
      },
      // <Route path="/users/:userId" element={<UserProfilePage />} />

      // {
      //   path: "student-announcements",
      //   element: (
      //     <ProtectedRoute allowedRoles={["student"]}>
      //       <Announcements />
      //     </ProtectedRoute>
      //   ),
      // },
      {
        path: "student-settings",
        element: (
          <ProtectedRoute allowedRoles={["student"]}>
            <h1>Settings Page (Coming Soon)</h1>
          </ProtectedRoute>
        ),
      },
      
      
      {
        path: "announcements",
        element: (
          <ProtectedRoute allowedRoles={["admin", "teacher", "staff", "student"]}>
            <Announcements />
          </ProtectedRoute>
        ),
      },
      

      // Fallback for unknown routes
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

// Render the app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      <RouterProvider router={router} />
      {/* <Toaster position="top-right" reverseOrder={false} toastOptions={{ duration: 3000 }} /> */}

    </AuthProvider>
  </React.StrictMode>
);

// const router = createBrowserRouter([
//   // Top-level routes that do not use the App shell
//   { path: '/login', element: <LoginPage /> },
//   // Dedicated 404 outside the app layout (no sidebar/navbar)
//   { path: '/404', element: <NotFoundPage /> },
//   {
//     path: '/',
//     element: <App />,
//     children: [
//       { index: true, element: <DashboardPage /> },
//       { path: 'dashboard', element: <DashboardPage /> },
//       { path: 'students', element: <StudentPage /> },
//       // New Student Dashboard with nested tabs; keep old profile route for now
//       {
//         path: 'students/:studentId',
//         element: <StudentDashboardPage />,
//         children: [
//           { index: true, element: <ProfileTab /> },
//           { path: 'profile', element: <ProfileTab /> },
//           { path: 'enrollments', element: <EnrollmentsTab /> },
//           { path: 'transcript', element: <TranscriptTab /> },
//           { path: 'attendance', element: <AttendanceTab /> },
//           { path: 'library', element: <LibraryTab /> },
//         ],
//       },
//       // Make this absolute to avoid any edge matching issues when deep-linking
//       { path: '/grades', element: <GradePage /> },
//       { path: 'subjects', element: <SubjectPage /> },
//       { path: 'exams', element: <ExamManagementPage /> },
//   { path: 'promotions', element: <PromotionPage /> },
//   { path: 'cohorts', element: <CohortsPage /> },
//       { path: 'results', element: <ResultPage /> },
//         { path: 'transfers', element: <TransfersPage /> },
//   { path: 'transcripts', element: <TranscriptPage /> },
//       { path: 'users', element: <UserManagementPage /> },
//   // In-app wildcard: redirect to top-level 404 so layout (Sidebar/Navbar) is not rendered
//   { path: '*', element: <Navigate to="/404" replace /> },
//     ],
//   },
//   // Global wildcard (any unmatched) → 404
//   { path: '*', element: <NotFoundPage /> },
// ]);

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <AuthProvider>
//   <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
//       <RouterProvider router={router} />
//     </AuthProvider>
//   </React.StrictMode>
// );

