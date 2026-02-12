import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import {
  getFinanceStudentsSummary,
  getPreviousBalanceSummary,
  getInvoices,
  getStudentMonthHistory,
  chargeStudentFees,
  updateChargeAmount,
  deleteMonthlyCharges,
  applyMonthlyDiscount,
  applyOverallDiscount,
  applyBulkDiscount,
  recordCorrection,
  payChargedMonth,
  paySelectedMonths,
  discountChargedMonth,
  editPaymentGroup,
  revertPaymentGroup,
} from '../api/studentFinanceApi';

import { studentFinanceKeys } from '../queryKeys';

export function useFinanceStudentsSummaryQuery({ search, classId, type } = {}, options = {}) {
  return useQuery({
    queryKey: studentFinanceKeys.studentsSummary({ search, classId, type }),
    queryFn: ({ signal }) => getFinanceStudentsSummary({ search, classId, type }, { signal }),
    staleTime: 10 * 1000,
    ...options,
  });
}

export function usePreviousBalanceSummaryQuery({ search, classId, month } = {}, options = {}) {
  return useQuery({
    queryKey: studentFinanceKeys.previousBalanceSummary({ search, classId, month }),
    queryFn: ({ signal }) => getPreviousBalanceSummary({ search, classId, month }, { signal }),
    staleTime: 10 * 1000,
    ...options,
  });
}

export function useInvalidateStudentFinance() {
  const queryClient = useQueryClient();
  return () => {
    try {
      queryClient.invalidateQueries({ queryKey: studentFinanceKeys.studentsSummaryBase, refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: studentFinanceKeys.previousBalanceSummaryBase, refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: studentFinanceKeys.invoicesBase, refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: studentFinanceKeys.monthHistoryBase, refetchType: 'active' });
    } catch {
      // ignore
    }
  };
}

export function useInvoicesQuery({ studentId, classId, search, limit, id } = {}, options = {}) {
  return useQuery({
    queryKey: studentFinanceKeys.invoices({ studentId, classId, search, limit, id }),
    queryFn: ({ signal }) => getInvoices({ studentId, classId, search, limit, _id: id }, { signal }),
    staleTime: 10 * 1000,
    ...options,
  });
}

export function useStudentMonthHistoryQuery({ studentId } = {}, options = {}) {
  return useQuery({
    queryKey: studentFinanceKeys.monthHistory({ studentId }),
    queryFn: ({ signal }) => getStudentMonthHistory({ studentId }, { signal }),
    staleTime: 10 * 1000,
    ...options,
  });
}

function useStudentFinanceMutation(mutationFn) {
  const invalidate = useInvalidateStudentFinance();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidate(),
  });
}

export function useChargeStudentFeesMutation() {
  return useStudentFinanceMutation((payload) => chargeStudentFees(payload));
}

export function useUpdateChargeAmountMutation() {
  return useStudentFinanceMutation((payload) => updateChargeAmount(payload));
}

export function useDeleteMonthlyChargesMutation() {
  return useStudentFinanceMutation((payload) => deleteMonthlyCharges(payload));
}

export function useApplyMonthlyDiscountMutation() {
  return useStudentFinanceMutation((payload) => applyMonthlyDiscount(payload));
}

export function useApplyOverallDiscountMutation() {
  return useStudentFinanceMutation((payload) => applyOverallDiscount(payload));
}

export function useApplyBulkDiscountMutation() {
  return useStudentFinanceMutation((payload) => applyBulkDiscount(payload));
}

export function useRecordCorrectionMutation() {
  return useStudentFinanceMutation((payload) => recordCorrection(payload));
}

export function usePayChargedMonthMutation() {
  return useStudentFinanceMutation((payload) => payChargedMonth(payload));
}

export function usePaySelectedMonthsMutation() {
  return useStudentFinanceMutation((payload) => paySelectedMonths(payload));
}

export function useDiscountChargedMonthMutation() {
  return useStudentFinanceMutation((payload) => discountChargedMonth(payload));
}

export function useEditPaymentGroupMutation() {
  return useStudentFinanceMutation((payload) => editPaymentGroup(payload));
}

export function useRevertPaymentGroupMutation() {
  return useStudentFinanceMutation((payload) => revertPaymentGroup(payload));
}

export function useStudentFinanceNoopMutation() {
  const invalidate = useInvalidateStudentFinance();
  return useMutation({
    mutationFn: async (payload) => payload,
    onSuccess: () => invalidate(),
  });
}
