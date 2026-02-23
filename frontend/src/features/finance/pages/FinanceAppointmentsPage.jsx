import React from 'react';
import FinanceAppointments from '../components/FinanceAppointments.jsx';
import { useFinanceRealtimeInvalidation } from '../useFinanceRealtimeInvalidation';

export default function FinanceAppointmentsPage() {
  // Realtime → Events → Invalidate Queries → UI updated (Finance)
  useFinanceRealtimeInvalidation();

  return (
    <div className="space-y-6">
      <FinanceAppointments />
    </div>
  );
}
