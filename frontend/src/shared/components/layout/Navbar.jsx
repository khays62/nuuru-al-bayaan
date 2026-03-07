import React from 'react';
import { useAuth } from '../../../auth/AuthContext';
import Button from '../ui/Button';
import { Menu, X, LogOut, ChevronLeft, ChevronRight, Search, User, Bell, ShieldAlert, Languages, Sparkles, Sun, Moon } from 'lucide-react';
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
import { useRealtimeStream } from '../../realtime/useRealtimeStream';
import { useI18n } from '../../../i18n/useI18n';
import { useAiChat } from '../ai/AiChatContext.jsx';
import { useTheme } from '../../theme/ThemeContext.jsx';

// This is the updated Navbar component with a new design.
const Navbar = ({ onToggleMobileMenu, onToggleCollapse, isCollapsed, currentPageTitle }) => {
    const { auth, logout, hasPermission } = useAuth();
    const { lang, setLang, isRTL, t } = useI18n();
    const theme = useTheme();
    const ai = useAiChat();
    const user = auth?.user;
    const queryClient = useQueryClient();
    const [openLocks, setOpenLocks] = React.useState(false);
    const [openLang, setOpenLang] = React.useState(false);
    const [pendingByKey, setPendingByKey] = React.useState({});
    const locksRef = React.useRef(null);
    const langRef = React.useRef(null);

    // Realtime Announcements (SSE)
    useAnnouncementsStream({ user });
    // Realtime cross-browser refresh (SSE)
    useRealtimeStream({ user });

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

    // Close language menu on click-outside
    React.useEffect(() => {
        if (!openLang) return;
        const onMouseDown = (e) => {
            const el = langRef.current;
            if (!el) return;
            if (el.contains(e.target)) return;
            setOpenLang(false);
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [openLang]);

    const setPending = (key, value) => {
        setPendingByKey((prev) => ({ ...prev, [key]: value }));
    };

    const roleLower = String(user?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const isStaff = roleLower === 'staff';
    const canSeeLocks = isAdmin || (isStaff && hasPermission('security', 'view'));
    const displayName = user?.fullName || user?.name || user?.username || '-';
    const displayRole = user?.role ? String(user.role).toUpperCase() : '';
    const displayEmail = user?.email || '';
    const meta = [displayRole, displayEmail].filter(Boolean).join(' - ');

    const lockCountQuery = useQuery({
        queryKey: ['security', 'authLocks', 'count'],
        enabled: canSeeLocks,
        queryFn: async () => {
            const data = await getAuthLockCount();
            return Number(data?.count || 0);
        },
        // Primary updates are realtime via SSE (security:authLocksChanged).
        // Keep a light poll as a fallback.
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
        staleTime: 30_000,
    });

    const locksQuery = useQuery({
        queryKey: ['security', 'authLocks', 'list'],
        enabled: canSeeLocks && openLocks,
        queryFn: async () => {
            const data = await listAuthLocks(25);
            return Array.isArray(data?.events) ? data.events : [];
        },
        staleTime: 0,
        refetchInterval: 10_000,
        refetchIntervalInBackground: false,
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

    const doResetToDefault = async (principalId, principalRoleLower) => {
        const k = `reset:${principalId}`;
        try {
            setPending(k, true);

            const r = String(principalRoleLower || '').toLowerCase();
            // Auth-lock events use User/Admin principals. For teacher/student accounts, principalId is the User _id
            // (NOT the Teacher/Student profile id), so we must use the security endpoints here.
            await resetUserPasswordAndUnlock(principalId);
            toast.success(r === 'student'
                ? t('common.securityBell.toasts.studentPasswordResetDefault', { defaultValue: 'Student password reset to default' })
                : r === 'teacher'
                    ? t('common.securityBell.toasts.teacherPasswordResetDefault', { defaultValue: 'Teacher password reset to default' })
                    : t('common.securityBell.toasts.passwordResetDefault', { defaultValue: 'Password reset to default' }));

            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
        } catch (e) {
            toast.error(e?.data?.message || e?.message || t('common.securityBell.errors.resetFailed', { defaultValue: 'Reset failed' }));
        } finally {
            setPending(k, false);
        }
    };

    const doUnlock = async (principalId) => {
        const k = `unlock:${principalId}`;
        try {
            setPending(k, true);
            await unlockUserLogin(principalId);
            toast.success(t('common.securityBell.toasts.accountUnlocked', { defaultValue: 'Account unlocked' }));
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
        } catch (e) {
            toast.error(e?.data?.message || e?.message || t('common.securityBell.errors.unlockFailed', { defaultValue: 'Unlock failed' }));
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

    const doDeactivate = async (principalId, principalRoleLower) => {
        const ok = window.confirm(t('common.securityBell.confirms.markInactive', {
            defaultValue: 'Mark this account as Inactive? This will log them out within seconds.',
        }));
        if (!ok) return;
        const k = `inactive:${principalId}`;
        try {
            setPending(k, true);

            await deactivateUserAccount(principalId);

            toast.success(t('common.securityBell.toasts.accountMarkedInactive', { defaultValue: 'Account marked inactive' }));
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
            emitPrincipalChanged(principalRoleLower);
        } catch (e) {
            toast.error(e?.data?.message || e?.message || t('common.securityBell.errors.inactiveFailed', { defaultValue: 'Inactive failed' }));
        } finally {
            setPending(k, false);
        }
    };

    const doActivate = async (principalId, principalRoleLower) => {
        const ok = window.confirm(t('common.securityBell.confirms.markActive', { defaultValue: 'Mark this account as Active?' }));
        if (!ok) return;
        const k = `active:${principalId}`;
        try {
            setPending(k, true);

            await activateUserAccount(principalId);

            toast.success(t('common.securityBell.toasts.accountMarkedActive', { defaultValue: 'Account marked active' }));
            await queryClient.invalidateQueries({ queryKey: ['security', 'authLocks'] });
            emitPrincipalChanged(principalRoleLower);
        } catch (e) {
            toast.error(e?.data?.message || e?.message || t('common.securityBell.errors.activateFailed', { defaultValue: 'Activate failed' }));
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
            toast.error(e?.data?.message || e?.message || t('common.securityBell.errors.clearFailed', { defaultValue: 'Clear failed' }));
        } finally {
            setPending(k, false);
        }
    };

    const leftGroup = (
        <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="flex items-center gap-4"
            style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
                {/* Mobile Menu Toggle (Hamburger Icon) */}
                <button
                    onClick={onToggleMobileMenu}
                    className="text-(--nb-color-muted) hover:text-(--nb-color-fg) md:hidden"
                    title={t('common.openMenu', { defaultValue: 'Open Menu' })}
                >
                    <Menu size={24} />
                </button>
                
                {/* Desktop Collapse Toggle */}
                <button
                    onClick={onToggleCollapse}
                    className="hidden md:block text-(--nb-color-muted) hover:text-(--nb-color-fg)"
                    title={isCollapsed
                        ? t('common.expandSidebar', { defaultValue: 'Expand Sidebar' })
                        : t('common.collapseSidebar', { defaultValue: 'Collapse Sidebar' })
                    }
                >
                    {isCollapsed
                        ? (isRTL ? <ChevronLeft size={20} /> : <ChevronRight size={20} />)
                        : <Menu size={20} />}
                </button>

                {/* Current Page Title */}
                <div className="hidden sm:block">
                    <h1 className={(isRTL ? 'text-right' : 'text-left') + " text-lg font-bold text-(--nb-color-fg)"}>{currentPageTitle || ''}</h1>
                </div>
        </div>
    );

    const searchGroup = (
        <div dir={isRTL ? 'rtl' : 'ltr'} className="flex-1 flex justify-center px-4 lg:px-12">
            <div className="relative w-full max-w-lg">
                <span className={
                    "absolute inset-y-0 flex items-center " +
                    (isRTL ? 'right-0 pr-3' : 'left-0 pl-3')
                }>
                    <Search size={20} className="text-(--nb-color-muted)" />
                </span>
                <input
                    dir={isRTL ? 'rtl' : 'ltr'}
                    type="text"
                    placeholder={t('common.search', { defaultValue: 'Searchâ€¦' })}
                    className={
                        "w-full py-2 border border-(--nb-color-border) bg-(--nb-color-bg-card) text-(--nb-color-fg) placeholder:text-(--nb-color-muted) rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2 " +
                        (isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4')
                    }
                />
            </div>
        </div>
    );

    const languageEl = (
        <div ref={langRef} className="relative">
            <button
                type="button"
                onClick={() => setOpenLang((v) => !v)}
                className="p-2 rounded-md border border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-brand-50) text-(--nb-color-fg)"
                title={t('common.language', { defaultValue: 'Language' })}
                aria-label={t('common.language', { defaultValue: 'Language' })}
            >
                <Languages size={18} />
            </button>

            {openLang ? (
                <Card
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={(isRTL ? 'left-0' : 'right-0') + ' absolute mt-2 w-44 overflow-hidden z-50'}
                >
                    <button
                        type="button"
                        onClick={() => { setLang('en'); setOpenLang(false); }}
                        className={
                            'w-full px-3 py-2 text-sm hover:bg-(--nb-color-brand-50) flex items-center justify-between ' +
                                    (lang === 'en' ? 'text-(--nb-color-brand-ui) font-medium' : 'text-(--nb-color-fg)')
                        }
                    >
                        <span>{t('common.english', { defaultValue: 'English' })}</span>
                        {lang === 'en' ? <span className="text-(--nb-color-accent)">âœ“</span> : null}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLang('so'); setOpenLang(false); }}
                        className={
                            'w-full px-3 py-2 text-sm hover:bg-(--nb-color-brand-50) flex items-center justify-between ' +
                                    (lang === 'so' ? 'text-(--nb-color-brand-ui) font-medium' : 'text-(--nb-color-fg)')
                        }
                    >
                        <span>{t('common.somali', { defaultValue: 'Somali' })}</span>
                        {lang === 'so' ? <span className="text-(--nb-color-accent)">âœ“</span> : null}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLang('ar'); setOpenLang(false); }}
                        className={
                            'w-full px-3 py-2 text-sm hover:bg-(--nb-color-brand-50) flex items-center justify-between ' +
                                    (lang === 'ar' ? 'text-(--nb-color-brand-ui) font-medium' : 'text-(--nb-color-fg)')
                        }
                    >
                        <span>{t('common.arabic', { defaultValue: 'Arabic' })}</span>
                        {lang === 'ar' ? <span className="text-(--nb-color-accent)">âœ“</span> : null}
                    </button>
                </Card>
            ) : null}
        </div>
    );

    const themeEl = (
        <button
            type="button"
            onClick={() => theme?.toggleTheme?.()}
            className="p-2 rounded-md border border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-brand-50) text-(--nb-color-fg)"
            title={theme?.theme === 'dark'
                ? t('common.theme.light', { defaultValue: 'Switch to Light' })
                : t('common.theme.dark', { defaultValue: 'Switch to Dark' })
            }
            aria-label={theme?.theme === 'dark'
                ? t('common.theme.light', { defaultValue: 'Switch to Light' })
                : t('common.theme.dark', { defaultValue: 'Switch to Dark' })
            }
        >
            {theme?.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );

    const aiEl = (
        <button
            type="button"
            onClick={() => ai?.toggle?.()}
            className="p-2 rounded-md border border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-brand-50) text-(--nb-color-fg)"
            title={t('aiChat.title', { defaultValue: 'AI Assistant' })}
            aria-label={t('aiChat.title', { defaultValue: 'AI Assistant' })}
        >
            <Sparkles size={18} className="text-(--nb-color-brand-ui)" />
        </button>
    );

    const bellEl = canSeeLocks ? (
        <div className="relative" ref={locksRef}>
            <button
                type="button"
                onClick={() => setOpenLocks((v) => !v)}
                className="relative p-2 rounded-md hover:bg-(--nb-color-brand-50)"
                title={t('common.securityBell.notificationsTitle', { defaultValue: 'Security notifications' })}
            >
                <Bell size={20} className="text-(--nb-color-muted)" />
                {Number(lockCountQuery.data || 0) > 0 && (
                    <span className={
                        "absolute -top-1 min-w-4.5 h-4.5 px-1 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center " +
                        (isRTL ? '-left-1' : '-right-1')
                    }>
                        {Number(lockCountQuery.data || 0)}
                    </span>
                )}
            </button>

            {openLocks && (
                <Card
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={(isRTL ? 'left-0' : 'right-0') + " absolute mt-2 w-96 rounded-xl shadow-xl overflow-hidden z-50"}
                >
                                <div className="px-3 py-2 border-b border-(--nb-color-border) flex items-center justify-between bg-(--nb-color-bg)">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert size={16} className="text-red-600" />
                                        <span className="font-semibold text-sm">{t('common.securityBell.alertsTitle', { defaultValue: 'Security alerts' })}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setOpenLocks(false)}
                                        className="text-(--nb-color-muted) hover:text-(--nb-color-fg)"
                                        title={t('common.close', { defaultValue: 'Close' })}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="max-h-96 overflow-auto">
                                    {locksQuery.isLoading && (
                                        <div className="p-3">
                                            <UiLoadingState
                                                label={t('common.loading', { defaultValue: 'Loadingâ€¦' })}
                                                className="border-0 bg-transparent p-0 justify-start"
                                            />
                                        </div>
                                    )}
                                    {!locksQuery.isLoading && (locksQuery.data?.length || 0) === 0 && (
                                        <div className="p-3 text-sm text-(--nb-color-muted)">
                                            {t('common.securityBell.noLockedAccounts', { defaultValue: 'No locked accounts right now.' })}
                                        </div>
                                    )}

                                    {(locksQuery.data || []).map((ev) => {
                                        const isUnknown = String(ev.principalModel || '') === 'Unknown' || !ev.principalId;
                                        const isAdminPrincipal = String(ev.principalModel || '') === 'Admin';
                                        const role = String(ev.role || '').toLowerCase();
                                        const isStudentOrTeacher = role === 'student' || role === 'teacher';

                                        // Bell notification actions are controlled by the bell/security module permissions.
                                        const canResetStudent = isAdmin || (isStaff && hasPermission('security', 'resetPassword'));
                                        const canResetTeacher = isAdmin || (isStaff && hasPermission('security', 'resetPassword'));
                                        const canDeactivateStudent = isAdmin || (isStaff && hasPermission('security', 'deactivate'));
                                        const canReactivateStudent = isAdmin || (isStaff && hasPermission('security', 'activate'));
                                        const canDeactivateTeacher = isAdmin || (isStaff && hasPermission('security', 'deactivate'));
                                        const canReactivateTeacher = isAdmin || (isStaff && hasPermission('security', 'activate'));

                                        const canResetThis = role === 'student'
                                            ? canResetStudent
                                            : role === 'teacher'
                                                ? canResetTeacher
                                                : isAdmin;

                                        const canMarkInactiveThis = role === 'student'
                                            ? canDeactivateStudent
                                            : role === 'teacher'
                                                ? canDeactivateTeacher
                                                : isAdmin;

                                        const canMarkActiveThis = role === 'student'
                                            ? canReactivateStudent
                                            : role === 'teacher'
                                                ? canReactivateTeacher
                                                : isAdmin;

                                        // Policy: staff cannot unlock accounts from notifications.
                                        const canUnlockThis = !isStudentOrTeacher && isAdmin;
                                        const accountStatusLower = String(ev.accountStatus || '').toLowerCase();
                                        const isInactiveAccount = accountStatusLower === 'inactive';
                                        const displayName = isUnknown
                                            ? t('common.securityBell.unknownUser', {
                                                defaultValue: 'Unknown: {{username}}',
                                                username: ev.username || '-',
                                            })
                                            : (ev.fullName || ev.username || '-');
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
                                            <div key={ev._id} className="p-3 border-b border-(--nb-color-border) last:border-b-0 hover:bg-(--nb-color-brand-50)">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-(--nb-color-fg) truncate">{displayName}</div>
                                                        {showUsername && (
                                                            <div className="text-xs text-(--nb-color-muted) truncate">{ev.username}</div>
                                                        )}
                                                        <div className="text-xs text-(--nb-color-muted)">
                                                            {r || t('common.securityBell.userRoleFallback', { defaultValue: 'USER' })}
                                                            {isInactiveAccount
                                                                ? ` - ${t('common.securityBell.inactiveTag', { defaultValue: 'INACTIVE' })}`
                                                                : (until
                                                                    ? ` - ${t('common.securityBell.until', {
                                                                        defaultValue: 'until {{date}}',
                                                                        date: until,
                                                                    })}`
                                                                    : '')}
                                                        </div>
                                                        {ev.occurrences > 1 && (
                                                            <div className="text-xs text-(--nb-color-muted)">
                                                                {t('common.securityBell.attemptsLockCount', {
                                                                    defaultValue: 'Attempts lock count: {{count}}',
                                                                    count: ev.occurrences,
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {!isUnknown && !isAdminPrincipal && (
                                                            isStudentOrTeacher
                                                                ? (canResetThis && (
                                                                    <button
                                                                        type="button"
                                                                        className="px-2 py-1 text-xs rounded border border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-brand-50) disabled:opacity-60"
                                                                        onClick={() => doResetToDefault(String(ev.principalId), role)}
                                                                        title={t('common.securityBell.titles.resetToDefaultAndUnlock', { defaultValue: 'Reset password to default + unlock' })}
                                                                        disabled={resetBusy || unlockBusy || disableSecurityActions}
                                                                    >
                                                                        {resetBusy
                                                                            ? t('common.securityBell.states.resetting', { defaultValue: 'Resettingâ€¦' })
                                                                            : t('common.actions.resetPassword', { defaultValue: 'Reset Password' })}
                                                                    </button>
                                                                ))
                                                                : (canUnlockThis && (
                                                                    <button
                                                                        type="button"
                                                                        className="px-2 py-1 text-xs rounded border border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-brand-50) disabled:opacity-60"
                                                                        onClick={() => doUnlock(String(ev.principalId))}
                                                                        title={t('common.securityBell.titles.unlockAccount', { defaultValue: 'Unlock account (clear login lockout)' })}
                                                                        disabled={unlockBusy || resetBusy || disableSecurityActions}
                                                                    >
                                                                        {unlockBusy
                                                                            ? t('common.securityBell.states.unlocking', { defaultValue: 'Unlockingâ€¦' })
                                                                            : t('common.actions.unlock', { defaultValue: 'Unlock' })}
                                                                    </button>
                                                                ))
                                                        )}
                                                        {!isUnknown && !isAdminPrincipal && (
                                                            isInactiveAccount ? (
                                                                canMarkActiveThis ? (
                                                                <button
                                                                    type="button"
                                                                    className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                                                                    onClick={() => doActivate(String(ev.principalId), role)}
                                                                    title={t('common.securityBell.titles.markActive', { defaultValue: 'Mark account active' })}
                                                                    disabled={toggleBusy || resetBusy || unlockBusy}
                                                                >
                                                                    {activeBusy
                                                                        ? t('common.securityBell.states.activating', { defaultValue: 'Activatingâ€¦' })
                                                                        : t('common.status.active', { defaultValue: 'Active' })}
                                                                </button>
                                                                ) : null
                                                            ) : (
                                                                canMarkInactiveThis ? (
                                                                <button
                                                                    type="button"
                                                                    className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                                                                    onClick={() => doDeactivate(String(ev.principalId), role)}
                                                                    title={t('common.securityBell.titles.markInactive', { defaultValue: 'Mark account inactive' })}
                                                                    disabled={toggleBusy || resetBusy || unlockBusy}
                                                                >
                                                                    {inactiveBusy
                                                                        ? t('common.securityBell.states.inactivating', { defaultValue: 'Inactivatingâ€¦' })
                                                                        : t('common.status.inactive', { defaultValue: 'Inactive' })}
                                                                </button>
                                                                ) : null
                                                            )
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="px-2 py-1 text-xs rounded border border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-brand-50) disabled:opacity-60"
                                                            onClick={() => doClear(String(ev._id))}
                                                            title={t('common.securityBell.titles.clearNotification', { defaultValue: 'Clear notification' })}
                                                            disabled={clearBusy}
                                                        >
                                                            {clearBusy
                                                                ? t('common.securityBell.states.clearing', { defaultValue: 'Clearingâ€¦' })
                                                                : t('common.actions.clear', { defaultValue: 'Clear' })}
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
    ) : null;

    const userEl = (
        <>
            <div dir={isRTL ? 'rtl' : 'ltr'} className={(isRTL ? 'text-left' : 'text-right') + " hidden sm:block"}>
                <p className="font-semibold text-sm text-(--nb-color-fg)">{displayName}</p>
                <p className="text-xs text-(--nb-color-muted)">{meta || ' '}</p>
            </div>
            <User size={24} className="text-(--nb-color-muted) sm:hidden" />
        </>
    );

    const logoutEl = (
        <div dir={isRTL ? 'rtl' : 'ltr'}>
            <Button
                onClick={logout}
                variant="brand"
                size="lg"
                title={t('common.logout', { defaultValue: 'Logout' })}
            >
                <LogOut size={16} />
                <span className="hidden lg:inline">{t('common.logout', { defaultValue: 'Logout' })}</span>
            </Button>
        </div>
    );

    const rightGroup = (
        <div dir="ltr" className="flex items-center gap-4">
            {isRTL ? (
                <>
                    {logoutEl}
                    {userEl}
                    {bellEl}
                    {aiEl}
                    {themeEl}
                    {languageEl}
                </>
            ) : (
                <>
                    {languageEl}
                    {themeEl}
                    {aiEl}
                    {bellEl}
                    {userEl}
                    {logoutEl}
                </>
            )}
        </div>
    );

    return (
        <header
            // Important: keep layout direction stable so RTL swaps (DOM order) work predictably.
            // Text direction is applied on inner groups.
            dir="ltr"
            className="relative bg-(--nb-color-bg-card) shadow-lg p-4 flex items-center justify-between gap-4 z-40 no-print"
        >
            {isRTL ? rightGroup : leftGroup}
            {searchGroup}
            {isRTL ? leftGroup : rightGroup}
        </header>
    );
};

export default Navbar;

