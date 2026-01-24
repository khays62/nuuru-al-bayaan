import React from 'react';
import { useAuth } from '../../../auth/AuthContext';
import Button from '../ui/Button';
import { Menu, X, LogOut, ChevronRight, Search, User, Bell, ShieldAlert } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAuthLockCount, listAuthLocks, resetUserPasswordAndUnlock, lockUser24h, markAuthLockRead } from '../../../features/security/api/security';

// This is the updated Navbar component with a new design.
const Navbar = ({ onToggleMobileMenu, onToggleCollapse, isCollapsed, currentPageTitle }) => {
    const { auth, logout, hasPermission } = useAuth();
    const user = auth?.user;
    const queryClient = useQueryClient();
    const [openLocks, setOpenLocks] = React.useState(false);
    const [pendingByKey, setPendingByKey] = React.useState({});
    const locksRef = React.useRef(null);

    // Close on click-outside
    React.useEffect(() => {
        if (!openLocks) return;
        const onMouseDown = (e) => {
            const el = locksRef.current;
            if (!el) return;
            if (el.contains(e.target)) return;
            setOpenLocks(false);
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [openLocks]);

    const setPending = (key, value) => {
        setPendingByKey((prev) => ({ ...prev, [key]: value }));
    };

    const roleLower = String(user?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const isStaff = roleLower === 'staff';
    const canSeeLocks = isAdmin || (isStaff && hasPermission('security', 'view'));
    const canLockUsers = isAdmin || (isStaff && hasPermission('security', 'edit'));
    const canResetUsers = isAdmin || (isStaff && (hasPermission('security', 'resetPassword') || hasPermission('security', 'edit')));
    const displayName = user?.fullName || user?.name || user?.username || '—';
    const displayRole = user?.role ? String(user.role).toUpperCase() : '';
    const displayEmail = user?.email || '';
    const meta = [displayRole, displayEmail].filter(Boolean).join(' • ');

    const lockCountQuery = useQuery({
        queryKey: ['security', 'authLocks', 'count'],
        enabled: canSeeLocks,
        queryFn: async () => {
            const data = await getAuthLockCount();
            return Number(data?.count || 0);
        },
        refetchInterval: 15_000,
        staleTime: 10_000,
    });

    const locksQuery = useQuery({
        queryKey: ['security', 'authLocks', 'list'],
        enabled: canSeeLocks && openLocks,
        queryFn: async () => {
            const data = await listAuthLocks(25);
            return Array.isArray(data?.events) ? data.events : [];
        },
        staleTime: 5_000,
    });

    const doReset = async (principalId) => {
        const k = `reset:${principalId}`;
        try {
            setPending(k, true);
            await resetUserPasswordAndUnlock(principalId);
            toast.success('Password reset + unlock done');
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
        } catch (e) {
            toast.error(e?.data?.message || e?.message || 'Reset failed');
        } finally {
            setPending(k, false);
        }
    };

    const doLock24h = async (principalId) => {
        const ok = window.confirm('Lock this user for 24h? This will force logout on next request.');
        if (!ok) return;
        const k = `lock:${principalId}`;
        try {
            setPending(k, true);
            await lockUser24h(principalId);
            toast.success('User locked for 24h');
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
        } catch (e) {
            toast.error(e?.data?.message || e?.message || 'Lock failed');
        } finally {
            setPending(k, false);
        }
    };

    const doDismiss = async (eventId) => {
        const k = `dismiss:${eventId}`;
        try {
            setPending(k, true);
            await markAuthLockRead(eventId);
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
        } catch (e) {
            toast.error(e?.data?.message || e?.message || 'Dismiss failed');
        } finally {
            setPending(k, false);
        }
    };

    return (
        <header className="bg-white shadow-lg p-4 flex items-center justify-between z-10 no-print">
            {/* Left side: Mobile Menu Toggle and Current Page Title */}
            <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle (Hamburger Icon) */}
                <button
                    onClick={onToggleMobileMenu}
                    className="text-gray-600 hover:text-gray-800 md:hidden"
                    title="Open Menu"
                >
                    <Menu size={24} />
                </button>
                
                {/* Desktop Collapse Toggle */}
                <button
                    onClick={onToggleCollapse}
                    className="hidden md:block text-gray-600 hover:text-gray-800"
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
                </button>

                {/* Current Page Title */}
                <h1 className="hidden sm:block text-xl font-semibold text-gray-700">{currentPageTitle}</h1>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 flex justify-center px-4 lg:px-12">
                <div className="relative w-full max-w-lg">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search size={20} className="text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Right side: User Info and Logout */}
            <div className="flex items-center gap-4">
                {canSeeLocks && (
                    <div className="relative" ref={locksRef}>
                        <button
                            type="button"
                            onClick={() => setOpenLocks((v) => !v)}
                            className="relative p-2 rounded-md hover:bg-gray-100"
                            title="Security notifications"
                        >
                            <Bell size={20} className="text-gray-700" />
                            {Number(lockCountQuery.data || 0) > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center">
                                    {Number(lockCountQuery.data || 0)}
                                </span>
                            )}
                        </button>

                        {openLocks && (
                            <div className="absolute right-0 mt-2 w-96 bg-white border rounded-xl shadow-xl overflow-hidden z-50">
                                <div className="px-3 py-2 border-b flex items-center justify-between bg-gray-50">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert size={16} className="text-red-600" />
                                        <span className="font-semibold text-sm">Locked accounts (24h)</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setOpenLocks(false)}
                                        className="text-gray-500 hover:text-gray-800"
                                        title="Close"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="max-h-96 overflow-auto">
                                    {locksQuery.isLoading && (
                                        <div className="p-3 text-sm text-gray-600">Loading…</div>
                                    )}
                                    {!locksQuery.isLoading && (locksQuery.data?.length || 0) === 0 && (
                                        <div className="p-3 text-sm text-gray-600">No locked accounts right now.</div>
                                    )}

                                    {(locksQuery.data || []).map((ev) => {
                                        const isUnknown = String(ev.principalModel || '') === 'Unknown' || !ev.principalId;
                                        const displayName = isUnknown
                                            ? `Unknown: ${ev.username || '—'}`
                                            : (ev.fullName || ev.username || '—');
                                        const showUsername = Boolean(ev.fullName) && Boolean(ev.username);
                                        const r = String(ev.role || '').toUpperCase();
                                        const until = ev.lockUntil ? new Date(ev.lockUntil).toLocaleString() : '';
                                        const resetKey = `reset:${String(ev.principalId || '')}`;
                                        const lockKey = `lock:${String(ev.principalId || '')}`;
                                        const dismissKey = `dismiss:${String(ev._id || '')}`;
                                        const resetBusy = Boolean(pendingByKey[resetKey]);
                                        const lockBusy = Boolean(pendingByKey[lockKey]);
                                        const dismissBusy = Boolean(pendingByKey[dismissKey]);
                                        return (
                                            <div key={ev._id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-gray-800 truncate">{displayName}</div>
                                                        {showUsername && (
                                                            <div className="text-xs text-gray-500 truncate">{ev.username}</div>
                                                        )}
                                                        <div className="text-xs text-gray-500">{r || 'USER'}{until ? ` • until ${until}` : ''}</div>
                                                        {ev.occurrences > 1 && (
                                                            <div className="text-xs text-gray-500">Attempts lock count: {ev.occurrences}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {!isUnknown && canResetUsers && (
                                                            <button
                                                                type="button"
                                                                className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100 disabled:opacity-60"
                                                                onClick={() => doReset(String(ev.principalId))}
                                                                title="Reset password to default + unlock"
                                                                disabled={resetBusy || lockBusy}
                                                            >
                                                                {resetBusy ? 'Resetting…' : 'Reset'}
                                                            </button>
                                                        )}
                                                        {!isUnknown && canLockUsers && (
                                                            <button
                                                                type="button"
                                                                className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                                                                onClick={() => doLock24h(String(ev.principalId))}
                                                                title="Lock 24h (force logout)"
                                                                disabled={lockBusy || resetBusy}
                                                            >
                                                                {lockBusy ? 'Locking…' : 'Lock'}
                                                            </button>
                                                        )}
                                                        {isUnknown && (
                                                            <button
                                                                type="button"
                                                                className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100 disabled:opacity-60"
                                                                onClick={() => doDismiss(String(ev._id))}
                                                                title="Dismiss"
                                                                disabled={dismissBusy}
                                                            >
                                                                {dismissBusy ? 'Dismissing…' : 'Dismiss'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="text-right hidden sm:block">
                    <p className="font-semibold text-sm text-gray-800">{displayName}</p>
                    <p className="text-xs text-gray-500">{meta || ' '}</p>
                </div>
                <User size={24} className="text-gray-600 sm:hidden" />
                <Button
                    onClick={logout}
                    variant="brand"
                    size="lg"
                    title="Logout"
                >
                    <LogOut size={16} />
                    <span className="hidden lg:inline">Logout</span>
                </Button>
            </div>
        </header>
    );
};

export default Navbar;

