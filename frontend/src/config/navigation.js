import { LayoutDashboard, Users, Layers3, BookOpenCheck, BarChart2, UserCog, TrendingUp, Repeat, School, CalendarDays, ClipboardList } from 'lucide-react';

// This file centralizes the navigation configuration for the entire application.
// It is imported by both Sidebar.jsx and App.jsx to ensure consistency.

export const navItems = [
    { path: '/timetable', label: 'Timetable', icon: CalendarDays },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/students', label: 'Students', icon: Users },
    { path: '/grades', label: 'Grades', icon: Layers3 },
    { path: '/cohorts', label: 'Cohorts', icon: Users },
    { path: '/subjects', label: 'Subjects', icon: BookOpenCheck },
    { path: '/attendance', label: 'Attendance', icon: ClipboardList },
    { path: '/attendance-reports', label: 'Attendance Reports', icon: BarChart2 },
    { path: '/promotions', label: 'Promotions', icon: TrendingUp },
    { path: '/exams', label: 'Exam Management', icon: BarChart2 },
    { path: '/results', label: 'Results', icon: BarChart2 }, // Using the same icon for now
    { path: '/transcripts', label: 'Transcripts', icon: BookOpenCheck },
    { path: '/transfers', label: 'Transfers', icon: Repeat },
    { path: '/users', label: 'User Management', icon: UserCog },
    // Admin management
    { path: '/admin/teachers', label: 'Teachers', icon: Users },
];
