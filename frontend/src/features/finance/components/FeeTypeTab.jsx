import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Settings, Trash2, Edit, Check, X } from 'lucide-react';
import financeService from '../api/finance';

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
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-50 border-b border-surface-200">
            <tr className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">
              <th className="p-6 pl-10">Fee Type</th>
              <th className="p-6">Status</th>
              <th className="p-6 text-right pr-10">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              <tr><td colSpan="3" className="p-20 text-center text-surface-400 font-black italic tracking-[0.2em] animate-pulse">Initializing...</td></tr>
            ) : feeTypes.length === 0 ? (
              <tr><td colSpan="3" className="p-20 text-center text-surface-300 font-bold uppercase tracking-widest">No fee types defined.</td></tr>
            ) : feeTypes.map((ft) => (
              <tr key={ft._id} className="hover:bg-surface-50/50 transition-all group">
                <td className="p-6 pl-10">
                  {editingId === ft._id ? (
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
                  )}
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ft.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-surface-300'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">{ft.status}</span>
                  </div>
                </td>
                <td className="p-6 text-right pr-10">
                  {editingId === ft._id ? (
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditingId(null)} className="w-10 h-10 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all"><X size={18} /></button>
                      <button onClick={handleSave} className="w-10 h-10 bg-green-500 text-white shadow-lg shadow-green-200 rounded-xl flex items-center justify-center transition-all scale-110"><Check size={18} strokeWidth={3} /></button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
                      <button onClick={() => startEdit(ft)} className="w-10 h-10 bg-surface-50 text-surface-400 hover:text-primary hover:bg-primary-50 rounded-xl flex items-center justify-center transition-all"><Edit size={18} /></button>
                      {ft.status === 'active' ? (
                        <button onClick={() => handleDeactivate(ft._id)} className="w-10 h-10 bg-surface-50 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all"><Trash2 size={18} /></button>
                      ) : (
                        <button onClick={() => handleActivate(ft._id)} className="w-10 h-10 bg-surface-50 text-surface-400 hover:text-green-600 hover:bg-green-50 rounded-xl flex items-center justify-center transition-all"><Check size={18} /></button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
