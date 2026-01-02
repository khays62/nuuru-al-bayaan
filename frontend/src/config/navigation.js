// import { LayoutDashboard, Users, Layers3, BookOpenCheck, BarChart2, UserCog, TrendingUp, Repeat, School, CalendarDays, ClipboardList } from 'lucide-react';

// // This file centralizes the navigation configuration for the entire application.
// // It is imported by both Sidebar.jsx and App.jsx to ensure consistency.

// export const navItems = [
//     { path: '/timetable', label: 'Timetable', icon: CalendarDays },
//     { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
//     { path: '/students', label: 'Students', icon: Users },
//     { path: '/grades', label: 'Grades', icon: Layers3 },
//     { path: '/cohorts', label: 'Cohorts', icon: Users },
//     { path: '/subjects', label: 'Subjects', icon: BookOpenCheck },
//     { path: '/attendance', label: 'Attendance', icon: ClipboardList },
//     { path: '/attendance-reports', label: 'Attendance Reports', icon: BarChart2 },
//     { path: '/promotions', label: 'Promotions', icon: TrendingUp },
//     { path: '/exams', label: 'Exam Management', icon: BarChart2 },
//     { path: '/results', label: 'Results', icon: BarChart2 }, // Using the same icon for now
//     { path: '/transcripts', label: 'Transcripts', icon: BookOpenCheck },
//     { path: '/transfers', label: 'Transfers', icon: Repeat },
//     { path: '/users', label: 'User Management', icon: UserCog },
//     // Admin management
//     { path: '/admin/teachers', label: 'Teachers', icon: Users },
// ];


// import {
//     LayoutDashboard,
//     Users,
//     Layers3,
//     BookOpenCheck,
//     BarChart2,
//     UserCog,
//     Megaphone,
//     TrendingUp,
//     CalendarDays,
//     ClipboardList
//   } from "lucide-react";


//   export const navItems = [
//     { path: "/dashboard", label: "Dashboard", roles: ["admin"], icon: LayoutDashboard },
  
//     { path: "/timetable", label: "Timetable", roles: ["admin", "staff"], module: "timetable", icon: CalendarDays },
//     { path: "/students", label: "Students", roles: ["admin", "staff"], module: "students", icon: Users },
//     { path: "/teachers", label: "Teachers", roles: ["admin", "staff"], module: "teachers", icon: Users },
//     { path: "/subjects", label: "Subjects", roles: ["admin", "staff"], module: "subjects", icon: BookOpenCheck },
//     { path: "/attendance", label: "Attendance", roles: ["admin", "staff"], module: "attendance", icon: ClipboardList },
//     { path: "/attendance-reports", label: "Attendance Reports", roles: ["admin", "staff"], module: "attendanceReports", icon: BarChart2 },
//     { path: "/grades", label: "Grades", roles: ["admin", "staff", "teacher"], module: "grades", icon: Layers3 },
//     { path: "/exams", label: "Exam Management", roles: ["admin", "staff"], module: "exams", icon: BarChart2 },
//     { path: "/results", label: "Results", roles: ["admin", "staff", "teacher"], module: "results", icon: BarChart2 },
//     { path: "/promotions", label: "Promotions", roles: ["admin", "staff"], module: "promotions",  icon: TrendingUp },
//     { path: "/cohorts", label: "Cohorts", roles: ["admin", "staff"], module: "cohorts", icon: Users },
//     { path: "/transcripts", label: "Transcripts", roles: ["admin", "staff"], module: "transcripts", icon: BookOpenCheck },
  
//     { path: "/announcements", label: "Announcements", roles: ["admin", "staff", "student"], module: "announcements", icon: Megaphone },
  
//     { path: "/users", label: "User Management", roles: ["admin"], icon: UserCog },
  
//     // Student sidebar
//     { path: "/student-dashboard", label: "Dashboard", roles: ["student"], icon: LayoutDashboard },
//     { path: "/student-results", label: "Results", roles: ["student"], icon: BarChart2 },
//     { path: "/student-attendance", label: "Attendance", roles: ["student"], icon: BookOpenCheck },
//     { path: "/student-settings", label: "Settings", roles: ["student"], icon: UserCog },
//   ];


