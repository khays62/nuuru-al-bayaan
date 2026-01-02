// import React from 'react';
// // Import Link component
// import { NavLink, Link } from 'react-router-dom';
// import { navItems } from '../../config/navigation';
// import logo from '../../assets/nuuruBayaan.png';

// export default function Sidebar({ isMobileMenuOpen, isCollapsed, closeMobileMenu }) {
//     const navLinkClasses = ({ isActive }) =>
//         `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
//             isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
//         }`;

//     return (
//         <>
//             {/* Sidebar for Desktop */}
//             <aside className={`bg-gray-800 text-white flex-col h-full transition-all duration-300 ease-in-out hidden md:flex no-print ${isCollapsed ? 'w-20' : 'w-64'}`}>
//                 {/* The header is now a clickable Link */}
//                 <Link to="/dashboard" className="flex items-center justify-center h-16 border-b border-gray-700 px-4 hover:bg-gray-700 transition-colors">
//                     <img src={logo} alt="Nuuru Al-Bayaan Logo" className={`h-10 transition-all flex-shrink-0 ${isCollapsed ? 'w-10' : 'w-auto'}`} />
//                     {!isCollapsed && (
//                         <span className="ml-3 font-semibold text-lg whitespace-nowrap overflow-hidden">Nuuru Al-Bayaan</span>
//                     )}
//                 </Link>
//                 <nav className="flex-1 px-4 py-4 overflow-y-auto">
//                     {navItems.map((item) => {
//                         const Icon = item.icon;
//                         return (
//                             <NavLink
//                                 key={item.path}
//                                 to={item.path}
//                                 className={navLinkClasses}
//                                 title={isCollapsed ? item.label : ''}
//                             >
//                                 <Icon size={22} className="flex-shrink-0" />
//                                 {!isCollapsed && <span className="ml-4 whitespace-nowrap">{item.label}</span>}
//                             </NavLink>
//                         );
//                     })}
//                 </nav>
//             </aside>

//             {/* Sidebar for Mobile */}
//             <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white flex-col z-30 transition-transform duration-300 ease-in-out md:hidden flex no-print ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
//                  {/* The mobile header is also a clickable Link */}
//                 <Link to="/dashboard" onClick={closeMobileMenu} className="flex items-center justify-center h-16 border-b border-gray-700 px-4 flex-shrink-0">
//                      <img src={logo} alt="Nuuru Al-Bayaan Logo" className="h-10" />
//                     <span className="ml-3 font-semibold text-lg">Nuuru Al-Bayaan</span>
//                 </Link>
//                 <nav className="flex-1 px-4 py-4 overflow-y-auto">
//                      {navItems.map((item) => {
//                         const Icon = item.icon;
//                         return (
//                             <NavLink
//                                 key={item.path}
//                                 to={item.path}
//                                 className={navLinkClasses}
//                                 onClick={closeMobileMenu} // Close menu on link click
//                             >
//                                 <Icon size={22} />
//                                 <span className="ml-4">{item.label}</span>
//                             </NavLink>
//                         );
//                     })}
//                 </nav>
//             </aside>
//         </>
//     );
// }

import React from 'react';
// Import Link component
import { NavLink, Link } from 'react-router-dom';
import { navItems } from '../../config/navigation';
import logo from '../../assets/nuuruBayaan.png';
import { useAuth } from "../../contexts/AuthContext";

