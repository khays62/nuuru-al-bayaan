import React, { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
import { getStudentProfile } from '../api/studentsApi';
import { studentKeys } from '../queryKeys';
import Card from '../../../shared/components/ui/Card.jsx';
import { useStudentDashboardRealtimeInvalidation } from '../components/dashboard/useStudentDashboardRealtimeInvalidation';

function TabNav({ tabs = [] }) {
  const { t } = useI18n();
  const PRIMARY_SIZE = 3;
  const [tabsOrder, setTabsOrder] = useState(Array.isArray(tabs) ? tabs : []);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setTabsOrder(Array.isArray(tabs) ? tabs : []);
  }, [tabs]);
  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [open]);
  const promote = (to) => {
    setTabsOrder(prev => {
      const idx = prev.findIndex(t => t.to === to);
      if (idx < 0) return prev;
      if (idx < PRIMARY_SIZE) return prev; // already visible
      const arr = [...prev];
      const swapIdx = PRIMARY_SIZE - 1; // swap with last primary slot
      const tmp = arr[swapIdx];
      arr[swapIdx] = arr[idx];
      arr[idx] = tmp;
      return arr;
    });
    setOpen(false);
  };
  const primary = tabsOrder.slice(0, PRIMARY_SIZE);
  const overflow = tabsOrder.slice(PRIMARY_SIZE);
  return (
    <div className="mb-4">
      {/* Desktop: show all */}
      <nav
        className="hidden md:flex items-center gap-2 p-1 rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-x-auto"
        aria-label={t('common.aria.tabs', { defaultValue: 'Tabs' })}
      >
        {tabsOrder.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `whitespace-nowrap px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${
                isActive
                  ? 'bg-(--nb-color-brand) text-white shadow-(--nb-shadow-sm)'
                  : 'text-(--nb-color-muted) hover:bg-(--nb-color-brand-50) hover:text-(--nb-color-fg)'
              }`
            }
            end
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      {/* Mobile: limited + dynamic overflow */}
      <div className="flex md:hidden items-center justify-between">
        <nav
          className="flex-1 flex items-center gap-2 p-1 rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-x-auto"
          aria-label={t('common.aria.tabs', { defaultValue: 'Tabs' })}
        >
          {primary.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
                  isActive
                    ? 'bg-(--nb-color-brand) text-white shadow-(--nb-shadow-sm)'
                    : 'text-(--nb-color-muted) hover:bg-(--nb-color-brand-50) hover:text-(--nb-color-fg)'
                }`
              }
              end
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        {overflow.length > 0 && (
          <div ref={menuRef} className="relative ml-1">
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="text-xs text-(--nb-color-muted) px-2 py-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-bg) flex items-center justify-center w-10"
              title={t('students.dashboard.moreTabs')}
            >
              <span className="font-semibold tracking-wider">⋯</span>
            </button>
            {open && (
              <Card className="absolute right-0 mt-2 w-40 z-10">
                <ul className="py-1 text-sm">
                  {overflow.map(t => (
                    <li key={t.to}>
                      <NavLink
                        to={t.to}
                        onClick={() => promote(t.to)}
                        className={({ isActive }) =>
                          `block px-3 py-2 ${isActive ? 'text-(--nb-color-brand) font-bold bg-(--nb-color-brand-50)' : 'text-(--nb-color-text) hover:bg-(--nb-color-bg)'}`
                        }
                        end
                      >
                        {t.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { studentId } = useParams();
  if (!studentId) return <Navigate to="/students" replace />;
  return <StudentDashboardInner studentId={studentId} />;
}

function StudentDashboardInner({ studentId }) {
  const base = `/students/${studentId}`;

  const { hasPermission } = useAuth();
  const { t } = useI18n();

  const canAny = (module, actions) => {
    if (!Array.isArray(actions) || actions.length === 0) return false;
    return actions.some((a) => hasPermission(module, a));
  };

  const profileQuery = useQuery({
    queryKey: studentKeys.profile(studentId),
    queryFn: async () => {
      const data = await getStudentProfile(studentId);
      if (!data) throw new Error('Failed to load profile');
      return data;
    },
    staleTime: 60_000,
  });

  const studentName = profileQuery.data?.student?.fullName || profileQuery.data?.student?.name || t('students.common.studentFallback');

  useStudentDashboardRealtimeInvalidation({ studentId, isStudentSelf: false, enabled: true });

  const tabs = useMemo(() => {
    const out = [];

    // The route itself should already be protected by students access.
    out.push({ to: `${base}/dashboard`, label: t('nav.dashboard') });
    out.push({ to: `${base}/profile`, label: t('nav.profile') });
    out.push({ to: `${base}/enrollments`, label: t('nav.enrollments') });

    if (canAny('transcript', ['view', 'print', 'download'])) {
      out.push({ to: `${base}/transcript`, label: t('nav.transcript') });
    }

    if (canAny('attendanceReports', ['view', 'print', 'download']) || canAny('attendance', ['view', 'edit'])) {
      out.push({ to: `${base}/attendance`, label: t('nav.attendance') });
    }

    // Timetable read is allowed if user has timetable access OR attendance access.
    if (canAny('timetable', ['view', 'add', 'edit', 'delete', 'print', 'download']) || canAny('attendance', ['view', 'edit'])) {
      out.push({ to: `${base}/timetable`, label: t('nav.timetable') });
    }

    if (canAny('transfers', ['view', 'transfer'])) {
      out.push({ to: `${base}/transfers`, label: t('nav.transfers') });
    }

    if (
      canAny('financeStudent', ['view', 'add', 'edit', 'delete', 'download'])
      || canAny('financeStudentReceipt', ['view', 'add', 'edit', 'delete', 'download'])
      || canAny('financeStudentPreviousBalance', ['view', 'add', 'edit', 'delete'])
      || canAny('financeStudentReceiptModal', ['view'])
      || canAny('financeStudentPreviousBalanceModal', ['view'])
    ) {
      out.push({ to: `${base}/finance`, label: t('nav.finance') });
    }

    // Digital Library: read is allowed for any authenticated user; writes are permission/role-gated.
    out.push({ to: `${base}/library`, label: t('nav.library') });
    return out;
  }, [base, hasPermission, t]);

  return (
    <div className="space-y-4">
      <TabNav tabs={tabs} />
      <Suspense fallback={<div>{t('common.loading')}</div>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
