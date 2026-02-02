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
    Repeat
  } from "lucide-react";


  export const navItems = [
    // Dashboard
    { key: 'dashboard', group: 'Dashboard', path: "/dashboard", label: "Dashboard", roles: ["admin"], icon: LayoutDashboard },
	{ key: 'teacher-dashboard', group: 'Dashboard', path: "/teacher-dashboard", label: "Dashboard", roles: ["teacher"], icon: LayoutDashboard },
    { key: 'teacher-classes', group: 'Dashboard', path: "/teacher-classes", label: "My Classes", roles: ["teacher"], icon: Layers3 },
    { key: 'teacher-profile', group: 'Dashboard', path: "/teacher-profile", label: "Profile", roles: ["teacher"], icon: Users },

    // People (dropdown)
    {
      key: 'people',
      group: 'People',
      label: "People",
      icon: Users,
      roles: ["admin", "staff"],
      collapsible: true,
      children: [
        { key: 'students', path: "/students", label: "Students", roles: ["admin", "staff"], module: "students" },
        { key: 'teachers', path: "/teachers", label: "Teachers", roles: ["admin", "staff"], module: "teachers" },
        { key: 'users', path: "/users", label: "User Management", roles: ["admin"], icon: UserCog },
      ],
    },

    // Academics (dropdown)
    {
      key: 'academics',
      group: 'Academics',
      label: "Academics",
      icon: BookOpenCheck,
      roles: ["admin", "staff"],
      collapsible: true,
      children: [
        { key: 'classes', path: "/grades", label: "Classes", roles: ["admin", "staff"], module: "grades" },
        { key: 'subjects', path: "/subjects", label: "Subjects", roles: ["admin", "staff"], module: "subjects" },
        { key: 'cohorts', path: "/cohorts", label: "Cohorts", roles: ["admin", "staff"], module: "cohorts" },
        { key: 'promotions', path: "/promotions", label: "Promotions", roles: ["admin", "staff"], module: "promotions" },
        { key: 'transfers', path: '/transfers', label: 'Transfers', roles: ["admin", "staff"], module: "transfers" },
      ],
    },

    // Exams (dropdown)
    {
      key: 'exams',
      group: 'Exams',
      label: "Exams",
      icon: BarChart2,
      roles: ["admin", "staff", "teacher"],
      collapsible: true,
      children: [
        { key: 'exam-scores', path: "/exams", label: "Exam Scores", roles: ["admin", "staff", "teacher"], module: "exams" },
        { key: 'exam-settings', path: "/exam-settings", label: "Exam Settings", roles: ["admin", "staff"], module: "exams", permission: { module: "exams", action: "input" } },
        { key: 'results', path: "/results", label: "Results", roles: ["admin", "staff", "teacher"], module: "results" },
        { key: 'transcripts', path: "/transcripts", label: "Transcripts", roles: ["admin", "staff"], module: "transcript" },
      ]
    },

    // Operations (dropdown)
    {
      key: 'operations',
      group: 'Operations',
      label: "Operations",
      icon: ClipboardList,
      roles: ["admin", "staff", "teacher"],
      collapsible: true,
      children: [
        { key: 'attendance', path: "/attendance", label: "Attendance", roles: ["admin", "staff", "teacher"], module: "attendance" },
        { key: 'attendance-reports', path: "/attendance-reports", label: "Attendance Reports", roles: ["admin", "staff", "teacher"], module: "attendanceReports" },
        { key: 'timetable', path: "/timetable", label: "Timetable", roles: ["admin", "staff", "teacher"], module: "timetable" },
      ],
    },
  
    // Student sidebar (self-service)
    { key: 'student-dashboard', path: "/student-dashboard", label: "Dashboard", roles: ["student"], studentNav: true, icon: LayoutDashboard },
    { key: 'student-transcript', path: "/student-dashboard/transcript", label: "Transcript", roles: ["student"], studentNav: true, icon: BarChart2 },
    { key: 'student-attendance', path: "/student-dashboard/attendance", label: "Attendance", roles: ["student"], studentNav: true, icon: ClipboardList },
    { key: 'student-timetable', path: "/student-dashboard/timetable", label: "Timetable", roles: ["student"], studentNav: true, icon: CalendarDays },
    { key: 'student-library', path: "/student-dashboard/library", label: "Library", roles: ["student"], studentNav: true, icon: BookOpenCheck },
    { key: 'student-enrollments', path: "/student-dashboard/enrollments", label: "Enrollments", roles: ["student"], studentNav: true, icon: Layers3 },
    { key: 'student-transfers', path: "/student-dashboard/transfers", label: "Transfers", roles: ["student"], studentNav: true, icon: Repeat },
    { key: 'student-profile', path: "/student-dashboard/profile", label: "Profile", roles: ["student"], studentNav: true, icon: Users },

    // Shared modules
    { key: 'announcements', group: 'Announcements', path: "/announcements", label: "Announcements", roles: ["admin", "staff", "teacher", "student"], module: "announcements", icon: Megaphone },
  ];
