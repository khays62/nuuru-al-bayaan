import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { useAuth } from '../../../auth/AuthContext.jsx';
import { isStudentDashboardTabEnabled } from '../privacyPolicyDefaults.js';

export default function StudentDashboardPolicyRoute({ policyKey, children }) {
  const { auth } = useAuth();
  const { studentId } = useParams();
  const enabled = isStudentDashboardTabEnabled(auth?.privacyPolicy, policyKey);

  if (enabled) return children;

  const fallback = studentId ? `/students/${String(studentId)}/dashboard` : '/student-dashboard';
  return <Navigate to={fallback} replace />;
}