import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Settings, Trash2, Edit, Check, Loader2 } from 'lucide-react';
import financeService from '../api/finance';

import {
  useCreateFeeTypeMutation,
  useDeleteFeeTypeMutation,
  useFeeTypesQuery,
  useUpdateFeeTypeMutation,
} from '../hooks/financeConfigHooks';

import { useFinanceRealtimeInvalidation } from '../useFinanceRealtimeInvalidation';
import { useI18n } from '../../../i18n/useI18n';
import { useAuth } from '../../../auth/AuthContext';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

export default function FeeTypeTab() {
  const feeTypesQuery = useFeeTypesQuery({ includeInactive: true }, { staleTime: 30_000 });
  useFinanceRealtimeInvalidation();
  const createMutation = useCreateFeeTypeMutation();
  const updateMutation = useUpdateFeeTypeMutation();
  const deleteMutation = useDeleteFeeTypeMutation();

  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const canAdd = hasPermission('financeStudentFeeType', 'add');
  const canEdit = hasPermission('financeStudentFeeType', 'edit');
  const canDelete = hasPermission('financeStudentFeeType', 'delete');

  const isSaving = Boolean(createMutation.isPending || updateMutation.isPending);
  const loading = Boolean(feeTypesQuery.isLoading);
  const feeTypes = Array.isArray(feeTypesQuery.data) ? feeTypesQuery.data : [];

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', mode: 'charge', discountPercent: 0, status: 'active' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => setPage(1), [feeTypes.length]);

  const total = feeTypes.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const currentRows = feeTypes.slice(start, start + limit);

  useEffect(() => {
    if (!feeTypesQuery.isError) return;
    toast.error(t('finance.feeTypes.toasts.loadFailed', { defaultValue: 'Failed to load fee types' }));
  }, [feeTypesQuery.isError, t]);

  const startNew = () => {
    if (!canAdd) {
      toast.error(t('finance.feeTypes.toasts.noAddPermission', { defaultValue: 'You do not have permission to create fee types' }));
      return;
    }
    setEditingId('new');
    setFormData({ name: '', mode: 'charge', discountPercent: 0, status: 'active' });
  };

  const startEdit = (ft) => {
    if (!canEdit) {
      toast.error(t('finance.feeTypes.toasts.noEditPermission', { defaultValue: 'You do not have permission to edit fee types' }));
      return;
    }
    setEditingId(ft._id);
    setFormData({
      name: ft.name,
      mode: ft.mode || (String(ft.code).toLowerCase() === 'free' ? 'waive' : 'charge'),
      discountPercent: Number(ft.discountPercent || 0),
      status: ft.status || 'active',
    });
  };

  const closeModal = () => {
    setEditingId(null);
    setFormData({ code: '', name: '', mode: 'charge', discountPercent: 0, status: 'active' });
  };

  const handleSave = async () => {
    if (editingId === 'new') {
      if (!canAdd) {
        toast.error(t('finance.feeTypes.toasts.noAddPermission', { defaultValue: 'You do not have permission to create fee types' }));
        return false;
      }
    } else {
      if (!canEdit) {
        toast.error(t('finance.feeTypes.toasts.noEditPermission', { defaultValue: 'You do not have permission to edit fee types' }));
        return false;
      }
    }

    if (!formData.name || !String(formData.name).trim()) {
      toast.error(t('finance.feeTypes.toasts.nameRequired', { defaultValue: 'Name is required' }));
      return false;
    }

    const mode = String(formData.mode || 'charge').toLowerCase();
    const pct = Number(formData.discountPercent || 0);
    if (mode === 'discount') {
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        toast.error(t('finance.feeTypes.toasts.discountInvalid', { defaultValue: 'Discount percent must be 1 to 100' }));
        return false;
      }
    }

    try {
      // Backend expects system codes for fee types. Map behavior -> code for creation
      if (editingId === 'new') {
        await createMutation.mutateAsync({
          name: String(formData.name).trim(),
          mode,
          discountPercent: mode === 'discount' ? pct : 0,
          status: formData.status || 'active',
        });
        toast.success(t('finance.feeTypes.toasts.created', { defaultValue: 'Fee type created' }));
      } else {
        await updateMutation.mutateAsync({
          id: editingId,
          payload: {
            name: String(formData.name).trim(),
            mode,
            discountPercent: mode === 'discount' ? pct : 0,
            status: formData.status || 'active',
          },
        });
        toast.success(t('finance.feeTypes.toasts.updated', { defaultValue: 'Fee type updated' }));
      }
      setEditingId(null);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || t('finance.feeTypes.toasts.operationFailed', { defaultValue: 'Operation failed' }));
      return false;
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      toast.error(t('finance.feeTypes.toasts.noDeletePermission', { defaultValue: 'You do not have permission to delete fee types' }));
      return;
    }
    try {
      // Pre-check whether the fee type can be deleted. If referenced, backend returns 400 with code FEE_TYPE_IN_USE
      await financeService.getCanDeleteFeeType(id);
      // If backend says ok, confirm and delete
      if (!window.confirm(t('finance.feeTypes.confirms.permanentDelete', { defaultValue: 'Permanently delete this fee type? This action cannot be undone.' }))) return;
      await deleteMutation.mutateAsync(id);
      toast.success(t('finance.feeTypes.toasts.deleted', { defaultValue: 'Fee type deleted' }));
      if (typeof feeTypesQuery.refetch === 'function') {
        try { await feeTypesQuery.refetch(); } catch { /* ignore */ }
      }
    } catch (e) {
      const msg = (e?.response?.data?.message) || e?.message || '';
      // If it's a reference/in-use error, show clear English toast immediately
      if (e?.response?.data?.code === 'FEE_TYPE_IN_USE' || /referenc|in use|constraint|linked|foreign/i.test(msg)) {
        // show a clear English validation toast and prevent deletion
        toast.error(t('finance.feeTypes.toasts.deleteBlocked', { defaultValue: 'Cannot delete — this fee type is referenced by other records.' }));
        return;
      }
      toast.error(msg || t('finance.feeTypes.toasts.operationFailed', { defaultValue: 'Operation failed' }));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 rounded-3xl shadow-xl no-print">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
              <Settings size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-surface-900 uppercase tracking-tighter">{t('finance.feeTypes.title', { defaultValue: 'Fee Type Configuration' })}</h3>
              <p className="text-xs font-black text-surface-400 uppercase tracking-[0.2em] mt-1">{t('finance.feeTypes.subtitle', { defaultValue: 'Personal vs Free' })}</p>
            </div>
          </div>
          <Button
            onClick={startNew}
            variant="brand"
            size="lg"
            icon={<Plus size={18} strokeWidth={3} />}
            className="font-black text-xs uppercase tracking-widest"
            disabled={!canAdd}
            title={!canAdd ? t('finance.feeTypes.toasts.noAddPermission', { defaultValue: 'You do not have permission to create fee types' }) : undefined}
          >
            {t('finance.feeTypes.create', { defaultValue: 'Create Fee Type' })}
          </Button>
        </div>
      </Card>

      <Modal isOpen={editingId === 'new' || (typeof editingId === 'string' && editingId !== 'new')} onClose={closeModal} title={editingId === 'new' ? t('finance.feeTypes.modal.create', { defaultValue: 'Create Fee Type' }) : t('finance.feeTypes.modal.edit', { defaultValue: 'Edit Fee Type' })}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1 md:col-start-1">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">{t('finance.feeTypes.labels.displayName', { defaultValue: 'Display Name' })}</label>
              <Input type="text" className="h-11 font-bold" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} autoFocus />
            </div>

            <div className="space-y-2 md:col-span-1">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">{t('finance.feeTypes.labels.behavior', { defaultValue: 'Behavior' })}</label>
              <DropdownSelect
                value={formData.mode}
                onChange={(v) => setFormData((p) => ({ ...p, mode: v || 'charge' }))}
                options={[
                  { value: 'charge', label: t('finance.feeTypes.behaviors.charge', { defaultValue: 'Regular (Paid)' }) },
                  { value: 'waive', label: t('finance.feeTypes.behaviors.waive', { defaultValue: 'Free (Waive 100%)' }) },
                  { value: 'discount', label: t('finance.feeTypes.behaviors.discount', { defaultValue: 'Discount (%)' }) },
                ]}
                clearable={false}
                className="h-11 font-black text-xs uppercase"
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">{t('finance.feeTypes.labels.status', { defaultValue: 'Status' })}</label>
              <DropdownSelect
                value={formData.status}
                onChange={(v) => setFormData((p) => ({ ...p, status: v || 'active' }))}
                options={[
                  { value: 'active', label: t('finance.feeTypes.status.active', { defaultValue: 'Active' }) },
                  { value: 'inactive', label: t('finance.feeTypes.status.inactive', { defaultValue: 'Inactive' }) },
                ]}
                clearable={false}
                className="h-11 font-black text-xs uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {String(formData.mode) === 'discount' && (
                <>
                  <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">{t('finance.feeTypes.labels.discountPercent', { defaultValue: 'Discount Percent' })}</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    className="h-11 font-bold"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData((p) => ({ ...p, discountPercent: Number(e.target.value) }))}
                    placeholder={t('finance.feeTypes.placeholders.discountPercent', { defaultValue: '1 - 100' })}
                  />
                </>
              )}
            </div>

            <div className="flex items-end justify-end">
              <Button onClick={async () => { if (isSaving) return; const ok = await handleSave(); if (ok) closeModal(); }} variant="primary" size="lg" className="h-11 font-black text-[10px] uppercase tracking-[0.2em]" disabled={isSaving} icon={isSaving ? <Loader2 size={18} className="animate-spin" /> : undefined}>
                {isSaving ? t('finance.feeTypes.saving', { defaultValue: 'Saving...' }) : t('finance.feeTypes.actions.save', { defaultValue: 'Save' })}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Card className="rounded-3xl shadow-xl">
          <StandardTable
          isLoading={loading}
          error={null}
          items={feeTypes}
          loadingMessage={t('finance.feeTypes.loading.initializing', { defaultValue: 'Initializing...' })}
          loadingVariant="table"
          loadingRows={6}
          loadingColumns={3}
          emptyTitle={t('finance.feeTypes.emptyTitle', { defaultValue: 'No fee types defined.' })}
          emptyDescription=""
          rows={currentRows}
          columns={[
            { key: 'type', label: t('finance.feeTypes.table.type', { defaultValue: 'Fee Type' }), sortable: false },
            { key: 'mode', label: t('finance.feeTypes.table.behavior', { defaultValue: 'Behavior' }), sortable: false },
            { key: 'status', label: t('finance.feeTypes.table.status', { defaultValue: 'Status' }), sortable: false },
            { key: 'actions', label: t('finance.feeTypes.table.actions', { defaultValue: 'Actions' }), sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
          ]}
          storageKey="finance:fee-types:columns:v1"
          controlsProps={{
            limit,
            total,
            onLimit: (v) => {
              setLimit(v);
              setPage(1);
            },
            className: 'px-6 bg-white',
          }}
          tableProps={{ shellClassName: 'rounded-none border-0 shadow-none ring-0' }}
          getRowKey={(row) => row?._id}
          renderCell={(ft, col) => {
            if (!col) return '';
            if (col.key === 'type') {
                return (
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-surface-900 text-base">{ft.name}</span>
                  </div>
                );
            }

            if (col.key === 'mode') {
              const m = String(ft.mode || '').toLowerCase();
              if (m === 'discount') {
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-surface-600">{t('finance.feeTypes.behaviors.discount', { defaultValue: 'Discount' })}</span>
                    <span className="text-[11px] font-bold text-surface-700">{Number(ft.discountPercent || 0)}%</span>
                  </div>
                );
              }
              if (m === 'waive') {
                return <span className="text-[11px] font-black uppercase tracking-widest text-surface-600">{t('finance.feeTypes.behaviors.waive', { defaultValue: 'Free / Waive' })}</span>;
              }
              return <span className="text-[11px] font-black uppercase tracking-widest text-surface-600">{t('finance.feeTypes.behaviors.charge', { defaultValue: 'Regular' })}</span>;
            }

            if (col.key === 'status') {
              const dotClass = ft.status === 'active' ? 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'w-2 h-2 rounded-full bg-surface-300';
              return (
                <div className="flex items-center gap-2">
                  <div className={dotClass} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">{t(`finance.feeTypes.status.${ft.status}`, { defaultValue: ft.status })}</span>
                </div>
              );
            }

            if (col.key === 'actions') {
              const actions = [];
              if (canEdit) {
                actions.push({ key: 'edit', label: t('finance.feeTypes.actions.edit', { defaultValue: 'Edit' }), title: t('finance.feeTypes.actions.edit', { defaultValue: 'Edit' }), tone: 'edit', icon: <Edit size={18} />, onClick: () => startEdit(ft) });
              }
              if (canDelete) {
                actions.push({ key: 'delete', label: t('finance.feeTypes.actions.delete', { defaultValue: 'Delete' }), title: t('finance.feeTypes.actions.delete', { defaultValue: 'Delete' }), tone: 'delete', icon: <Trash2 size={18} />, onClick: () => handleDelete(ft._id) });
              }
              return <RowActionButtons actions={actions} />;
            }

            return '';
          }}
        />
      </Card>
    </div>
  );
}
