import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get("/api/auth/verify", { withCredentials: true });
      if (res.data.user) setUser(res.data.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const hasPermission = (module, action) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const perm = user.permissions?.[module];
    if (!perm) return false;
    return perm.full === true || perm[action] === true;
  };

  const login = async (username, password) => {
    try {
      const res = await axios.post(
        "/api/auth/login",
        { username, password },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (res.data.success) {
        await fetchCurrentUser();
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout", {}, { withCredentials: true });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ auth: { user }, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
