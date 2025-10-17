import { LayoutDashboard, Users, Layers3, BookOpenCheck, BarChart2, UserCog } from 'lucide-react';

// This file centralizes the navigation configuration for the entire application.
// It is imported by both Sidebar.jsx and App.jsx to ensure consistency.

export const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/students', label: 'Students', icon: Users },
    { path: '/grades', label: 'Grades', icon: Layers3 },
    { path: '/subjects', label: 'Subjects', icon: BookOpenCheck },
    { path: '/exams', label: 'Exam Management', icon: BarChart2 },
    { path: '/results', label: 'Results', icon: BarChart2 }, // Using the same icon for now
    { path: '/transcripts', label: 'Transcripts', icon: BookOpenCheck },
    { path: '/users', label: 'User Management', icon: UserCog },
];