export default function Sidebar({ isMobileMenuOpen, isCollapsed, closeMobileMenu }) {
    const navLinkClasses = ({ isActive }) =>
        `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`;

        const { auth, hasPermission } = useAuth();

const role = auth?.user?.role;
const homePath = role === 'student' ? '/student-dashboard' : '/dashboard';

const canAccessModule = (module) => {
  if (role === "admin") return true;
  if (!module) return false;

  // If user can do *anything* in a module, allow them to see the tab.
  const actions = [
    "view",
    "add",
    "edit",
    "input",
    "delete",
    "download",
    "export",
    "transfer",
    "deactivate",
    "reactivate",
    "assign",
    "preview",
    "promote",
    "print",
    "full"
  ];
  // Backward compatibility: older setups used `attendance.*` for Attendance Reports
  if (module === 'attendanceReports') {
    return actions.some((action) => hasPermission('attendanceReports', action))
      || actions.some((action) => hasPermission('attendance', action));
  }

  return actions.some((action) => hasPermission(module, action));
};

const visibleNavItems = navItems.filter((item) => {
  if (!item) return false;

  if (role === "admin") {
    // Admin should not see student-only navigation.
    // If roles are not specified, keep backward-compatibility by showing the item.
    return !Array.isArray(item.roles) || item.roles.includes("admin");
  }

  if (role === "staff") {
    return item.module ? canAccessModule(item.module) : Array.isArray(item.roles) && item.roles.includes("staff");
  }

  if (role === "student") {
    // Students don't have granular permissions; show student dashboard links + a small set of shared pages.
    const isStudentRole = Array.isArray(item.roles) && item.roles.includes('student');
    if (!isStudentRole) return false;
    return item.studentNav === true || item.module === 'announcements';
  }

  return false;
});

    return (
        <>
            {/* Sidebar for Desktop */}
            <aside className={`bg-gray-800 text-white flex-col h-full transition-all duration-300 ease-in-out hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'}`}>
                {/* The header is now a clickable Link */}
          <Link to={homePath} className="flex items-center justify-center h-16 border-b border-gray-700 px-4 hover:bg-gray-700 transition-colors">
                    <img src={logo} alt="Nuuru Al-Bayaan Logo" className={`h-10 transition-all shrink-0 ${isCollapsed ? 'w-10' : 'w-auto'}`} />
                    {!isCollapsed && (
                        <span className="ml-3 font-semibold text-lg whitespace-nowrap overflow-hidden">Nuuru Al-Bayaan</span>
                    )}
                </Link>
                <nav className="flex-1 px-4 py-4 overflow-y-auto">
                    {/* {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={navLinkClasses}
                                title={isCollapsed ? item.label : ''}
                            >
                                <Icon size={22} className="shrink-0" />
                                {!isCollapsed && <span className="ml-4 whitespace-nowrap">{item.label}</span>}
                            </NavLink>
                        );
                    })} */}
{/* 
{navItems.filter(item => item.roles.includes(role)).map(item => ({
        const Icon = item.icon;
        return (
            <NavLink
                key={item.path}
                to={item.path}
                className={navLinkClasses}
                title={isCollapsed ? item.label : ''}
            >
                <Icon size={22} className="shrink-0" />
                {!isCollapsed && <span className="ml-4 whitespace-nowrap">{item.label}</span>}
            </NavLink>
        );
}))} */}


{/* {navItems
  .filter(item => item.roles.includes(role))
  .map(item => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={navLinkClasses}
        title={isCollapsed ? item.label : ''}
      >
        <Icon size={22} className="shrink-0" />
        {!isCollapsed && <span className="ml-4 whitespace-nowrap">{item.label}</span>}
      </NavLink>
    );
})} */}

{/* {navItems
  .filter(
    (item) =>
      item &&                    // make sure item exists
      Array.isArray(item.roles) && // check roles is an array
      typeof role === "string" &&  // check role is defined
      item.roles.includes(role)    // finally check includes
  )
  .map((item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={navLinkClasses}
        title={isCollapsed ? item.label : ''}
      >
        <Icon size={22} className="shrink-0" />
        {!isCollapsed && <span className="ml-4 whitespace-nowrap">{item.label}</span>}
      </NavLink>
    );
})} */}

{/* {navItems
  .filter((item) => {
    if (role === "admin") return true;
    if (role === "staff") return item.module && hasPermission(item.module);
    if (role === "student") return item.roles?.includes("student");
    return false;
  })
  .map((item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        <Icon size={22} />
        <span className="ml-4">{item.label}</span>
      </NavLink>
    );
  })} */}

  



{visibleNavItems
  .map((item) => {
    const Icon = item.icon;
    const isDashboardPath = item.path === '/dashboard' || item.path === '/student-dashboard';
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={isDashboardPath}
        className={navLinkClasses}
        title={isCollapsed ? item.label : ""}
      >
        <Icon size={22} className="shrink-0" />
        {!isCollapsed && (
          <span className="ml-4 whitespace-nowrap">{item.label}</span>
        )}
      </NavLink>
    );
  })}



                </nav>
            </aside>

            {/* Sidebar for Mobile */}
            <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white flex-col z-30 transition-transform duration-300 ease-in-out md:hidden flex ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 {/* The mobile header is also a clickable Link */}
              <Link to={homePath} onClick={closeMobileMenu} className="flex items-center justify-center h-16 border-b border-gray-700 px-4 shrink-0">
                     <img src={logo} alt="Nuuru Al-Bayaan Logo" className="h-10" />
                    <span className="ml-3 font-semibold text-lg">Nuuru Al-Bayaan</span>
                </Link>
                 <nav className="flex-1 px-4 py-4 overflow-y-auto">
                   {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                      const isDashboardPath = item.path === '/dashboard' || item.path === '/student-dashboard';
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                          end={isDashboardPath}
                                className={navLinkClasses}
                                onClick={closeMobileMenu} // Close menu on link click
                            >
                                <Icon size={22} />
                                <span className="ml-4">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}


