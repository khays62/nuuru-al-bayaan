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
    { path: "/dashboard", label: "Dashboard", roles: ["admin"], icon: LayoutDashboard },
	{ path: "/teacher-dashboard", label: "Dashboard", roles: ["teacher"], icon: LayoutDashboard },
  { path: "/teacher-classes", label: "My Classes", roles: ["teacher"], icon: Layers3 },
  { path: "/teacher-profile", label: "Profile", roles: ["teacher"], icon: Users },
  
    { path: "/timetable", label: "Timetable", roles: ["admin", "staff", "teacher"], module: "timetable", icon: CalendarDays },
    { path: "/students", label: "Students", roles: ["admin", "staff"], module: "students", icon: Users },
    { path: "/teachers", label: "Teachers", roles: ["admin", "staff"], module: "teachers", icon: Users },
    { path: "/subjects", label: "Subjects", roles: ["admin", "staff"], module: "subjects", icon: BookOpenCheck },
    { path: "/attendance", label: "Attendance", roles: ["admin", "staff", "teacher"], module: "attendance", icon: ClipboardList },
    { path: "/attendance-reports", label: "Attendance Reports", roles: ["admin", "staff", "teacher"], module: "attendanceReports", icon: BarChart2 },
    { path: "/grades", label: "Classes", roles: ["admin", "staff"], module: "grades", icon: Layers3 },
    {
      label: "Exam Management",
      icon: BarChart2,
      roles: ["admin", "staff", "teacher"],
      children: [
        { path: "/exams", label: "Exam Scores", roles: ["admin", "staff", "teacher"], module: "exams" },
        { path: "/exam-settings", label: "Exam Settings", roles: ["admin", "staff"], module: "exams", permission: { module: "exams", action: "input" } },
        { path: "/results", label: "Results", roles: ["admin", "staff", "teacher"], module: "results" },
        { path: "/transcripts", label: "Transcripts", roles: ["admin", "staff"], module: "transcript" },
      ]
    },
    { path: "/promotions", label: "Promotions", roles: ["admin", "staff"], module: "promotions",  icon: TrendingUp },
    { path: "/cohorts", label: "Cohorts", roles: ["admin", "staff"], module: "cohorts", icon: Users },
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
    { path: "/announcements", label: "Announcements", roles: ["admin", "staff", "teacher", "student"], module: "announcements", icon: Megaphone },
  ];