import {
    LayoutDashboard,
    Users,
    Layers3,
    BookOpenCheck,
    BarChart2,
    UserCog,
    Megaphone,
    TrendingUp,
    CalendarDays,
    ClipboardList,
    DollarSign,
    Repeat
  } from "lucide-react";


  export const navItems = [
    { path: "/dashboard", label: "Dashboard", roles: ["admin"], icon: LayoutDashboard },
  
    { path: "/timetable", label: "Timetable", roles: ["admin", "staff"], module: "timetable", icon: CalendarDays },
    { path: "/students", label: "Students", roles: ["admin", "staff"], module: "students", icon: Users },
    { path: "/teachers", label: "Teachers", roles: ["admin", "staff"], module: "teachers", icon: Users },
    { path: "/subjects", label: "Subjects", roles: ["admin", "staff"], module: "subjects", icon: BookOpenCheck },
    { path: "/attendance", label: "Attendance", roles: ["admin", "staff"], module: "attendance", icon: ClipboardList },
    { path: "/attendance-reports", label: "Attendance Reports", roles: ["admin", "staff"], module: "attendanceReports", icon: BarChart2 },
    { path: "/grades", label: "Grades", roles: ["admin", "staff", "teacher"], module: "grades", icon: Layers3 },
    { path: "/exams", label: "Exam Management", roles: ["admin", "staff"], module: "exams", icon: BarChart2 },
    { path: "/results", label: "Results", roles: ["admin", "staff", "teacher"], module: "results", icon: BarChart2 },
    { path: "/promotions", label: "Promotions", roles: ["admin", "staff"], module: "promotions",  icon: TrendingUp },
    { path: "/cohorts", label: "Cohorts", roles: ["admin", "staff"], module: "cohorts", icon: Users },
    { path: "/transcripts", label: "Transcripts", roles: ["admin", "staff"], module: "transcript", icon: BookOpenCheck },
      { path: '/transfers', label: 'Transfers', roles: ["admin", "staff"], module: "transfers", icon: Repeat },

  
    { path: "/users", label: "User Management", roles: ["admin"], icon: UserCog },
  
    // Student sidebar (self-service)
    { path: "/student-dashboard", label: "Dashboard", roles: ["student"], studentNav: true, icon: LayoutDashboard },
    { path: "/student-dashboard/transcript", label: "Transcript", roles: ["student"], studentNav: true, icon: BarChart2 },
    { path: "/student-dashboard/attendance", label: "Attendance", roles: ["student"], studentNav: true, icon: ClipboardList },
    { path: "/student-dashboard/timetable", label: "Timetable", roles: ["student"], studentNav: true, icon: CalendarDays },
    { path: "/student-dashboard/library", label: "Library", roles: ["student"], studentNav: true, icon: BookOpenCheck },
    { path: "/student-dashboard/enrollments", label: "Enrollments", roles: ["student"], studentNav: true, icon: Layers3 },
    { path: "/student-dashboard/transfers", label: "Transfers", roles: ["student"], studentNav: true, icon: Repeat },
    { path: "/student-dashboard/profile", label: "Profile", roles: ["student"], studentNav: true, icon: Users },

    // Shared modules
    { path: "/announcements", label: "Announcements", roles: ["admin", "staff", "student"], module: "announcements", icon: Megaphone },
  ];
  
  
  // export const navItems = [
  //   { path: "/dashboard", label: "Dashboard", roles: ["admin"], icon: LayoutDashboard },
  //   { path: '/timetable', label: 'Timetable', icon: CalendarDays , roles: ["admin", "staff"],},
  //   { path: "/students", label: "Students", roles: ["admin", "staff"], icon: Users },
  //   { path: "/teachers", label: "Teachers", roles: ["admin", "staff"], icon: Users },
  //   { path: "/subjects", label: "Subjects", roles: ["admin", "staff"], icon: BookOpenCheck },
  //   { path: '/attendance', label: 'Attendance', icon: ClipboardList, roles: ["admin", "staff"], },
  //   { path: '/attendance-reports', label: 'Attendance Reports', icon: BarChart2, roles: ["admin", "staff"], },
  //   { path: "/grades", label: "Grades", roles: ["admin", "staff", "teacher"], icon: Layers3 },
  //   { path: "/exams", label: "Exam Management", roles: ["admin", "staff"], icon: BarChart2 },
  //   { path: "/results", label: "Results", roles: ["admin", "staff", "teacher", ], icon: BarChart2 },
  //   { path: '/promotions', label: 'Promotions', roles: ["admin", "staff"], icon: TrendingUp },
  //   { path: '/cohorts', label: 'Cohorts', roles: ["admin", "staff"], icon: Users },
  //   { path: '/transcripts', label: 'Transcripts', roles: ["admin", "staff"], icon: BookOpenCheck },

  //   // { path: "/announcements", label: "Announcements", roles: ["admin", "teacher", "staff", "staff", "student"], icon: Megaphone },
  //   { path: "/announcements", label: "Announcements", roles: ["admin", "staff","student"], icon: Megaphone },
  
  
  //   { path: "/users", label: "User Management", roles: ["admin"], icon: UserCog },


  //   { path: "/student-dashboard", label: "Dashboard", roles: ["student"], icon: LayoutDashboard },
  //   { path: "/student-results", label: "Results", roles: ["student"], icon: BarChart2 },
  //   { path: "/student-attendance", label: "Attendance", roles: ["student"], icon: BookOpenCheck },
  //   // { path: "/student-announcements", label: "Announcements", roles: ["student"], icon: Megaphone },
  //   { path: "/student-settings", label: "Settings", roles: ["student"], icon: UserCog },
  //   // Admin management
  //   { path: '/admin/teachers', label: 'Teachers', icon: Users },
  // ];