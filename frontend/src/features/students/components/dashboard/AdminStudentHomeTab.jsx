import React from 'react';
import { useParams } from 'react-router-dom';
import { StudentSelfHomeCards } from './StudentSelfDashboardShell';

export default function AdminStudentHomeTab() {
  const { studentId } = useParams();
  return <StudentSelfHomeCards studentIdOverride={studentId} />;
}
