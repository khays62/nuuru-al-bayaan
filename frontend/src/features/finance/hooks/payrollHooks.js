import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adjustPayroll,
  chargePayroll,
  deletePayroll,
  deletePayrollCharges,
  deletePaidPayrolls,
  generatePayroll,
  generateSinglePayroll,
  getPayrollStaffLedger,
  listPayrolls,
  payrollFullPayment,
  updatePayrollByParams,
  updatePayrollLedger,
  updatePayrollStatus,
} from '../api/payrollApi';

import { accountKeys, expenseKeys, payrollKeys } from '../queryKeys';

export function usePayrollsQuery({ month, academicYear } = {}, options = {}) {
  return useQuery({
    queryKey: payrollKeys.list({ month, academicYear }),
    queryFn: ({ signal }) => listPayrolls({ month, academicYear }, { signal }),
    placeholderData: (prev) => prev,
    staleTime: 15 * 1000,
    // App default is refetchOnMount: false. Finance needs mount refetch so
    // switching pages/tabs shows fresh balances without browser refresh.
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function usePayrollStaffLedgerQuery({ month, academicYear, staffId } = {}, options = {}) {
  return useQuery({
    queryKey: payrollKeys.staffLedger({ month, academicYear, staffId }),
    queryFn: ({ signal }) => getPayrollStaffLedger({ month, academicYear, staffId }, { signal }),
    enabled: Boolean(staffId) && (options.enabled ?? true),
    placeholderData: (prev) => prev,
    staleTime: 15 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    ...options,
  });
}

function invalidatePayroll(queryClient) {
  try {
    queryClient.invalidateQueries({ queryKey: payrollKeys.listBase, refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: payrollKeys.staffLedgerBase, refetchType: 'active' });
  } catch {
    // ignore
  }
}

function invalidateFinanceSideEffects(queryClient) {
  try {
    queryClient.invalidateQueries({ queryKey: accountKeys.listBase, refetchType: 'active' });
  } catch { /* ignore */ }
  try {
    queryClient.invalidateQueries({ queryKey: expenseKeys.listBase, refetchType: 'active' });
  } catch { /* ignore */ }
}

export function useGeneratePayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => generatePayroll(payload),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function useGenerateSinglePayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => generateSinglePayroll(payload),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function useUpdatePayrollByParamsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => updatePayrollByParams(payload),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function useUpdatePayrollStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updatePayrollStatus(id, payload),
    onSuccess: () => {
      invalidatePayroll(queryClient);
      invalidateFinanceSideEffects(queryClient);
    },
  });
}

export function useAdjustPayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => adjustPayroll(id, payload),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function useUpdatePayrollLedgerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updatePayrollLedger(id, payload),
    onSuccess: () => {
      invalidatePayroll(queryClient);
      invalidateFinanceSideEffects(queryClient);
    },
  });
}

export function useDeletePayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deletePayroll(id),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function useChargePayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => chargePayroll(payload),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function usePayrollFullPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => payrollFullPayment(payload),
    onSuccess: () => {
      invalidatePayroll(queryClient);
      invalidateFinanceSideEffects(queryClient);
    },
  });
}

export function useDeletePayrollChargesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => deletePayrollCharges(payload),
    onSuccess: () => {
      invalidatePayroll(queryClient);
      invalidateFinanceSideEffects(queryClient);
    },
  });
}

export function useDeletePaidPayrollsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => deletePaidPayrolls(payload),
    onSuccess: () => {
      invalidatePayroll(queryClient);
      invalidateFinanceSideEffects(queryClient);
    },
  });
}
