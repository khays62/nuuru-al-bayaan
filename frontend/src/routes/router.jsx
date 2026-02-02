import { createBrowserRouter, Navigate } from 'react-router-dom';

import App from '../App';
import ProtectedRoute from '../auth/ProtectedRoute';

import LoginPage from '../auth/pages/LoginPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import TeacherDashboardPage from '../features/teachers/pages/TeacherDashboardPage';
import TeacherClassesPage from '../features/teachers/components/dashboard/TeacherClassesPage';
import { TeacherProfilePage } from '../features/teachers/components/dashboard/TeacherProfileCard.jsx';
import HomeRedirect from '../pages/HomeRedirect';
import StudentPage from '../features/students/pages/StudentPage';
import StudentDashboardPage from '../features/students/pages/StudentDashboardPage';
import GradePage from '../features/grades/pages/GradePage';
import SubjectPage from '../features/subjects/pages/SubjectPage';
import ExamManagementPage from '../features/exams/pages/ExamManagementPage';
import ExamSettingsPage from '../features/exams/pages/ExamSettingsPage';
import ResultPage from '../features/results/pages/ResultPage';
import TranscriptPage from '../features/transcript/pages/TranscriptPage';
import TransfersPage from '../features/transfers/pages/TransfersPage';
import UserManagementPage from '../features/users/pages/UserManagementPage';
import UserProfilePage from '../features/users/pages/UserProfilePage';
import NotFoundPage from '../pages/NotFoundPage';
import PromotionPage from '../features/promotions/pages/PromotionPage';
import CohortsPage from '../features/cohorts/pages/CohortsPage';
import AttendancePage from '../features/attendance/pages/AttendancePage';
import AttendanceReportsPage from '../features/attendance/pages/AttendanceReportsPage';
import TeachersPage from '../features/teachers/pages/TeachersPage';
import TimetablePage from '../features/timetable/pages/TimetablePage';
import AnnouncementsPage from '../features/announcements/pages/Announcements';

import GradesSetupPage from '../features/setup/pages/GradesSetupPage.jsx';
import ShiftsSetupPage from '../features/setup/pages/ShiftsSetupPage.jsx';
import AcademicYearsSetupPage from '../features/setup/pages/AcademicYearsSetupPage.jsx';

import AdminStudentHomeTab from '../features/students/components/dashboard/AdminStudentHomeTab';
import ProfileTab from '../features/students/components/dashboard/ProfileTab';
import EnrollmentsTab from '../features/students/components/dashboard/EnrollmentsTab';
import TranscriptTab from '../features/students/components/dashboard/TranscriptTab';
import AttendanceTab from '../features/students/components/dashboard/AttendanceTab';
import TimetableTab from '../features/students/components/dashboard/TimetableTab';
import LibraryTab from '../features/students/components/dashboard/LibraryTab';
import TransfersTab from '../features/students/components/dashboard/TransfersTab';

import StudentSelfDashboardShell, {
  StudentSelfHomeCards,
} from '../features/students/components/dashboard/StudentSelfDashboardShell';

import {
  attendanceAny,
  attendanceReportsAny,
  cohortsAny,
  examsAny,
  examsInputOnly,
  gradesAny,
  promotionsAny,
  resultsAny,
  studentsAny,
  subjectsAny,
  teachersAny,
  timetableAny,
  transcriptAny,
  transfersAny,
} from './permissions';

export const router = createBrowserRouter([
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
      { index: true, element: <HomeRedirect /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher-dashboard',
        element: (
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher-classes',
        element: (
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherClassesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher-profile',
        element: (
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherProfilePage />
          </ProtectedRoute>
        ),
      },
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
        path: 'setup/grades',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <GradesSetupPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'setup/shifts',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <ShiftsSetupPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'setup/academic-years',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AcademicYearsSetupPage />
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
          <ProtectedRoute allowedRoles={['admin', 'staff', 'teacher']} allowedPermissions={attendanceAny}>
            <AttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'attendance-reports',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff', 'teacher']} allowedPermissions={attendanceReportsAny}>
            <AttendanceReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'timetable',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff', 'teacher']} allowedPermissions={timetableAny}>
            <TimetablePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'exams',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff', 'teacher']} allowedPermissions={examsAny}>
            <ExamManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'exam-settings',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={examsInputOnly}>
            <ExamSettingsPage />
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
        ),
      },
      {
        path: 'users/:userId',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <UserProfilePage />
          </ProtectedRoute>
        ),
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
        path: 'teachers/:teacherId',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']} allowedPermissions={teachersAny}>
            <TeacherProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'announcements',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff', 'teacher', 'student']}>
            <AnnouncementsPage />
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
