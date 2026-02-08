import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { navItems } from '../../../config/navigation';
import logo from '../../../assets/nuuruBayaan.png';
import { useAuth } from '../../../auth/AuthContext';
import Badge from '../ui/Badge.jsx';
import { useAnnouncementsUnread } from '../../../features/announcements/hooks/useAnnouncementsUnread';
import { MODULE_PERMISSIONS } from '../../auth/permissionContract.js';
import { useI18n } from '../../../i18n/I18nProvider';

export default function Sidebar({ isMobileMenuOpen, isCollapsed, closeMobileMenu }) {
  const { isRTL, t } = useI18n();
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

    const actions = Array.isArray(MODULE_PERMISSIONS?.[module]) ? MODULE_PERMISSIONS[module] : [];

    // Backward compatibility: older setups used `attendance.*` for Attendance Reports
    if (module === 'attendanceReports') {
      const reportActions = Array.isArray(MODULE_PERMISSIONS?.attendanceReports) ? MODULE_PERMISSIONS.attendanceReports : actions;
      const attendanceActions = Array.isArray(MODULE_PERMISSIONS?.attendance) ? MODULE_PERMISSIONS.attendance : [];
      return reportActions.some((action) => hasPermission('attendanceReports', action))
        || attendanceActions.some((action) => hasPermission('attendance', action));
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
      if (!Array.isArray(item.roles) || !item.roles.includes('teacher')) return false;
      // Teachers are scoped by backend TeacherAssignment rules (not staff permission modules).
      // So the teacher nav should be role-based and stable.
      return true;
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
        ['__OPERATIONS__', 2],
        ['__EXAMS__', 3],
        ['/teacher-profile', 4],
        ['/announcements', 5],
      ]);

      const keyOf = (item) => {
        if (!item) return '';
        if (item.path) return String(item.path);
        if (String(item.key || '') === 'exams' || String(item.label || '') === 'Exam Management' || String(item.label || '') === 'Exams') return '__EXAMS__';
        if (String(item.key || '') === 'operations' || String(item.label || '') === 'Operations') return '__OPERATIONS__';
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

  const [openGroups, setOpenGroups] = useState(() => ({}));

  useEffect(() => {
    const p = location.pathname;
    const keysToOpen = [];

    for (const item of visibleNavItems || []) {
      if (!Array.isArray(item.children) || !item.children.length) continue;
      const key = String(item.key || item.label || '');
      if (!key) continue;

      const match = item.children.some((child) => {
        const childPath = String(child?.path || '');
        if (!childPath) return false;
        return p === childPath || p.startsWith(childPath + '/') || p.startsWith(childPath);
      });

      if (match) keysToOpen.push(key);
    }

    if (!keysToOpen.length) return;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const k of keysToOpen) next[k] = true;
      return next;
    });
  }, [location.pathname, visibleNavItems]);

  const onMobileNavClick = () => {
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
  };

  const renderNavItems = ({ variant }) => {
    const isMobile = variant === 'mobile';
    const collapsed = !isMobile && Boolean(isCollapsed);

    const showGroupHeaders = (role === 'admin' || role === 'staff') && !collapsed;
    let lastGroup = null;

    return (visibleNavItems || []).map((item) => {
      const Icon = item.icon;
      const hasChildren = Array.isArray(item.children) && item.children.length;

      const itemLabel = item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label;
      const itemGroup = item.groupKey ? t(item.groupKey, { defaultValue: item.group }) : item.group;

      const group = String(itemGroup || '');
      const shouldRenderHeader = showGroupHeaders && group && group !== lastGroup;
      if (shouldRenderHeader) lastGroup = group;

      if (hasChildren) {
        const groupKey = String(item.key || item.label || '');
        const isOpen = Boolean(openGroups[groupKey]);
        const onToggle = () => {
          if (!groupKey) return;
          setOpenGroups((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
          }));
        };

        return (
          <div key={item.key || item.label}>
            {shouldRenderHeader ? (
              <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {group}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onToggle}
              className={
                `w-full flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                  isOpen ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                } ` + (collapsed ? 'justify-center' : '')
              }
              title={collapsed ? item.label : ''}
            >
              {Icon ? <Icon size={22} /> : null}
			  {!collapsed ? <span className="ms-4 flex-1 text-start">{itemLabel}</span> : null}
              {!collapsed ? (isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : null}
            </button>

            {isOpen && !collapsed ? (
              <div className="ms-6 border-s border-gray-700 ps-2">
                {item.children.map((child) => {
                  const childLabel = child.labelKey
                    ? t(child.labelKey, { defaultValue: child.label })
                    : child.label;

                  return (
                    <NavLink
                      key={child.key || child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `flex items-center p-2 my-1 rounded-md transition-colors duration-200 ${
                          isActive ? 'bg-(--nb-color-brand) text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`
                      }
                      onClick={isMobile ? onMobileNavClick : undefined}
                    >
                      <span className="ms-2 text-sm">{childLabel}</span>
                    </NavLink>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      }

      const isDashboardPath = item.path === '/dashboard' || item.path === '/student-dashboard' || item.path === '/teacher-dashboard';
      const isAnnouncements = item.path === '/announcements' || item.module === 'announcements';

      return (
        <React.Fragment key={item.key || item.path}>
          {shouldRenderHeader ? (
            <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {group}
            </div>
          ) : null}
          <NavLink
          to={item.path}
          end={isDashboardPath}
          className={navLinkClasses}
          onClick={isMobile ? onMobileNavClick : undefined}
          title={collapsed ? item.label : ''}
        >
          {Icon ? <Icon size={22} className="shrink-0" /> : null}
          {!collapsed ? (
            <span className="ms-4 flex-1 flex items-center justify-between gap-2">
              <span>{itemLabel}</span>
              {isAnnouncements && announcementsUnread > 0 ? (
                <Badge variant="danger" className="px-2 py-0.5 text-[11px]">{announcementsUnread}</Badge>
              ) : null}
            </span>
          ) : (
            // Collapsed: still show a tiny dot for unread
            isAnnouncements && announcementsUnread > 0 ? (
              <span className="ms-1 inline-block w-2 h-2 rounded-full bg-red-500" />
            ) : null
          )}
          </NavLink>
        </React.Fragment>
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
            <span className="ms-3 font-semibold text-lg whitespace-nowrap overflow-hidden">Nuuru Al-Bayaan</span>
          ) : null}
        </Link>

        <nav className={`flex-1 px-4 py-4 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
          {renderNavItems({ variant: 'desktop' })}
        </nav>
      </aside>

      {/* Sidebar for Mobile */}
      <aside className={
        `fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full w-64 bg-gray-800 text-white flex-col z-30 transition-transform duration-300 ease-in-out md:hidden flex no-print ` +
        (isMobileMenuOpen
          ? 'translate-x-0'
          : (isRTL ? 'translate-x-full' : '-translate-x-full'))
      }>
        <Link to={homePath} onClick={onMobileNavClick} className="flex items-center justify-center h-16 border-b border-gray-700 px-4 shrink-0">
          <img src={logo} alt="Nuuru Al-Bayaan Logo" className="h-10" />
          <span className="ms-3 font-semibold text-lg">Nuuru Al-Bayaan</span>
        </Link>

        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          {renderNavItems({ variant: 'mobile' })}
        </nav>
      </aside>
    </>
  );
}


