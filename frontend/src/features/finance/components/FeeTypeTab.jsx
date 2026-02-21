import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Settings, Trash2, Edit, Check, Loader2 } from 'lucide-react';

import {
  useCreateFeeTypeMutation,
  useDeleteFeeTypeMutation,
  useFeeTypesQuery,
  useUpdateFeeTypeMutation,
} from '../hooks/financeConfigHooks';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

export default function FeeTypeTab() {
  const feeTypesQuery = useFeeTypesQuery({ includeInactive: true }, { staleTime: 30_000 });
  const createMutation = useCreateFeeTypeMutation();
  const updateMutation = useUpdateFeeTypeMutation();
  const deleteMutation = useDeleteFeeTypeMutation();

  const isSaving = Boolean(createMutation.isPending || updateMutation.isPending);
  const loading = Boolean(feeTypesQuery.isLoading);
  const feeTypes = Array.isArray(feeTypesQuery.data) ? feeTypesQuery.data : [];

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ code: '', name: '', mode: 'charge', discountPercent: 0, status: 'active' });
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
    toast.error('Failed to load fee types');
  }, [feeTypesQuery.isError]);

  const startNew = () => {
    setEditingId('new');
    setFormData({ code: '', name: '', mode: 'charge', discountPercent: 0, status: 'active' });
  };

  const startEdit = (ft) => {
    setEditingId(ft._id);
    setFormData({
      code: ft.code,
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
    if (!formData.name || !String(formData.name).trim()) {
      toast.error('Name is required');
      return false;
    }

    if (editingId === 'new') {
      const code = String(formData.code || '').toLowerCase().trim();
      if (!code) {
        toast.error('Code is required');
        return false;
      }
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(code)) {
        toast.error('Code must be lowercase and may include numbers, _ or -');
        return false;
      }
    }

    const mode = String(formData.mode || 'charge').toLowerCase();
    const pct = Number(formData.discountPercent || 0);
    if (mode === 'discount') {
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        toast.error('Discount percent must be 1 to 100');
        return false;
      }
    }

    try {
      if (editingId === 'new') {
        await createMutation.mutateAsync({
          code: String(formData.code).toLowerCase().trim(),
          name: String(formData.name).trim(),
          mode,
          discountPercent: mode === 'discount' ? pct : 0,
          status: formData.status || 'active',
        });
        toast.success('Fee type created');
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
        toast.success('Fee type updated');
      }
      setEditingId(null);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Operation failed');
      return false;
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this fee type?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Fee type deactivated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Operation failed');
    }
  };

  const handleActivate = async (id) => {
    try {
      await updateMutation.mutateAsync({ id, payload: { status: 'active' } });
      toast.success('Fee type activated');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this fee type? This action cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Fee type deleted');
      // try to refresh list if available
      if (typeof feeTypesQuery.refetch === 'function') {
        try { await feeTypesQuery.refetch(); } catch (_) { /* ignore */ }
      }
    } catch (e) {
      const msg = (e?.response?.data?.message) || e?.message || '';
      if (/referenc|in use|constraint|linked|foreign/i.test(msg)) {
        toast.error('Cannot delete — this fee type is referenced by other records.');
      } else {
        toast.error(msg || 'Operation failed');
      }
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
              <h3 className="text-2xl font-black text-surface-900 uppercase tracking-tighter">Fee Type Configuration</h3>
              <p className="text-xs font-black text-surface-400 uppercase tracking-[0.2em] mt-1">Personal vs Free</p>
            </div>
          </div>
          <Button onClick={startNew} variant="brand" size="lg" icon={<Plus size={18} strokeWidth={3} />} className="font-black text-xs uppercase tracking-widest">
            Create Fee Type
          </Button>
        </div>
      </Card>

      <Modal isOpen={editingId === 'new' || (typeof editingId === 'string' && editingId !== 'new')} onClose={closeModal} title={editingId === 'new' ? 'Create Fee Type' : 'Edit Fee Type'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Code</label>
              <Input type="text" className="h-11 font-bold" value={formData.code} disabled={editingId !== 'new'} placeholder="e.g. scholarship50" onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} autoFocus />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Status</label>
              <DropdownSelect value={formData.status} onChange={(v) => setFormData((p) => ({ ...p, status: v || 'active' }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} clearable={false} className="h-11 font-black text-xs uppercase" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Display Name</label>
              <Input type="text" className="h-11 font-bold" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Behavior</label>
              <DropdownSelect value={formData.mode} onChange={(v) => setFormData((p) => ({ ...p, mode: v || 'charge' }))} options={[{ value: 'charge', label: 'Regular (Paid)' }, { value: 'waive', label: 'Free (Waive 100%)' }, { value: 'discount', label: 'Scholarship (Discount %)' }]} clearable={false} className="h-11 font-black text-xs uppercase" />
              {String(formData.mode) === 'discount' && (
                <div className="space-y-2 mt-2">
                  <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Discount Percent</label>
                  <Input type="number" min={1} max={100} className="h-11 font-bold" value={formData.discountPercent} onChange={(e) => setFormData((p) => ({ ...p, discountPercent: Number(e.target.value) }))} placeholder="1 - 100" />
                </div>
              )}
            </div>

            <div className="flex items-end justify-end">
              <Button onClick={async () => { if (isSaving) return; const ok = await handleSave(); if (ok) closeModal(); }} variant="primary" size="lg" className="h-11 font-black text-[10px] uppercase tracking-[0.2em]" disabled={isSaving} icon={isSaving ? <Loader2 size={18} className="animate-spin" /> : undefined}>
                {isSaving ? 'Saving...' : 'Save'}
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
          loadingMessage="Initializing..."
          loadingVariant="table"
          loadingRows={6}
          loadingColumns={3}
          emptyTitle="No fee types defined."
          emptyDescription=""
          rows={currentRows}
          columns={[
            { key: 'type', label: 'Fee Type', sortable: false },
            { key: 'status', label: 'Status', sortable: false },
            { key: 'actions', label: 'Actions', sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
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
                  <span className="px-3 py-1.5 bg-surface-100 text-surface-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-surface-200">{ft.code}</span>
                  <span className="font-bold text-surface-900 text-base">{ft.name}</span>
                </div>
              );
            }

            if (col.key === 'status') {
              const dotClass = ft.status === 'active' ? 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'w-2 h-2 rounded-full bg-surface-300';
              return (
                <div className="flex items-center gap-2">
                  <div className={dotClass} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">{ft.status}</span>
                </div>
              );
            }

            if (col.key === 'actions') {
              const actions = [
                { key: 'edit', label: 'Edit', title: 'Edit', tone: 'edit', icon: <Edit size={18} />, onClick: () => startEdit(ft) },
              ];
              actions.push({ key: 'delete', label: 'Delete', title: 'Delete', tone: 'delete', icon: <Trash2 size={18} />, onClick: () => handleDelete(ft._id) });
              return <RowActionButtons actions={actions} />;
            }

            return '';
          }}
        />
      </Card>
    </div>
  );
}
