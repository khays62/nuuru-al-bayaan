import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, LogOut, ChevronRight, Search, User } from 'lucide-react';

// This is the updated Navbar component with a new design.
const Navbar = ({ onToggleMobileMenu, onToggleCollapse, isCollapsed, currentPageTitle }) => {
    const { auth, logout } = useAuth();
    const user = auth?.user;
    const displayName = user?.fullName || user?.name || user?.username || '—';
    const displayRole = user?.role ? String(user.role).toUpperCase() : '';
    const displayEmail = user?.email || '';
    const meta = [displayRole, displayEmail].filter(Boolean).join(' • ');

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
                <div className="text-right hidden sm:block">
                    <p className="font-semibold text-sm text-gray-800">{displayName}</p>
                    <p className="text-xs text-gray-500">{meta || ' '}</p>
                </div>
                <User size={24} className="text-gray-600 sm:hidden" />
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    title="Logout"
                >
                    <LogOut size={16} />
                    <span className="hidden lg:inline">Logout</span>
                </button>
            </div>
        </header>
    );
};

export default Navbar;

