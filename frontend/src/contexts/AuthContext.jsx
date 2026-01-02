import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { queryClient } from '../queryClient';
import { abortSessionRequests, resetSessionAbortController } from '../api/sessionAbort';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get("/api/auth/verify", { withCredentials: true });
      if (res.data?.success && res.data?.user) setUser(res.data.user);
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

  const refreshUser = fetchCurrentUser;

  const hasPermission = (module, action) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const perm = user.permissions?.[module];
    if (!perm) return false;
    return perm.full === true || perm[action] === true;
  };

  const login = async (username, password) => {
    try {
      const identifier = String(username || '').trim();
      const secret = String(password || '').trim();

      const upperIdentifier = identifier.toUpperCase();
      // Student ID formats supported:
      // - numeric only (legacy)
      // - starts with ST (legacy)
      // - cohort-coded IDs like DU5SA15 (2 letters + digits + S + section letter + digits)
      const isStudent =
        /^[0-9]+$/.test(identifier) ||
        upperIdentifier.startsWith('ST') ||
        /^[A-Z]{2}\d+S[A-Z]\d{2,}$/i.test(identifier);

      const normalizedStudentId = /^[A-Z]{2}\d+S[A-Z]\d{2,}$/i.test(identifier)
        ? upperIdentifier
        : (upperIdentifier.startsWith('ST') ? upperIdentifier : identifier);

      const payload = isStudent
        ? { studentId: normalizedStudentId, password: secret }
        : { username: identifier, password: secret };

      const res = await axios.post("/api/auth/login", payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      if (res.data.success) {
        // New auth session: ensure previous session abort state doesn't leak.
        resetSessionAbortController();
        // Ensure the default-password prompt shows again after each fresh login
        // if the account is still on the default password.
        try {
          sessionStorage.removeItem('student_force_pw_dismissed');
          // Backwards-compat with older key used during development.
          sessionStorage.removeItem('student_skip_force_pw');
        } catch {
          // ignore
        }
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
      // Immediately clear client auth + cancel in-flight queries so we don't spam 401s after logout.
      abortSessionRequests('logout');
      setUser(null);
      await queryClient.cancelQueries();
      queryClient.clear();

      // Best-effort server logout (cookie clear). If it fails, we still consider client logged out.
      await axios.post("/api/auth/logout", {}, { withCredentials: true });
      try {
        sessionStorage.removeItem('student_force_pw_dismissed');
        sessionStorage.removeItem('student_skip_force_pw');
      } catch {
        // ignore
      }
    } catch (err) {
      // Don't log noisy network/auth errors during logout.
    }
  };

  return (
    <AuthContext.Provider value={{ auth: { user }, loading, login, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
