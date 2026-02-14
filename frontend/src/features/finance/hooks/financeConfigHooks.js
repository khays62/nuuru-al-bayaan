import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import financeService from '../api/finance';
import { categoryKeys, feeTypeKeys } from '../queryKeys';

export function useFinanceCategoriesQuery({ type, includePreviousBalance } = {}, options = {}) {
  return useQuery({
    queryKey: categoryKeys.list({ type, includePreviousBalance }),
    queryFn: async () => {
      const res = await financeService.getFinanceCategories(type, { includePreviousBalance });
      return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : (res?.data || []));
    },
    ...options,
  });
}

export function useFeeTypesQuery({ includeInactive } = {}, options = {}) {
  return useQuery({
    queryKey: feeTypeKeys.list({ includeInactive }),
    queryFn: async () => {
      const res = await financeService.getFeeTypes({ includeInactive });
      return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : (res?.data || []));
    },
    ...options,
  });
}

export function useCreateFinanceCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => financeService.createFinanceCategory(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.listBase, refetchType: 'active' });
    },
  });
}

export function useUpdateFinanceCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => financeService.updateFinanceCategory(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.listBase, refetchType: 'active' });
    },
  });
}

export function useDeleteFinanceCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => financeService.deleteFinanceCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.listBase, refetchType: 'active' });
    },
  });
}

export function useCreateFeeTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => financeService.createFeeType(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: feeTypeKeys.listBase, refetchType: 'active' });
    },
  });
}

export function useUpdateFeeTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => financeService.updateFeeType(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: feeTypeKeys.listBase, refetchType: 'active' });
    },
  });
}

export function useDeleteFeeTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => financeService.deleteFeeType(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: feeTypeKeys.listBase, refetchType: 'active' });
    },
  });
}
