import React, { useMemo, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { navItems } from '../../../config/navigation';
import logo from '../../../assets/nuuruBayaan.png';
import { useAuth } from '../../../auth/AuthContext';
import Badge from '../ui/Badge.jsx';
import { useAnnouncementsUnread } from '../../../features/announcements/hooks/useAnnouncementsUnread';

export default function Sidebar({ isMobileMenuOpen, isCollapsed, closeMobileMenu }) {
  const navLinkClasses = ({ isActive }) =>
    `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
      isActive ? 'bg-(--nb-color-brand) text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  const { auth, hasPermission } = useAuth();
  const location = useLocation();

  const userKey = auth?.user?._id || auth?.user?.username || null;
  const announcementsUnread = useAnnouncementsUnread(userKey);

  const role = String(auth?.user?.role || '').toLowerCase();
  const homePath = role === 'student' ? '/student-dashboard' : (role === 'teacher' ? '/teacher-dashboard' : '/dashboard');

  const canAccessModule = (module) => {
    if (role === 'admin') return true;
    if (!module) return false;

    const actions = [
      'view',
      'add',
      'edit',
      'input',
      'delete',
      'download',
      'export',
      'transfer',
      'deactivate',
      'reactivate',
      'assign',
      'preview',
      'promote',
      'print',
      'full',
    ];

    // Backward compatibility: older setups used `attendance.*` for Attendance Reports
    if (module === 'attendanceReports') {
      return actions.some((action) => hasPermission('attendanceReports', action))
        || actions.some((action) => hasPermission('attendance', action));
    }

    return actions.some((action) => hasPermission(module, action));
  };

  const canAccessPermission = (perm) => {
    if (!perm) return true;
    if (role === 'admin') return true;
    const mod = perm?.module;
    const action = perm?.action;
    if (!mod || !action) return true;
    return hasPermission(mod, action);
  };

  const isItemVisibleForRole = (item) => {
    if (!item) return false;

    if (role === 'admin') {
      return !Array.isArray(item.roles) || item.roles.includes('admin');
    }

    if (role === 'staff') {
      // For staff: prefer module/permission checks.
      if (item.module) return canAccessModule(item.module) && canAccessPermission(item.permission);
      return Array.isArray(item.roles) && item.roles.includes('staff');
    }

    if (role === 'student') {
      const isStudentRole = Array.isArray(item.roles) && item.roles.includes('student');
      if (!isStudentRole) return false;
      return item.studentNav === true || item.module === 'announcements';
    }

    if (role === 'teacher') {
      return Array.isArray(item.roles) && item.roles.includes('teacher');
    }

    return false;
  };

  const visibleNavItems = useMemo(() => {
    const filterWithChildren = (item) => {
      if (!item) return false;
      if (Array.isArray(item.children) && item.children.length) {
        const visibleKids = item.children.filter(filterWithChildren);
        return visibleKids.length > 0;
      }
      return isItemVisibleForRole(item);
    };

    const mapWithChildren = (item) => {
      if (!item) return null;
      if (Array.isArray(item.children) && item.children.length) {
        const children = item.children.map(mapWithChildren).filter(Boolean);
        if (!children.length) return null;
        return { ...item, children };
      }
      return filterWithChildren(item) ? item : null;
    };

    const base = navItems.map(mapWithChildren).filter(Boolean);

    // Teacher UX: keep a predictable, action-first order.
    if (role === 'teacher') {
      const order = new Map([
        ['/teacher-dashboard', 0],
        ['/teacher-classes', 1],
        ['/timetable', 2],
        ['/attendance', 3],
        ['/attendance-reports', 4],
        ['__EXAMS__', 5],
        ['/teacher-profile', 6],
        ['/announcements', 7],
      ]);

      const keyOf = (item) => {
        if (!item) return '';
        if (item.path) return String(item.path);
        if (String(item.label || '') === 'Exam Management') return '__EXAMS__';
        return String(item.label || '');
      };

      return base
        .map((it, idx) => ({ it, idx }))
        .sort((a, b) => {
          const ak = keyOf(a.it);
          const bk = keyOf(b.it);
          const ai = order.has(ak) ? order.get(ak) : 999;
          const bi = order.has(bk) ? order.get(bk) : 999;
          if (ai !== bi) return ai - bi;
          return a.idx - b.idx;
        })
        .map((x) => x.it);
    }

    return base;
  }, [role, hasPermission]);

  const [examOpen, setExamOpen] = useState(() => {
    const p = location.pathname;
    return p.startsWith('/exams') || p.startsWith('/results') || p.startsWith('/transcripts');
  });

  const toggleExamOpen = () => setExamOpen((v) => !v);

  const onMobileNavClick = () => {
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
  };

  const renderNavItems = ({ variant }) => {
    const isMobile = variant === 'mobile';
    const collapsed = !isMobile && Boolean(isCollapsed);

    return (visibleNavItems || []).map((item) => {
      const Icon = item.icon;
      const hasChildren = Array.isArray(item.children) && item.children.length;

      if (hasChildren) {
        const isExamGroup = item.label === 'Exam Management';
        const isOpen = isExamGroup ? examOpen : false;
        const onToggle = isExamGroup ? toggleExamOpen : null;

        return (
          <div key={item.label}>
            <button
              type="button"
              onClick={onToggle || undefined}
              disabled={!onToggle}
              className={
                `w-full flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                  isOpen ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                } ` + (collapsed ? 'justify-center' : '')
              }
              title={collapsed ? item.label : ''}
            >
              {Icon ? <Icon size={22} /> : null}
              {!collapsed ? <span className="ml-4 flex-1 text-left">{item.label}</span> : null}
              {!collapsed ? (isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : null}
            </button>

            {isOpen && !collapsed ? (
              <div className="ml-6 border-l border-gray-700 pl-2">
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={({ isActive }) =>
                      `flex items-center p-2 my-1 rounded-md transition-colors duration-200 ${
                        isActive ? 'bg-(--nb-color-brand) text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`
                    }
                    onClick={isMobile ? onMobileNavClick : undefined}
                  >
                    <span className="ml-2 text-sm">{child.label}</span>
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        );
      }

      const isDashboardPath = item.path === '/dashboard' || item.path === '/student-dashboard' || item.path === '/teacher-dashboard';
      const isAnnouncements = item.path === '/announcements' || item.module === 'announcements';

      return (
        <NavLink
          key={item.path}
          to={item.path}
          end={isDashboardPath}
          className={navLinkClasses}
          onClick={isMobile ? onMobileNavClick : undefined}
          title={collapsed ? item.label : ''}
        >
          {Icon ? <Icon size={22} className="shrink-0" /> : null}
          {!collapsed ? (
            <span className="ml-4 flex-1 flex items-center justify-between gap-2">
              <span>{item.label}</span>
              {isAnnouncements && announcementsUnread > 0 ? (
                <Badge variant="danger" className="px-2 py-0.5 text-[11px]">{announcementsUnread}</Badge>
              ) : null}
            </span>
          ) : (
            // Collapsed: still show a tiny dot for unread
            isAnnouncements && announcementsUnread > 0 ? (
              <span className="ml-1 inline-block w-2 h-2 rounded-full bg-red-500" />
            ) : null
          )}
        </NavLink>
      );
    });
  };

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside className={`bg-gray-800 text-white flex-col h-full transition-all duration-300 ease-in-out hidden md:flex no-print ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <Link to={homePath} className="flex items-center justify-center h-16 border-b border-gray-700 px-4 hover:bg-gray-700 transition-colors">
          <img src={logo} alt="Nuuru Al-Bayaan Logo" className={`h-10 transition-all shrink-0 ${isCollapsed ? 'w-10' : 'w-auto'}`} />
          {!isCollapsed ? (
            <span className="ml-3 font-semibold text-lg whitespace-nowrap overflow-hidden">Nuuru Al-Bayaan</span>
          ) : null}
        </Link>

        <nav className={`flex-1 px-4 py-4 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
          {renderNavItems({ variant: 'desktop' })}
        </nav>
      </aside>

      {/* Sidebar for Mobile */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white flex-col z-30 transition-transform duration-300 ease-in-out md:hidden flex no-print ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to={homePath} onClick={onMobileNavClick} className="flex items-center justify-center h-16 border-b border-gray-700 px-4 shrink-0">
          <img src={logo} alt="Nuuru Al-Bayaan Logo" className="h-10" />
          <span className="ml-3 font-semibold text-lg">Nuuru Al-Bayaan</span>
        </Link>

        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          {renderNavItems({ variant: 'mobile' })}
        </nav>
      </aside>
    </>
  );
}


