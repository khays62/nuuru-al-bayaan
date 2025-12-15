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

        const { auth } = useAuth();
        const role = auth?.user?.role;
    return (
        <>
            {/* Sidebar for Desktop */}
            <aside className={`bg-gray-800 text-white flex-col h-full transition-all duration-300 ease-in-out hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'}`}>
                {/* The header is now a clickable Link */}
                <Link to="/dashboard" className="flex items-center justify-center h-16 border-b border-gray-700 px-4 hover:bg-gray-700 transition-colors">
                    <img src={logo} alt="Nuuru Al-Bayaan Logo" className={`h-10 transition-all flex-shrink-0 ${isCollapsed ? 'w-10' : 'w-auto'}`} />
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
                                <Icon size={22} className="flex-shrink-0" />
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
                <Icon size={22} className="flex-shrink-0" />
                {!isCollapsed && <span className="ml-4 whitespace-nowrap">{item.label}</span>}
            </NavLink>
        );
}))} */}


{navItems
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
        <Icon size={22} className="flex-shrink-0" />
        {!isCollapsed && <span className="ml-4 whitespace-nowrap">{item.label}</span>}
      </NavLink>
    );
})}

                </nav>
            </aside>

            {/* Sidebar for Mobile */}
            <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white flex-col z-30 transition-transform duration-300 ease-in-out md:hidden flex ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 {/* The mobile header is also a clickable Link */}
                <Link to="/dashboard" onClick={closeMobileMenu} className="flex items-center justify-center h-16 border-b border-gray-700 px-4 flex-shrink-0">
                     <img src={logo} alt="Nuuru Al-Bayaan Logo" className="h-10" />
                    <span className="ml-3 font-semibold text-lg">Nuuru Al-Bayaan</span>
                </Link>
                <nav className="flex-1 px-4 py-4 overflow-y-auto">
                     {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
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


