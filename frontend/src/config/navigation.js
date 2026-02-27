import {
    LayoutDashboard,
    Users,
    Layers3,
    BookOpenCheck,
    BarChart2,
    UserCog,
  Settings,
    Banknote,
    ReceiptText,
    Wallet,
    Briefcase,
    LayoutDashboard as DashboardIcon,
    Megaphone,
    TrendingUp,
    CalendarDays,
    ClipboardList,
    Repeat
  } from "lucide-react";


  export const navItems = [
    // Dashboard
  { key: 'dashboard', group: 'Dashboard', groupKey: 'nav.dashboard', path: "/dashboard", label: "Dashboard", labelKey: 'nav.dashboard', roles: ["admin", "staff"], icon: LayoutDashboard },
  { key: 'profile', group: 'Dashboard', groupKey: 'nav.dashboard', path: "/profile", label: "Profile", labelKey: 'nav.profile', roles: ["admin", "staff"], icon: Users },
	{ key: 'teacher-dashboard', group: 'Dashboard', groupKey: 'nav.dashboard', path: "/teacher-dashboard", label: "Dashboard", labelKey: 'nav.dashboard', roles: ["teacher"], icon: LayoutDashboard },
    { key: 'teacher-classes', group: 'Dashboard', groupKey: 'nav.dashboard', path: "/teacher-classes", label: "My Classes", labelKey: 'nav.myClasses', roles: ["teacher"], icon: Layers3 },
    { key: 'teacher-profile', group: 'Dashboard', groupKey: 'nav.dashboard', path: "/teacher-profile", label: "Profile", labelKey: 'nav.profile', roles: ["teacher"], icon: Users },

    // Finance (dropdown)
    {
      key: 'finance',
      group: 'Finance',
      label: 'Finance',
      groupKey: 'nav.finance',
      labelKey: 'nav.finance',
      icon: Banknote,
      roles: ['admin', 'staff'],
      collapsible: true,
      children: [
        { key: 'finance-dashboard', path: '/finance/dashboard', label: 'Dashboard', labelKey: 'nav.financeDashboard', roles: ['admin', 'staff'], module: 'financeDashboard', icon: DashboardIcon },
        { key: 'finance-accounts', path: '/finance/accounts', label: 'Accounts', labelKey: 'nav.financeAccounts', roles: ['admin', 'staff'], module: 'financeAccounts', icon: Banknote },
        { key: 'finance-student', path: '/finance/student-finance', label: 'Student Finance', labelKey: 'nav.financeStudentFinance', roles: ['admin', 'staff'], module: 'financeStudent', icon: ReceiptText },
        { key: 'finance-payroll', path: '/finance/payroll', label: 'Payroll', labelKey: 'nav.financePayroll', roles: ['admin', 'staff'], module: 'financePayroll', icon: Wallet },
        { key: 'finance-expenses', path: '/finance/expenses', label: 'Expenses', labelKey: 'nav.financeExpenses', roles: ['admin', 'staff'], module: 'financeExpenses', icon: Briefcase },
      ],
    },

    // Users (dropdown)
    {
      key: 'people',
      group: 'Users',
      label: "Users",
      groupKey: 'nav.people',
      labelKey: 'nav.people',
      icon: Users,
      roles: ["admin", "staff"],
      collapsible: true,
      children: [
        { key: 'students', path: "/students", label: "Students", labelKey: 'nav.students', roles: ["admin", "staff"], module: "students" },
        { key: 'teachers', path: "/teachers", label: "Teachers", labelKey: 'nav.teachers', roles: ["admin", "staff"], module: "teachers" },
        { key: 'users', path: "/users", label: "User Management", labelKey: 'nav.userManagement', roles: ["admin"], icon: UserCog },
      ],
    },

    // Academics (dropdown)
    {
      key: 'academics',
      group: 'Academics',
      label: "Academics",
      groupKey: 'nav.academics',
      labelKey: 'nav.academics',
      icon: BookOpenCheck,
      roles: ["admin", "staff"],
      collapsible: true,
      children: [
        { key: 'classes', path: "/grades", label: "Classes", labelKey: 'nav.classes', roles: ["admin", "staff"], module: "grades" },
        { key: 'subjects', path: "/subjects", label: "Subjects", labelKey: 'nav.subjects', roles: ["admin", "staff"], module: "subjects" },
        { key: 'cohorts', path: "/cohorts", label: "Cohorts", labelKey: 'nav.cohorts', roles: ["admin", "staff"], module: "cohorts" },
        { key: 'promotions', path: "/promotions", label: "Promotions", labelKey: 'nav.promotions', roles: ["admin", "staff"], module: "promotions" },
        { key: 'transfers', path: '/transfers', label: 'Transfers', labelKey: 'nav.transfers', roles: ["admin", "staff"], module: "transfers" },
      ],
    },

    // Academics Setup (dropdown)
    {
      key: 'academics-setup',
      group: 'Academics',
      label: 'Setup',
      groupKey: 'nav.academics',
      labelKey: 'nav.setup',
      icon: Settings,
      roles: ['admin'],
      collapsible: true,
      children: [
        { key: 'setup-grades', path: '/setup/grades', label: 'Grades', labelKey: 'nav.grades', roles: ['admin'] },
        { key: 'setup-shifts', path: '/setup/shifts', label: 'Shifts', labelKey: 'nav.shifts', roles: ['admin'] },
        { key: 'setup-academic-years', path: '/setup/academic-years', label: 'Academic Years', labelKey: 'nav.academicYears', roles: ['admin'] },
      ],
    },

    // Exams (dropdown)
    {
      key: 'exams',
      group: 'Exams',
      label: "Exams",
      groupKey: 'nav.exams',
      labelKey: 'nav.exams',
      icon: BarChart2,
      roles: ["admin", "staff", "teacher"],
      collapsible: true,
      children: [
        { key: 'exam-scores', path: "/exams", label: "Exam Scores", labelKey: 'nav.examScores', roles: ["admin", "staff", "teacher"], module: "exams" },
        { key: 'exam-settings', path: "/exam-settings", label: "Exam Settings", labelKey: 'nav.examSettings', roles: ["admin", "staff"], module: "exams", permission: { module: "exams", action: "input" } },
        { key: 'results', path: "/results", label: "Results", labelKey: 'nav.results', roles: ["admin", "staff", "teacher"], module: "results" },
        { key: 'transcripts', path: "/transcripts", label: "Transcripts", labelKey: 'nav.transcripts', roles: ["admin", "staff"], module: "transcript" },
      ]
    },

    // Operations (dropdown)
    {
      key: 'operations',
      group: 'Operations',
      label: "Operations",
      groupKey: 'nav.operations',
      labelKey: 'nav.operations',
      icon: ClipboardList,
      roles: ["admin", "staff", "teacher"],
      collapsible: true,
      children: [
        { key: 'attendance', path: "/attendance", label: "Attendance", labelKey: 'nav.attendance', roles: ["admin", "staff", "teacher"], module: "attendance" },
        { key: 'attendance-reports', path: "/attendance-reports", label: "Attendance Reports", labelKey: 'nav.attendanceReports', roles: ["admin", "staff", "teacher"], module: "attendanceReports" },
        { key: 'timetable', path: "/timetable", label: "Timetable", labelKey: 'nav.timetable', roles: ["admin", "staff", "teacher"], module: "timetable" },
      ],
    },
  
    // Student sidebar (self-service)
    { key: 'student-dashboard', path: "/student-dashboard", label: "Dashboard", labelKey: 'nav.dashboard', roles: ["student"], studentNav: true, icon: LayoutDashboard },
    { key: 'student-transcript', path: "/student-dashboard/transcript", label: "Transcript", labelKey: 'nav.transcript', roles: ["student"], studentNav: true, icon: BarChart2 },
    { key: 'student-attendance', path: "/student-dashboard/attendance", label: "Attendance", labelKey: 'nav.attendance', roles: ["student"], studentNav: true, icon: ClipboardList },
    { key: 'student-timetable', path: "/student-dashboard/timetable", label: "Timetable", labelKey: 'nav.timetable', roles: ["student"], studentNav: true, icon: CalendarDays },
    { key: 'student-library', path: "/student-dashboard/library", label: "Library", labelKey: 'nav.library', roles: ["student"], studentNav: true, icon: BookOpenCheck },
    { key: 'student-enrollments', path: "/student-dashboard/enrollments", label: "Enrollments", labelKey: 'nav.enrollments', roles: ["student"], studentNav: true, icon: Layers3 },
    { key: 'student-transfers', path: "/student-dashboard/transfers", label: "Transfers", labelKey: 'nav.transfers', roles: ["student"], studentNav: true, icon: Repeat },
    { key: 'student-profile', path: "/student-dashboard/profile", label: "Profile", labelKey: 'nav.profile', roles: ["student"], studentNav: true, icon: Users },

    // Shared modules
    { key: 'announcements', group: 'Announcements', groupKey: 'nav.announcements', path: "/announcements", label: "Announcements", labelKey: 'nav.announcements', roles: ["admin", "staff", "teacher", "student"], module: "announcements", icon: Megaphone },
  ];
