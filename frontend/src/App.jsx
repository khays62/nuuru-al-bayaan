import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './shared/components/layout/Sidebar.jsx';
import Navbar from './shared/components/layout/Navbar.jsx';
import { navItems } from './config/navigation'; // Import from the new central config file
import { useAuth } from './auth/AuthContext';
import ForcePasswordChangeModal from './auth/components/ForcePasswordChangeModal';
import TeacherDashboardPrefetcher from './features/teachers/components/dashboard/TeacherDashboardPrefetcher.jsx';
import { useI18n } from './i18n/useI18n';
import { AiChatProvider } from './shared/components/ai/AiChatContext.jsx';
import AiChatPanel from './shared/components/ai/AiChatPanel.jsx';
import { postClientAuditEvent } from './features/audit/api/auditApi.js';

export default function App() {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCollapsed, setCollapsed] = useState(false);
    const { auth, refreshUser } = useAuth();
    const { isRTL, t } = useI18n();
    
    const location = useLocation();

    // Client-side page view tracking (best-effort)
    const lastViewRef = React.useRef({ path: '', at: 0 });
    const userId = auth?.user?._id || auth?.user?.id;
    const userDbId = auth?.user?._id;
    useEffect(() => {
        const uid = userId;
        if (!uid) return;

        const path = String(location?.pathname || '');
        if (!path) return;

        const now = Date.now();
        const last = lastViewRef.current || { path: '', at: 0 };
        if (last.path === path && (now - Number(last.at || 0)) < 10_000) return;
        lastViewRef.current = { path, at: now };

        (async () => {
            try {
                await postClientAuditEvent({ action: 'page.view', path });
            } catch {
                // ignore
            }
        })();
    }, [userId, location?.pathname]);

    const flatNavItems = (() => {
        const out = [];
        for (const item of navItems) {
            if (!item) continue;
            if (Array.isArray(item.children)) {
                for (const child of item.children) {
                    if (child) out.push(child);
                }
            }
            if (item.path) out.push(item);
        }
        return out;
    })();

    // Find the current page title based on the route from the central config (supports children)
    const currentNavItem = flatNavItems.find(item => item?.path && location.pathname.startsWith(item.path));
    const currentPageTitle = currentNavItem
        ? (currentNavItem.labelKey
            ? t(currentNavItem.labelKey, { defaultValue: currentNavItem.label })
            : currentNavItem.label)
        : t('nav.dashboard', { defaultValue: 'Dashboard' });

    const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
    const toggleCollapse = () => setCollapsed(!isCollapsed);
    const closeMobileMenu = () => setMobileMenuOpen(false);

    const mustChangeNonStudent = useMemo(() => {
        const u = auth?.user;
        if (!u) return false;
        const role = String(u.role || '').toLowerCase();
        if (role === 'student') return false;
        return Boolean(u.mustChangePassword);
    }, [auth?.user]);

    const [userForceOpen, setUserForceOpen] = useState(false);
    useEffect(() => {
        if (!mustChangeNonStudent) {
            setUserForceOpen(false);
            return;
        }
        const key = userDbId ? `user_force_pw_dismissed:${String(userDbId)}` : 'user_force_pw_dismissed';
        const dismissed = sessionStorage.getItem(key) === '1';
        setUserForceOpen(!dismissed);
    }, [mustChangeNonStudent, userDbId]);

    const skipUserPasswordChange = () => {
        const u = auth?.user;
        const key = u?._id ? `user_force_pw_dismissed:${String(u._id)}` : 'user_force_pw_dismissed';
        sessionStorage.setItem(key, '1');
        setUserForceOpen(false);
    };

    const passwordChanged = async () => {
        try {
            const u = auth?.user;
            const key = u?._id ? `user_force_pw_dismissed:${String(u._id)}` : 'user_force_pw_dismissed';
            sessionStorage.removeItem(key);
        } catch {
            // ignore
        }
        if (typeof refreshUser === 'function') await refreshUser();
    };

    const sidebarEl = (
        <Sidebar
            isMobileMenuOpen={isMobileMenuOpen}
            isCollapsed={isCollapsed}
            closeMobileMenu={closeMobileMenu}
        />
    );

    const mainEl = (
        <div className="flex flex-col flex-1 overflow-hidden">
            <Navbar
                onToggleMobileMenu={toggleMobileMenu}
                onToggleCollapse={toggleCollapse}
                isCollapsed={isCollapsed}
                currentPageTitle={currentPageTitle}
            />
            
            <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
                <Outlet />
            </main>
        </div>
    );

    return (
        <AiChatProvider>
            <div className="flex h-screen bg-gray-100" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {String(auth?.user?.role || '').toLowerCase() === 'teacher' ? <TeacherDashboardPrefetcher /> : null}

                <ForcePasswordChangeModal
                    isOpen={userForceOpen}
                    onSkip={skipUserPasswordChange}
                    onChanged={passwordChanged}
                    mode="user"
                />

                {/* Keep AI split panel on the RIGHT for both LTR + RTL */}
                {isRTL ? <AiChatPanel /> : null}

                {isRTL ? mainEl : sidebarEl}
                {isRTL ? sidebarEl : mainEl}

                {!isRTL ? <AiChatPanel /> : null}

                {isMobileMenuOpen && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden no-print" 
                        onClick={closeMobileMenu}
                    ></div>
                )}
            </div>
        </AiChatProvider>
    );
}

