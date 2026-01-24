import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function HomeRedirect() {
  const { auth } = useAuth();
  const role = String(auth?.user?.role || '').toLowerCase();

  if (role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
  if (role === 'student') return <Navigate to="/student-dashboard" replace />;
  if (role === 'admin' || role === 'staff') return <Navigate to="/dashboard" replace />;

  return <Navigate to="/login" replace />;
}
