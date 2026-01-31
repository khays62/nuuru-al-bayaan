import React, { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '../../../auth/AuthContext';
import { getStudentProfile } from '../api/studentsApi';
import { studentKeys } from '../queryKeys';
import Card from '../../../shared/components/ui/Card.jsx';
import { useStudentDashboardRealtimeInvalidation } from '../components/dashboard/useStudentDashboardRealtimeInvalidation';

function TabNav({ tabs = [] }) {
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
    <div className="border-b border-gray-200 mb-4">
      {/* Desktop: show all */}
      <nav className="hidden md:flex -mb-px gap-4" aria-label="Tabs">
        {tabsOrder.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium ${
                isActive
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        <nav className="-mb-px flex gap-3 overflow-x-auto" aria-label="Tabs">
          {primary.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `whitespace-nowrap py-3 px-1 border-b-2 text-xs font-medium ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              className="text-xs text-gray-600 px-2 py-1 rounded border bg-white hover:bg-gray-50 flex items-center justify-center w-10"
              title="More tabs"
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
                          `block px-3 py-1 ${isActive ? 'text-indigo-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`
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

  const { auth, hasPermission } = useAuth();

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

  const studentName = profileQuery.data?.student?.fullName || profileQuery.data?.student?.name || 'Student';

  useStudentDashboardRealtimeInvalidation({ studentId, isStudentSelf: false, enabled: true });

  const tabs = useMemo(() => {
    const out = [];

    // The route itself should already be protected by students access.
    out.push({ to: `${base}/dashboard`, label: 'Dashboard' });
    out.push({ to: `${base}/profile`, label: 'Profile' });
    out.push({ to: `${base}/enrollments`, label: 'Enrollments' });

    if (canAny('transcript', ['view', 'print', 'download'])) {
      out.push({ to: `${base}/transcript`, label: 'Transcript' });
    }

    if (canAny('attendanceReports', ['view', 'print', 'download']) || canAny('attendance', ['view', 'edit'])) {
      out.push({ to: `${base}/attendance`, label: 'Attendance' });
    }

    // Timetable read is allowed if user has timetable access OR attendance access.
    if (canAny('timetable', ['view', 'add', 'edit', 'delete', 'print', 'download']) || canAny('attendance', ['view', 'edit'])) {
      out.push({ to: `${base}/timetable`, label: 'Timetable' });
    }

    if (canAny('transfers', ['view', 'transfer'])) {
      out.push({ to: `${base}/transfers`, label: 'Transfers' });
    }

    // Note: "Library" isn't permission-modeled for staff/admin yet, so we hide it here.
    return out;
  }, [base, hasPermission]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Student Dashboard</h1>
          <div className="text-sm text-gray-600">
            {profileQuery.isLoading ? 'Loading student…' : studentName}
          </div>
        </div>
      </div>

      <TabNav tabs={tabs} />
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
