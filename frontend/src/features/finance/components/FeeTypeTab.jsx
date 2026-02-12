import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Settings, Trash2, Edit, Check, X } from 'lucide-react';
import financeService from '../api/finance';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';

export default function FeeTypeTab() {
  const [loading, setLoading] = useState(true);
  const [feeTypes, setFeeTypes] = useState([]);

  const [editingId, setEditingId] = useState(null); // null | 'new' | id
  const [formData, setFormData] = useState({ code: 'personal', name: 'Personal' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await financeService.getFeeTypes({ includeInactive: true });
      setFeeTypes(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch {
      toast.error('Failed to load fee types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditingId('new');
    setFormData({ code: 'personal', name: 'Personal' });
  };

  const startEdit = (ft) => {
    setEditingId(ft._id);
    setFormData({ code: ft.code, name: ft.name });
  };

  const handleSave = async () => {
    if (!formData.name || !String(formData.name).trim()) return toast.error('Name is required');

    try {
      if (editingId === 'new') {
        await financeService.createFeeType({
          code: String(formData.code).toLowerCase(),
          name: String(formData.name).trim()
        });
        toast.success('Fee type created');
      } else {
        await financeService.updateFeeType(editingId, {
          name: String(formData.name).trim(),
        });
        toast.success('Fee type updated');
      }
      setEditingId(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Operation failed');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this fee type?')) return;
    try {
      await financeService.deleteFeeType(id);
      toast.success('Fee type deactivated');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Operation failed');
    }
  };

  const handleActivate = async (id) => {
    try {
      await financeService.updateFeeType(id, { status: 'active' });
      toast.success('Fee type activated');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Operation failed');
    }
  };

  return (
    <div className="p-8 space-y-8 bg-surface-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
            <Settings size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-surface-900 uppercase tracking-tighter">Fee Type Configuration</h3>
            <p className="text-xs font-black text-surface-400 uppercase tracking-[0.2em] mt-1">Personal vs Free</p>
          </div>
        </div>
          <button
            onClick={startNew}
            className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
          >
            <Plus size={18} strokeWidth={3} /> Create Fee Type
          </button>
        </div>

        {editingId === 'new' && (
          <div className="bg-white border-2 border-primary/20 p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Fee Type</label>
                <select
                  className="w-full h-14 px-6 bg-surface-50 border border-surface-200 rounded-2xl font-black text-xs uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  value={formData.code}
                  onChange={(e) => {
                    const code = e.target.value;
                    setFormData((p) => ({
                      ...p,
                      code,
                      name: code === 'free' ? 'Free' : 'Personal'
                    }));
                  }}
                >
                  <option value="personal">Personal</option>
                  <option value="free">Free</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Display Name</label>
                <input
                  type="text"
                  className="w-full h-14 px-6 bg-surface-50 border border-surface-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingId(null)}
                  className="h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-600 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="h-14 px-10 bg-surface-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all"
                >
                  Synchronize
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="bg-white border border-surface-200 rounded-[2.5rem] overflow-hidden shadow-sm">
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

          rows={feeTypes}
          columns={[
            { key: 'type', label: 'Fee Type', sortable: false },
            { key: 'status', label: 'Status', sortable: false },
            { key: 'actions', label: 'Actions', sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
          ]}
          storageKey="finance:fee-types:columns:v1"
          getRowKey={(row) => row?._id}
          renderCell={(ft, col) => {
            switch (col.key) {
              case 'type':
                return editingId === ft._id ? (
                  <input
                    className="w-full h-11 px-4 bg-white border border-surface-300 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  />
                ) : (
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
                return editingId === ft._id ? (
                  <RowActionButtons
                    actions={[
                      {
                        key: 'cancel',
                        label: 'Cancel',
                        title: 'Cancel',
                        tone: 'delete',
                        icon: <X size={18} />,
                        onClick: () => setEditingId(null),
                      },
                      {
                        key: 'save',
                        label: 'Save',
                        title: 'Save',
                        tone: 'edit',
                        icon: <Check size={18} strokeWidth={3} />,
                        onClick: handleSave,
                      },
                    ]}
                  />
                ) : (
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

          showRowsSelector={false}
          paginationProps={{ className: 'no-print', infoVariant: 'page' }}
        />
      </div>

      <div className="bg-surface-900 p-8 rounded-[2.5rem] flex gap-6 items-start shadow-2xl">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary-400 shrink-0 border border-white/5">
          <Settings size={24} />
        </div>
        <div>
          <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">Note</h4>
          <p className="text-surface-400 text-sm leading-relaxed max-w-4xl">
            Fee Types are separate from Amount Types. Use Personal for normal billing, and Free to waive charges (0 balance).
          </p>
        </div>
      </div>
    </div>
  );
}
