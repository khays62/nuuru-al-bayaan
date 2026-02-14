import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Settings, Trash2, Edit, Check } from 'lucide-react';

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

  // Only show skeleton on the initial load; keep rows visible on background refetch.
  const loading = Boolean(feeTypesQuery.isLoading);
  const feeTypes = Array.isArray(feeTypesQuery.data) ? feeTypesQuery.data : [];

  const [editingId, setEditingId] = useState(null); // null | 'new' | id
  const [formData, setFormData] = useState({ code: 'personal', name: 'Personal' });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [feeTypes.length]);

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
    setFormData({ code: 'personal', name: 'Personal' });
  };

  const startEdit = (ft) => {
    setEditingId(ft._id);
    setFormData({ code: ft.code, name: ft.name });
  };

  const closeModal = () => {
    setEditingId(null);
    setFormData({ code: 'personal', name: 'Personal' });
  };

  const handleSave = async () => {
    if (!formData.name || !String(formData.name).trim()) {
      toast.error('Name is required');
      return false;
    }

    try {
      if (editingId === 'new') {
        await createMutation.mutateAsync({
          code: String(formData.code).toLowerCase(),
          name: String(formData.name).trim()
        });
        toast.success('Fee type created');
      } else {
        await updateMutation.mutateAsync({
          id: editingId,
          payload: {
          name: String(formData.name).trim(),
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
          <Button
            onClick={startNew}
            variant="brand"
            size="lg"
            icon={<Plus size={18} strokeWidth={3} />}
            className="font-black text-xs uppercase tracking-widest"
          >
            Create Fee Type
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={editingId === 'new' || (typeof editingId === 'string' && editingId !== 'new')}
        onClose={closeModal}
        title={editingId === 'new' ? 'Create Fee Type' : 'Edit Fee Type'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Fee Type</label>
              <DropdownSelect
                value={formData.code}
                disabled={editingId !== 'new'}
                onChange={(code) => {
                  setFormData((p) => ({
                    ...p,
                    code,
                    name: code === 'free' ? 'Free' : 'Personal'
                  }));
                }}
                options={[
                  { value: 'personal', label: 'Personal' },
                  { value: 'free', label: 'Free' },
                ]}
                clearable={false}
                className="h-11 font-black text-xs uppercase"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Display Name</label>
              <Input
                type="text"
                className="h-11 font-bold"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={closeModal}
              variant="neutral"
              size="lg"
              className="h-11 font-black text-[10px] uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const ok = await handleSave();
                if (ok) closeModal();
              }}
              variant="primary"
              size="lg"
              className="h-11 font-black text-[10px] uppercase tracking-[0.2em]"
            >
              Save
            </Button>
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
            switch (col.key) {
              case 'type':
                return (
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-surface-100 text-surface-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-surface-200">
                      {ft.code}
                    </span>
                    <span className="font-bold text-surface-900 text-base">{ft.name}</span>
                  </div>
                );
              case 'status':
                return (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ft.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-surface-300'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">{ft.status}</span>
                  </div>
                );
              case 'actions':
                return (
                  <RowActionButtons
                    actions={[
                      {
                        key: 'edit',
                        label: 'Edit',
                        title: 'Edit',
                        tone: 'edit',
                        icon: <Edit size={18} />,
                        onClick: () => startEdit(ft),
                      },
                      ft.status === 'active'
                        ? {
                            key: 'deactivate',
                            label: 'Deactivate',
                            title: 'Deactivate',
                            tone: 'delete',
                            icon: <Trash2 size={18} />,
                            onClick: () => handleDeactivate(ft._id),
                          }
                        : {
                            key: 'activate',
                            label: 'Activate',
                            title: 'Activate',
                            tone: 'edit',
                            icon: <Check size={18} />,
                            onClick: () => handleActivate(ft._id),
                          },
                    ]}
                  />
                );
              default:
                return '';
            }
          }}

          meta={{ page: safePage, totalPages, limit, total }}
          onPage={setPage}
          onLimit={(v) => { setLimit(v); setPage(1); }}
          showRowsSelector={false}
          paginationProps={{ className: 'no-print', infoVariant: 'page' }}
        />
      </Card>
    </div>
  );
}
