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
    ClipboardList
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
    { path: "/transcripts", label: "Transcripts", roles: ["admin", "staff"], module: "transcripts", icon: BookOpenCheck },
  
    { path: "/announcements", label: "Announcements", roles: ["admin", "staff", "student"], module: "announcements", icon: Megaphone },
  
    { path: "/users", label: "User Management", roles: ["admin"], icon: UserCog },
  
    // Student sidebar
    { path: "/student-dashboard", label: "Dashboard", roles: ["student"], icon: LayoutDashboard },
    { path: "/student-results", label: "Results", roles: ["student"], icon: BarChart2 },
    { path: "/student-attendance", label: "Attendance", roles: ["student"], icon: BookOpenCheck },
    { path: "/student-settings", label: "Settings", roles: ["student"], icon: UserCog },
  ];
  
  