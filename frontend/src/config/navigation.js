// import { LayoutDashboard, Users, Layers3, BookOpenCheck, BarChart2, UserCog, TrendingUp, Repeat } from 'lucide-react';

// // This file centralizes the navigation configuration for the entire application.
// // It is imported by both Sidebar.jsx and App.jsx to ensure consistency.

// export const navItems = [
//     { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
//     { path: '/students', label: 'Students', icon: Users },
//     { path: '/grades', label: 'Grades', icon: Layers3 },
//     { path: '/cohorts', label: 'Cohorts', icon: Users },
//     { path: '/subjects', label: 'Subjects', icon: BookOpenCheck },
//     { path: '/promotions', label: 'Promotions', icon: TrendingUp },
//     { path: '/staffs', label: 'staff Management', icon: BarChart2 },
//     { path: '/results', label: 'Results', icon: BarChart2 }, // Using the same icon for now
//     { path: '/transcripts', label: 'Transcripts', icon: BookOpenCheck },
//     { path: '/transfers', label: 'Transfers', icon: Repeat },
//     { path: '/users', label: 'User Management', icon: UserCog },
// ];


// import { LayoutDashboard, Users, Layers3, BookOpenCheck, BarChart2, UserCog, TrendingUp } from 'lucide-react';

// // This file centralizes the navigation configuration for the entire application.
// // It is imported by both Sidebar.jsx and App.jsx to ensure consistency.

// export const navItems = [
//     { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
//     { path: '/students', label: 'Students', icon: Users },
//     { path: '/grades', label: 'Grades', icon: Layers3 },
//     { path: '/cohorts', label: 'Cohorts', icon: Users },
//     { path: '/subjects', label: 'Subjects', icon: BookOpenCheck },
//     { path: '/promotions', label: 'Promotions', icon: TrendingUp },
//     { path: '/staffs', label: 'staff Management', icon: BarChart2 },
//     { path: '/results', label: 'Results', icon: BarChart2 }, // Using the same icon for now
//     { path: '/transcripts', label: 'Transcripts', icon: BookOpenCheck },
//     { path: '/users', label: 'User Management', icon: UserCog },
// ];

import {
    LayoutDashboard,
    Users,
    Layers3,
    BookOpenCheck,
    BarChart2,
    UserCog,
    Megaphone,
    TrendingUp
  } from "lucide-react";
  
  export const navItems = [
    { path: "/dashboard", label: "Dashboard", roles: ["admin"], icon: LayoutDashboard },
    { path: "/students", label: "Students", roles: ["admin", "staff"], icon: Users },
    { path: "/teachers", label: "Teachers", roles: ["admin", "staff"], icon: Users },
    { path: "/subjects", label: "Subjects", roles: ["admin", "staff"], icon: BookOpenCheck },
    { path: "/grades", label: "Grades", roles: ["admin", "staff", "teacher"], icon: Layers3 },
    { path: "/exams", label: "Exam Management", roles: ["admin", "staff"], icon: BarChart2 },
    { path: "/results", label: "Results", roles: ["admin", "staff", "teacher", ], icon: BarChart2 },
    { path: '/promotions', label: 'Promotions', roles: ["admin", "staff"], icon: TrendingUp },
    { path: '/cohorts', label: 'Cohorts', roles: ["admin", "staff"], icon: Users },
    { path: '/transcripts', label: 'Transcripts', roles: ["admin", "staff"], icon: BookOpenCheck },

    // { path: "/announcements", label: "Announcements", roles: ["admin", "teacher", "staff", "staff", "student"], icon: Megaphone },
    { path: "/announcements", label: "Announcements", roles: ["admin", "staff","student"], icon: Megaphone },
  
  
    { path: "/users", label: "User Management", roles: ["admin"], icon: UserCog },


    { path: "/student-dashboard", label: "Dashboard", roles: ["student"], icon: LayoutDashboard },
    { path: "/student-results", label: "Results", roles: ["student"], icon: BarChart2 },
    { path: "/student-attendance", label: "Attendance", roles: ["student"], icon: BookOpenCheck },
    // { path: "/student-announcements", label: "Announcements", roles: ["student"], icon: Megaphone },
    { path: "/student-settings", label: "Settings", roles: ["student"], icon: UserCog },
  ];