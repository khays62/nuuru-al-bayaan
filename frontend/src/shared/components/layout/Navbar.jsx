import React from 'react';
import { useAuth } from '../../../auth/AuthContext';
import Button from '../ui/Button';
import { Menu, X, LogOut, ChevronRight, Search, User, Bell, ShieldAlert } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    getAuthLockCount,
    listAuthLocks,
    resetUserPasswordAndUnlock,
    unlockUserLogin,
    deactivateUserAccount,
    activateUserAccount,
    clearAuthLockEvent,
    markAllAuthLocksRead,
} from '../../../features/security/api/security';
import { emitUsersChanged, emitTeachersChanged, emitStudentsChanged } from '../../../utils/events';
import Card from '../ui/Card.jsx';
import UiLoadingState from '../ui/LoadingState.jsx';
import { useAnnouncementsStream } from '../../../features/announcements/hooks/useAnnouncementsStream';

// This is the updated Navbar component with a new design.
const Navbar = ({ onToggleMobileMenu, onToggleCollapse, isCollapsed, currentPageTitle }) => {
    const { auth, logout, hasPermission } = useAuth();
    const user = auth?.user;
    const queryClient = useQueryClient();
    const [openLocks, setOpenLocks] = React.useState(false);
    const [pendingByKey, setPendingByKey] = React.useState({});
    const locksRef = React.useRef(null);

    // Realtime Announcements (SSE)
    useAnnouncementsStream({ user });

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
    const canUnlockUsers = canLockUsers; // reset-lockout is guarded by security.edit
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
        refetchInterval: 3_000,
        refetchIntervalInBackground: true,
        staleTime: 0,
    });

    const locksQuery = useQuery({
        queryKey: ['security', 'authLocks', 'list'],
        enabled: canSeeLocks && openLocks,
        queryFn: async () => {
            const data = await listAuthLocks(25);
            return Array.isArray(data?.events) ? data.events : [];
        },
        staleTime: 0,
        refetchInterval: 3_000,
        refetchIntervalInBackground: true,
    });

    // When opening the dropdown, mark all as read so the badge clears.
    React.useEffect(() => {
        if (!openLocks) return;
        let cancelled = false;
        (async () => {
            try {
                // Optimistic badge clear.
                queryClient.setQueryData(['security', 'authLocks', 'count'], 0);
                await markAllAuthLocksRead();
                if (cancelled) return;
                await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
            } catch {
                // Non-blocking: if this fails, badge will refresh on next poll.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [openLocks, queryClient]);

    const doResetToDefault = async (principalId) => {
        const k = `reset:${principalId}`;
        try {
            setPending(k, true);
            await resetUserPasswordAndUnlock(principalId);
            toast.success('Password reset to default + unlocked');
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
        } catch (e) {
            toast.error(e?.data?.message || e?.message || 'Reset failed');
        } finally {
            setPending(k, false);
        }
    };

    const doUnlock = async (principalId) => {
        const k = `unlock:${principalId}`;
        try {
            setPending(k, true);
            await unlockUserLogin(principalId);
            toast.success('Account unlocked');
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
        } catch (e) {
            toast.error(e?.data?.message || e?.message || 'Unlock failed');
        } finally {
            setPending(k, false);
        }
    };

    const emitPrincipalChanged = (roleLower) => {
        const r = String(roleLower || '').toLowerCase();
        if (r === 'teacher') emitTeachersChanged({ source: 'security-bell' });
        else if (r === 'student') emitStudentsChanged({ source: 'security-bell' });
        else emitUsersChanged({ source: 'security-bell' });
    };

    const doDeactivate = async (principalId, roleLower) => {
        const ok = window.confirm('Mark this account as Inactive? This will log them out within seconds.');
        if (!ok) return;
        const k = `inactive:${principalId}`;
        try {
            setPending(k, true);
            await deactivateUserAccount(principalId);
            toast.success('Account marked inactive');
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
            emitPrincipalChanged(roleLower);
        } catch (e) {
            toast.error(e?.data?.message || e?.message || 'Inactive failed');
        } finally {
            setPending(k, false);
        }
    };

    const doActivate = async (principalId, roleLower) => {
        const ok = window.confirm('Mark this account as Active?');
        if (!ok) return;
        const k = `active:${principalId}`;
        try {
            setPending(k, true);
            await activateUserAccount(principalId);
            toast.success('Account marked active');
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
            emitPrincipalChanged(roleLower);
        } catch (e) {
            toast.error(e?.data?.message || e?.message || 'Activate failed');
        } finally {
            setPending(k, false);
        }
    };

    const doClear = async (eventId) => {
        const k = `clear:${eventId}`;
        try {
            setPending(k, true);
            await clearAuthLockEvent(eventId);
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
        } catch (e) {
            toast.error(e?.data?.message || e?.message || 'Clear failed');
        } finally {
            setPending(k, false);
        }
    };

    return (
        <header className="relative bg-white shadow-lg p-4 flex items-center justify-between z-40 no-print">
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
                            <Card className="absolute right-0 mt-2 w-96 rounded-xl shadow-xl overflow-hidden z-50">
                                <div className="px-3 py-2 border-b flex items-center justify-between bg-gray-50">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert size={16} className="text-red-600" />
                                        <span className="font-semibold text-sm">Security alerts</span>
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
                                        <div className="p-3">
                                            <UiLoadingState label="Loading…" className="border-0 bg-transparent p-0 justify-start" />
                                        </div>
                                    )}
                                    {!locksQuery.isLoading && (locksQuery.data?.length || 0) === 0 && (
                                        <div className="p-3 text-sm text-gray-600">No locked accounts right now.</div>
                                    )}

                                    {(locksQuery.data || []).map((ev) => {
                                        const isUnknown = String(ev.principalModel || '') === 'Unknown' || !ev.principalId;
                                        const isAdminPrincipal = String(ev.principalModel || '') === 'Admin';
                                        const role = String(ev.role || '').toLowerCase();
                                        const isStudentOrTeacher = role === 'student' || role === 'teacher';
                                        const accountStatusLower = String(ev.accountStatus || '').toLowerCase();
                                        const isInactiveAccount = accountStatusLower === 'inactive';
                                        const displayName = isUnknown
                                            ? `Unknown: ${ev.username || '—'}`
                                            : (ev.fullName || ev.username || '—');
                                        const showUsername = Boolean(ev.fullName) && Boolean(ev.username);
                                        const r = String(ev.role || '').toUpperCase();
                                        const until = ev.lockUntil ? new Date(ev.lockUntil).toLocaleString() : '';
                                        const resetKey = `reset:${String(ev.principalId || '')}`;
                                        const unlockKey = `unlock:${String(ev.principalId || '')}`;
                                        const inactiveKey = `inactive:${String(ev.principalId || '')}`;
                                        const activeKey = `active:${String(ev.principalId || '')}`;
                                        const clearKey = `clear:${String(ev._id || '')}`;
                                        const resetBusy = Boolean(pendingByKey[resetKey]);
                                        const unlockBusy = Boolean(pendingByKey[unlockKey]);
                                        const inactiveBusy = Boolean(pendingByKey[inactiveKey]);
                                        const activeBusy = Boolean(pendingByKey[activeKey]);
                                        const clearBusy = Boolean(pendingByKey[clearKey]);
                                        const toggleBusy = inactiveBusy || activeBusy;
                                        const disableSecurityActions = isInactiveAccount || toggleBusy;
                                        return (
                                            <div key={ev._id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-gray-800 truncate">{displayName}</div>
                                                        {showUsername && (
                                                            <div className="text-xs text-gray-500 truncate">{ev.username}</div>
                                                        )}
                                                        <div className="text-xs text-gray-500">
                                                            {r || 'USER'}
                                                            {isInactiveAccount
                                                                ? ' • INACTIVE'
                                                                : (until ? ` • until ${until}` : '')}
                                                        </div>
                                                        {ev.occurrences > 1 && (
                                                            <div className="text-xs text-gray-500">Attempts lock count: {ev.occurrences}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {!isUnknown && !isAdminPrincipal && (
                                                            isStudentOrTeacher
                                                                ? (canResetUsers && (
                                                                    <button
                                                                        type="button"
                                                                        className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100 disabled:opacity-60"
                                                                        onClick={() => doResetToDefault(String(ev.principalId))}
                                                                        title="Reset password to default + unlock"
                                                                        disabled={resetBusy || unlockBusy || disableSecurityActions}
                                                                    >
                                                                        {resetBusy ? 'Resetting…' : 'Reset Password'}
                                                                    </button>
                                                                ))
                                                                : (canUnlockUsers && (
                                                                    <button
                                                                        type="button"
                                                                        className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100 disabled:opacity-60"
                                                                        onClick={() => doUnlock(String(ev.principalId))}
                                                                        title="Unlock account (clear login lockout)"
                                                                        disabled={unlockBusy || resetBusy || disableSecurityActions}
                                                                    >
                                                                        {unlockBusy ? 'Unlocking…' : 'Unlock'}
                                                                    </button>
                                                                ))
                                                        )}
                                                        {!isUnknown && !isAdminPrincipal && canLockUsers && (
                                                            isInactiveAccount ? (
                                                                <button
                                                                    type="button"
                                                                    className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                                                                    onClick={() => doActivate(String(ev.principalId), role)}
                                                                    title="Mark account active"
                                                                    disabled={toggleBusy || resetBusy || unlockBusy}
                                                                >
                                                                    {activeBusy ? 'Activating…' : 'Active'}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                                                                    onClick={() => doDeactivate(String(ev.principalId), role)}
                                                                    title="Mark account inactive"
                                                                    disabled={toggleBusy || resetBusy || unlockBusy}
                                                                >
                                                                    {inactiveBusy ? 'Inactivating…' : 'Inactive'}
                                                                </button>
                                                            )
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100 disabled:opacity-60"
                                                            onClick={() => doClear(String(ev._id))}
                                                            title="Clear notification"
                                                            disabled={clearBusy}
                                                        >
                                                            {clearBusy ? 'Clearing…' : 'Clear'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
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

