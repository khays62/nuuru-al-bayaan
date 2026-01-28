import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import {
  getExamTemplateVersions,
  getExamTemplateDetail,
  setExamTemplateTotal,
  createExamTemplateComponent,
  updateExamTemplateComponent,
  deleteExamTemplateComponent,
  deleteExamTemplateVersion,
  cloneExamTemplateVersion,
  setActiveExamTemplateVersion,
} from '../api/exams';

export default function ExamSettingsPage() {
  const [templateVersions, setTemplateVersions] = useState([]);
  const [templateVersion, setTemplateVersion] = useState('');

  const [templateDetail, setTemplateDetail] = useState(null);
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false);
  const [templateTotalInput, setTemplateTotalInput] = useState('100');
  const [savedTemplateTotal, setSavedTemplateTotal] = useState('100');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingComponentIds, setSavingComponentIds] = useState(new Set());
  const [deletingComponentIds, setDeletingComponentIds] = useState(new Set());
  const [deletingVersion, setDeletingVersion] = useState(false);
  const [draftEdits, setDraftEdits] = useState({});
  const [newComponent, setNewComponent] = useState({ typeName: '', maxScore: '', order: '' });

  const templateLocked = Boolean(templateDetail?.hasScores);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await getExamTemplateVersions();
      if (!res?.ok) {
        if (!ignore) {
          setTemplateVersions([]);
          setTemplateVersion('');
        }
        return;
      }
      const versions = Array.isArray(res?.data?.versions) ? res.data.versions : [];
      const active = res?.data?.activeVersion;
      if (!ignore) {
        setTemplateVersions(versions);
        if (!templateVersion && active) setTemplateVersion(String(active));
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTemplateVersions = async () => {
    const res = await getExamTemplateVersions();
    if (!res?.ok) return;
    const versions = Array.isArray(res?.data?.versions) ? res.data.versions : [];
    setTemplateVersions(versions);
    const active = res?.data?.activeVersion;
    const selectedOk = versions.some((v) => String(v.templateVersion) === String(templateVersion));
    if ((!templateVersion || !selectedOk) && active) setTemplateVersion(String(active));
  };

  const loadTemplateDetail = async (v, opts = {}) => {
    if (!v) return;
    const { showSpinner = true, resetDraft = true } = opts;
    if (showSpinner) setTemplateDetailLoading(true);
    const res = await getExamTemplateDetail(v);
    if (showSpinner) setTemplateDetailLoading(false);
    if (!res?.ok) {
      if (!templateDetail) setTemplateDetail(null);
      toast.error(res?.error || 'Failed to load template');
      return;
    }
    setTemplateDetail(res.data);
    const totalStr = String(res?.data?.templateTotal ?? 100);
    setTemplateTotalInput(totalStr);
    setSavedTemplateTotal(totalStr);
    if (resetDraft) {
      setDraftEdits({});
      setNewComponent({ typeName: '', maxScore: '', order: '' });
    }
  };

  const isTotalDirty = useMemo(() => {
    const a = Number(templateTotalInput);
    const b = Number(savedTemplateTotal);
    if (Number.isFinite(a) && Number.isFinite(b)) return a !== b;
    return String(templateTotalInput) !== String(savedTemplateTotal);
  }, [templateTotalInput, savedTemplateTotal]);

  useEffect(() => {
    if (!templateVersion) return;
    loadTemplateDetail(templateVersion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateVersion]);

  const canActivate = useMemo(() => {
    if (!templateDetail) return false;
    const sum = Number(templateDetail?.sumMaxScore || 0);
    const total = Number(templateDetail?.templateTotal || 0);
    return sum > 0 && total > 0 && sum === total;
  }, [templateDetail]);

  const draftValidation = useMemo(() => {
    const total = Number(templateTotalInput);
    const totalNum = Number.isFinite(total) && total > 0 ? total : Number(templateDetail?.templateTotal) || 100;

    const components = Array.isArray(templateDetail?.components) ? templateDetail.components : [];
    const effective = components.map((c) => {
      const id = String(c._id);
      const d = draftEdits?.[id];
      const effMax = d?.maxScore ?? c.maxScore;
      const effOrder = d?.order ?? c.order;
      return { id, maxScore: Number(effMax), order: Number(effOrder) };
    });

    const sumMax = effective.reduce((sum, r) => sum + (Number.isFinite(r.maxScore) ? r.maxScore : 0), 0);
    const sumExceedsTotal = Number.isFinite(sumMax) && Number.isFinite(totalNum) ? sumMax > totalNum : false;

    const orderToIds = new Map();
    for (const r of effective) {
      if (!Number.isFinite(r.order) || r.order <= 0) continue;
      const key = String(r.order);
      const arr = orderToIds.get(key) || [];
      arr.push(r.id);
      orderToIds.set(key, arr);
    }
    const duplicateOrderIds = new Set();
    for (const [, ids] of orderToIds.entries()) {
      if (ids.length > 1) ids.forEach((id) => duplicateOrderIds.add(String(id)));
    }

    const newMax = Number(newComponent?.maxScore);
    const newOrder = Number(newComponent?.order);
    const newMaxOk = Number.isFinite(newMax) && newMax > 0;
    const newOrderOk = Number.isFinite(newOrder) && newOrder > 0;
    const newWouldExceed = newMaxOk && Number.isFinite(sumMax) && Number.isFinite(totalNum) ? sumMax + newMax > totalNum : false;
    const newOrderDuplicate = newOrderOk ? orderToIds.has(String(newOrder)) : false;

    return { totalNum, sumMax, sumExceedsTotal, duplicateOrderIds, newWouldExceed, newOrderDuplicate };
  }, [templateDetail, draftEdits, templateTotalInput, newComponent]);

  const handleSaveTemplateTotal = async () => {
    if (!templateVersion) return;
    if (templateLocked) {
      toast.error('This template already has scores and is locked. Total cannot be edited.');
      return;
    }
    if (!isTotalDirty) return;
    const total = Number(templateTotalInput);
    if (!Number.isFinite(total) || total <= 0) {
      toast.error('Total must be > 0');
      return;
    }
    setSavingTemplate(true);
    const res = await setExamTemplateTotal({ templateVersion, templateTotal: total });
    setSavingTemplate(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || 'Failed to save total');
      return;
    }
    setTemplateDetail((prev) =>
      prev
        ? {
            ...prev,
            templateTotal: Number(res?.data?.templateTotal ?? total),
            sumMaxScore: Number(res?.data?.sumMaxScore ?? prev.sumMaxScore),
            isActive: Boolean(res?.data?.isActive ?? prev.isActive),
          }
        : prev
    );
    setSavedTemplateTotal(String(Number(res?.data?.templateTotal ?? total)));
    toast.success('Saved');
  };

  const handleClone = async () => {
    if (!templateVersion) return;
    setSavingTemplate(true);
    const res = await cloneExamTemplateVersion(Number(templateVersion));
    setSavingTemplate(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || 'Clone failed');
      return;
    }
    await refreshTemplateVersions();
    const next = String(res?.data?.templateVersion || '');
    if (next) setTemplateVersion(next);
    toast.success(`Cloned to v${next}`);
  };

  const handleActivate = async () => {
    if (!templateVersion) return;
    setSavingTemplate(true);
    const res = await setActiveExamTemplateVersion(Number(templateVersion));
    setSavingTemplate(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || 'Activate failed');
      return;
    }
    await refreshTemplateVersions();
    setTemplateDetail((prev) => (prev ? { ...prev, isActive: true } : prev));
    toast.success('Default template updated');
  };

  const applyDraft = async (id) => {
    if (templateLocked) {
      toast.error('This template already has scores and is locked. Columns cannot be edited.');
      return;
    }
    const draft = draftEdits?.[id];
    if (!draft) return;
    const typeName = String(draft.typeName ?? '').trim();
    const maxScore = Number(draft.maxScore);
    const order = Number(draft.order);
    if (!typeName) return toast.error('Name is required');
    if (!Number.isFinite(maxScore) || maxScore <= 0) return toast.error('Max score must be > 0');
    if (!Number.isFinite(order) || order <= 0) return toast.error('Order must be > 0');
    if (draftValidation.sumExceedsTotal) return toast.error('Sum of max scores cannot exceed the declared total');
    if (draftValidation.duplicateOrderIds.has(String(id))) return toast.error('Order must be unique');

    setSavingComponentIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
    const res = await updateExamTemplateComponent({ id, typeName, maxScore, order });
    setSavingComponentIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
    if (!res?.ok) {
      toast.error(res?.data?.message || 'Save failed');
      return;
    }

    setTemplateDetail((prev) => {
      if (!prev) return prev;
      const updated = res?.data?.component;
      const components = Array.isArray(prev.components)
        ? prev.components.map((c) => (String(c._id) === String(id) ? { ...c, ...updated } : c))
        : prev.components;
      return {
        ...prev,
        components,
        sumMaxScore: Number(res?.data?.sumMaxScore ?? prev.sumMaxScore),
        templateTotal: Number(res?.data?.templateTotal ?? prev.templateTotal),
      };
    });

    setDraftEdits((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
    toast.success('Saved');
  };

  const addComponent = async () => {
    if (templateDetail?.hasScores) {
      toast.error('This template already has scores. Clone a new template to add columns.');
      return;
    }
    const typeName = String(newComponent.typeName || '').trim();
    const maxScore = Number(newComponent.maxScore);
    const order = Number(newComponent.order);
    if (!typeName) return toast.error('Name is required');
    if (!Number.isFinite(maxScore) || maxScore <= 0) return toast.error('Max score must be > 0');
    if (!Number.isFinite(order) || order <= 0) return toast.error('Order must be > 0');
    if (draftValidation.newWouldExceed) return toast.error('Max score exceeds declared total');
    if (draftValidation.newOrderDuplicate) return toast.error('Order must be unique');

    setSavingTemplate(true);
    const res = await createExamTemplateComponent({
      templateVersion: Number(templateVersion),
      typeName,
      maxScore,
      order,
    });
    setSavingTemplate(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || 'Add failed');
      return;
    }

    setTemplateDetail((prev) => {
      if (!prev) return prev;
      const nextComp = res?.data?.component;
      const components = Array.isArray(prev.components) ? [...prev.components, nextComp].filter(Boolean) : prev.components;
      return {
        ...prev,
        components,
        sumMaxScore: Number(res?.data?.sumMaxScore ?? prev.sumMaxScore),
        templateTotal: Number(res?.data?.templateTotal ?? prev.templateTotal),
      };
    });

    setNewComponent({ typeName: '', maxScore: '', order: '' });
    toast.success('Added');
  };

  const handleDeleteComponent = async (id) => {
    if (!id) return;
    const comp = templateDetail?.components?.find((c) => String(c._id) === String(id));
    if (comp?.hasScores) {
      toast.error('Cannot delete: this column has saved scores');
      return;
    }
    if (!window.confirm('Delete this column? This cannot be undone.')) return;

    setDeletingComponentIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
    const res = await deleteExamTemplateComponent(String(id));
    setDeletingComponentIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });

    if (!res?.ok) {
      toast.error(res?.data?.message || 'Delete failed');
      return;
    }

    setTemplateDetail((prev) => {
      if (!prev) return prev;
      const components = Array.isArray(prev.components) ? prev.components.filter((c) => String(c._id) !== String(id)) : prev.components;
      return {
        ...prev,
        components,
        sumMaxScore: Number(res?.data?.sumMaxScore ?? prev.sumMaxScore),
        templateTotal: Number(res?.data?.templateTotal ?? prev.templateTotal),
      };
    });

    setDraftEdits((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
    toast.success('Deleted');
  };

  const handleDeleteVersion = async () => {
    if (!templateVersion) return;
    if (templateDetail?.isActive) {
      toast.error('Cannot delete the default (active) template');
      return;
    }
    if (templateDetail?.hasScores) {
      toast.error('Cannot delete: this template has saved scores');
      return;
    }
    if (!window.confirm(`Delete template v${templateVersion}? This cannot be undone.`)) return;

    setDeletingVersion(true);
    const res = await deleteExamTemplateVersion(Number(templateVersion));
    setDeletingVersion(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || 'Delete template failed');
      return;
    }
    await refreshTemplateVersions();
    setTemplateDetail(null);
    setDraftEdits({});
    toast.success(`Deleted template v${templateVersion}`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-40">
            <DropdownSelect
              id="exam-settings-version"
              name="exam-settings-version"
              value={templateVersion}
              onChange={setTemplateVersion}
              placeholder="Template"
              options={(templateVersions || []).map((v) => ({
                value: String(v.templateVersion),
                label: `v${v.templateVersion}${v.isActive ? ' (default)' : ''}`,
              }))}
            />
          </div>

          <div className="min-w-40">
            <label className="block text-xs text-gray-600 mb-1">Declared Total</label>
            <Input
              type="number"
              min={1}
              className={draftValidation.sumExceedsTotal ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-slate-900'}
              value={templateTotalInput}
              onChange={(e) => setTemplateTotalInput(e.target.value)}
              disabled={savingTemplate || templateLocked}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <ActionButton
              variant="primary"
              onClick={handleSaveTemplateTotal}
              disabled={savingTemplate || !templateVersion || templateLocked || !isTotalDirty}
            >
              Save Total
            </ActionButton>
            <ActionButton variant="secondary" onClick={handleClone} disabled={savingTemplate || !templateVersion}>
              Clone to New Template
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={handleActivate}
              disabled={savingTemplate || !templateVersion || !canActivate || Boolean(templateDetail?.isActive)}
            >
              Set as Default
            </ActionButton>
            <ActionButton
              variant="danger"
              onClick={handleDeleteVersion}
              disabled={savingTemplate || deletingVersion || !templateVersion || templateDetail?.isActive || templateDetail?.hasScores}
            >
              Delete Template
            </ActionButton>
          </div>
        </div>

        {!templateDetail ? (
          templateDetailLoading ? (
            <div className="text-sm text-gray-500">Loading template…</div>
          ) : (
            <div className="text-sm text-gray-500">Select a template to edit.</div>
          )
        ) : (
          <>
            {templateDetailLoading ? <div className="text-xs text-gray-500">Refreshing…</div> : null}
            <div className="text-sm text-gray-700">
              Template <span className="font-semibold">v{templateDetail.templateVersion}</span>
              {templateDetail.isActive ? (
                <span className="ml-2 text-xs px-2 py-1 rounded border bg-gray-900 text-white border-gray-900">Default</span>
              ) : null}
              <span className="ml-3">
                Sum Max:{' '}
                <span className={`font-semibold ${canActivate ? 'text-green-700' : 'text-red-700'}`}>{templateDetail.sumMaxScore}</span>
                {' '} / Total: <span className="font-semibold">{templateDetail.templateTotal}</span>
              </span>
              {!canActivate ? <span className="ml-2 text-xs text-red-700">(Must match to activate)</span> : null}
            </div>

            {templateDetail.hasScores ? (
              <div className="text-xs text-gray-600">
                This template already has saved scores and is locked. You cannot edit total or columns. You may delete columns that have no scores,
                or use “Clone to New Template”.
              </div>
            ) : null}

            <div className="overflow-auto">
              <StandardTable
                isLoading={false}
                items={templateDetail.components || []}
                emptyTitle="No components."
                emptyDescription="Add a component to this template."
                rows={[...(templateDetail.components || []), { __type: 'new', _id: '__new' }]}
                columns={[
                  {
                    key: 'typeName',
                    label: 'Name',
                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                    tdClassName: 'px-4 py-2 border-x border-gray-200',
                  },
                  {
                    key: 'maxScore',
                    label: 'Max Score',
                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                    tdClassName: 'px-4 py-2 border-x border-gray-200',
                  },
                  {
                    key: 'order',
                    label: 'Order',
                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                    tdClassName: 'px-4 py-2 border-x border-gray-200',
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                    tdClassName: 'px-4 py-2 border-x border-gray-200',
                  },
                ]}
                getRowKey={(c) => String(c?._id || c?.id || '__row')}
                renderCell={(c, col) => {
                  const isNew = c?.__type === 'new';

                  if (isNew) {
                    switch (col.key) {
                      case 'typeName':
                        return (
                          <input
                            type="text"
                            placeholder="New column name"
                            value={newComponent.typeName}
                            onChange={(e) => setNewComponent((p) => ({ ...p, typeName: e.target.value }))}
                            disabled={savingTemplate || templateLocked}
                            className="w-56 border rounded-md px-2 py-1 text-sm border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-0"
                          />
                        );
                      case 'maxScore':
                        return (
                          <input
                            type="number"
                            min={1}
                            placeholder="Max"
                            value={newComponent.maxScore}
                            onChange={(e) => setNewComponent((p) => ({ ...p, maxScore: e.target.value }))}
                            disabled={savingTemplate || templateLocked}
                            className={`w-32 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 ${
                              draftValidation.newWouldExceed ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-900'
                            }`}
                          />
                        );
                      case 'order':
                        return (
                          <input
                            type="number"
                            min={1}
                            placeholder="Order"
                            value={newComponent.order}
                            onChange={(e) => setNewComponent((p) => ({ ...p, order: e.target.value }))}
                            disabled={savingTemplate || templateLocked}
                            className={`w-24 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 ${
                              draftValidation.newOrderDuplicate ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-900'
                            }`}
                          />
                        );
                      case 'actions':
                        return (
                          <ActionButton
                            variant="primary"
                            onClick={addComponent}
                            disabled={savingTemplate || templateLocked || draftValidation.newWouldExceed || draftValidation.newOrderDuplicate}
                          >
                            Add
                          </ActionButton>
                        );
                      default:
                        return '';
                    }
                  }

                  const id = String(c._id);
                  const draft = draftEdits?.[id] || {};
                  const typeName = draft.typeName ?? c.typeName;
                  const maxScore = draft.maxScore ?? c.maxScore;
                  const order = draft.order ?? c.order;
                  const isSavingRow = savingComponentIds.has(id);
                  const isDeletingRow = deletingComponentIds.has(id);
                  const isEditingMax = String(maxScore) !== String(c.maxScore);
                  const maxInvalid = templateLocked ? false : draftValidation.sumExceedsTotal && isEditingMax;
                  const orderInvalid = templateLocked ? false : draftValidation.duplicateOrderIds.has(id);

                  switch (col.key) {
                    case 'typeName':
                      return (
                        <input
                          type="text"
                          value={typeName}
                          disabled={savingTemplate || templateLocked}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], typeName: e.target.value, maxScore, order },
                            }))
                          }
                          className="w-56 border rounded-md px-2 py-1 text-sm border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-0"
                        />
                      );
                    case 'maxScore':
                      return (
                        <input
                          type="number"
                          min={1}
                          value={maxScore}
                          disabled={savingTemplate || templateLocked}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], typeName, maxScore: e.target.value, order },
                            }))
                          }
                          className={`w-28 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 ${
                            maxInvalid ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-900'
                          }`}
                        />
                      );
                    case 'order':
                      return (
                        <input
                          type="number"
                          min={1}
                          value={order}
                          disabled={savingTemplate || templateLocked}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], typeName, maxScore, order: e.target.value },
                            }))
                          }
                          className={`w-20 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 ${
                            orderInvalid ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-900'
                          }`}
                        />
                      );
                    case 'actions':
                      return (
                        <div className="flex items-center gap-2">
                          <ActionButton
                            variant="primary"
                            onClick={() => applyDraft(id)}
                            disabled={
                              savingTemplate ||
                              isSavingRow ||
                              isDeletingRow ||
                              templateLocked ||
                              draftValidation.sumExceedsTotal ||
                              draftValidation.duplicateOrderIds.has(id)
                            }
                          >
                            Save
                          </ActionButton>
                          <ActionButton
                            variant="danger"
                            onClick={() => handleDeleteComponent(id)}
                            disabled={savingTemplate || isSavingRow || isDeletingRow || (c?.hasScores ?? false)}
                          >
                            Delete
                          </ActionButton>
                          {c?.hasScores ? <span className="text-xs text-gray-500">Has scores</span> : null}
                        </div>
                      );
                    default:
                      return '';
                  }
                }}
                tableProps={{
                  theadClassName: 'bg-gray-800',
                  useDefaultHeaderStyles: false,
                  baseRowClassName: 'border-t border-gray-200 bg-white hover:bg-gray-50 transition-colors',
                  rowClassName: (row) => (row?.__type === 'new' ? 'bg-gray-50' : ''),
                }}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
