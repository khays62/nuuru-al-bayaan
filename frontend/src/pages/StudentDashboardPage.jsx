import React, { Suspense, useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';

function TabNav({ base }) {
  const initialTabs = [
    { to: `${base}/profile`, label: 'Profile' },
    { to: `${base}/enrollments`, label: 'Enrollments' },
    { to: `${base}/transcript`, label: 'Transcript' },
    { to: `${base}/attendance`, label: 'Attendance' },
    { to: `${base}/library`, label: 'Library' },
  ];
  const PRIMARY_SIZE = 3;
  const [tabsOrder, setTabsOrder] = useState(initialTabs);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
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
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-10">
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
              </div>
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
  const base = `/students/${studentId}`;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Student Dashboard</h1>
      <TabNav base={base} />
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
