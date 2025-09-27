import React, { createContext, useState, useContext } from 'react';

// Create the context
const AuthContext = createContext(null);

// Create the provider component.
// It no longer uses useNavigate. Its only job is to manage state.
export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('user'));

    const login = () => {
        localStorage.setItem('user', 'authenticated');
        setIsAuthenticated(true);
        // Navigation is now handled by the component that calls login.
    };

    const logout = () => {
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        // Navigation is now handled by the component that calls logout.
    };

    const value = { isAuthenticated, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context easily
export const useAuth = () => {
    return useContext(AuthContext);
};

