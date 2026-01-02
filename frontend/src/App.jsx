import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import { navItems } from './config/navigation'; // Import from the new central config file

export default function App() {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCollapsed, setCollapsed] = useState(false);
    
    const location = useLocation();

    // Find the current page title based on the route from the central config
    const currentNavItem = navItems.find(item => location.pathname.startsWith(item.path));
    const currentPageTitle = currentNavItem ? currentNavItem.label : 'Dashboard';

    const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
    const toggleCollapse = () => setCollapsed(!isCollapsed);
    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar
                isMobileMenuOpen={isMobileMenuOpen}
                isCollapsed={isCollapsed}
                closeMobileMenu={closeMobileMenu}
            />

            <div className="flex flex-col flex-1 overflow-hidden">
                <Navbar
                    onToggleMobileMenu={toggleMobileMenu}
                    onToggleCollapse={toggleCollapse}
                    isCollapsed={isCollapsed}
                    currentPageTitle={currentPageTitle}
                />
                
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>

            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
                    onClick={closeMobileMenu}
                ></div>
            )}
        </div>
    );
}

