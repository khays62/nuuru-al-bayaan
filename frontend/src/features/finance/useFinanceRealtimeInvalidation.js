import { useQueryClient } from '@tanstack/react-query';

import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { EVENTS } from '../../utils/events';

import { expenseKeys, accountKeys, categoryKeys } from './queryKeys';
import { payrollKeys } from './queryKeys';

export function useFinanceRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(EVENTS.EXPENSES_CHANGED, () => {
    try {
      queryClient.invalidateQueries({ queryKey: expenseKeys.listBase, refetchType: 'active' });
    } catch { /* ignore */ }
  });

  useRealtimeInvalidation(EVENTS.ACCOUNTS_CHANGED, () => {
    try {
      queryClient.invalidateQueries({ queryKey: accountKeys.listBase, refetchType: 'active' });
    } catch { /* ignore */ }

    // Keep the ledger/audit stream in sync across tabs (EDCI).
    try {
      queryClient.invalidateQueries({ queryKey: ['finance', 'audit', 'accounts'], refetchType: 'active' });
    } catch { /* ignore */ }
  });

  useRealtimeInvalidation(EVENTS.FINANCE_CATEGORIES_CHANGED, () => {
    try {
      queryClient.invalidateQueries({ queryKey: categoryKeys.listBase, refetchType: 'active' });
    } catch { /* ignore */ }
  });

  useRealtimeInvalidation(EVENTS.PAYROLL_CHANGED, () => {
    try {
      queryClient.invalidateQueries({ queryKey: payrollKeys.listBase, refetchType: 'active' });
    } catch { /* ignore */ }
    try {
      queryClient.invalidateQueries({ queryKey: payrollKeys.staffLedgerBase, refetchType: 'active' });
    } catch { /* ignore */ }
  });
}
