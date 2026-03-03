import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
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
import { examKeys } from '../queryKeys';
import { useExamsRealtimeInvalidation } from '../useExamsRealtimeInvalidation';

export default function ExamSettingsPage() {
  const { t } = useI18n();
  const { auth, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const role = String(auth?.user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const canEditTemplate = isAdmin || hasPermission('exams', 'input');

  // EDCI: Realtime -> exam/result events -> invalidate queries -> UI updates.
  useExamsRealtimeInvalidation({ enabled: true });

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

  const templateVersionsQuery = useQuery({
    queryKey: examKeys.templateVersions(),
    queryFn: async ({ signal }) => {
      const res = await getExamTemplateVersions({ signal });
      if (!res?.ok) throw new Error(res?.error || t('exams.settings.errors.loadTemplateVersionsFailed'));
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const data = templateVersionsQuery.data;
    if (!data) return;

    const versions = Array.isArray(data?.versions) ? data.versions : [];
    const active = data?.activeVersion;

    setTemplateVersions(versions);

    const selectedOk = versions.some((v) => String(v?.templateVersion) === String(templateVersion));
    if ((!templateVersion || !selectedOk) && active) {
      setTemplateVersion(String(active));
    }
  }, [templateVersionsQuery.data, templateVersion]);

  const refreshTemplateVersions = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: examKeys.templateVersions(), refetchType: 'active' });
    } catch {
      // ignore
    }
  };

  const loadTemplateDetail = async (v, opts = {}) => {
    if (!v) return;
    const { showSpinner = true, resetDraft = true } = opts;
    if (showSpinner) setTemplateDetailLoading(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: examKeys.templateDetail(v),
        queryFn: async ({ signal }) => {
          const res = await getExamTemplateDetail(v, { signal });
          if (!res?.ok) throw new Error(res?.error || t('exams.settings.errors.loadTemplateFailed'));
          return res.data;
        },
        staleTime: 0,
      });

      setTemplateDetail(data);
      const totalStr = String(data?.templateTotal ?? 100);
      setTemplateTotalInput(totalStr);
      setSavedTemplateTotal(totalStr);
      if (resetDraft) {
        setDraftEdits({});
        setNewComponent({ typeName: '', maxScore: '', order: '' });
      }
    } catch (e) {
      if (String(e?.message || '') !== 'Aborted') {
        if (!templateDetail) setTemplateDetail(null);
        toast.error(e?.message || t('exams.settings.errors.loadTemplateFailed'));
      }
    } finally {
      if (showSpinner) setTemplateDetailLoading(false);
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
    if (!canEditTemplate) {
      toast.error(t('exams.settings.errors.noPermissionEditTemplates'));
      return;
    }
    if (!templateVersion) return;
    if (templateLocked) {
      toast.error(t('exams.settings.errors.templateLockedTotal'));
      return;
    }
    if (!isTotalDirty) return;
    const total = Number(templateTotalInput);
    if (!Number.isFinite(total) || total <= 0) {
      toast.error(t('exams.settings.errors.totalMustBeGt0'));
      return;
    }
    setSavingTemplate(true);
    const res = await setExamTemplateTotal({ templateVersion, templateTotal: total });
    setSavingTemplate(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || t('exams.settings.errors.saveTotalFailed'));
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
    toast.success(t('common.actions.save'));
  };

  const handleClone = async () => {
    if (!canEditTemplate) {
      toast.error(t('exams.settings.errors.noPermissionEditTemplates'));
      return;
    }
    if (!templateVersion) return;
    setSavingTemplate(true);
    const res = await cloneExamTemplateVersion(Number(templateVersion));
    setSavingTemplate(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || t('exams.settings.errors.cloneFailed'));
      return;
    }
    await refreshTemplateVersions();
    const next = String(res?.data?.templateVersion || '');
    if (next) setTemplateVersion(next);
    toast.success(t('exams.settings.toasts.clonedToVersion', { version: next }));
  };

  const handleActivate = async () => {
    if (!canEditTemplate) {
      toast.error(t('exams.settings.errors.noPermissionEditTemplates'));
      return;
    }
    if (!templateVersion) return;
    setSavingTemplate(true);
    const res = await setActiveExamTemplateVersion(Number(templateVersion));
    setSavingTemplate(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || t('exams.settings.errors.activateFailed'));
      return;
    }
    await refreshTemplateVersions();
    setTemplateDetail((prev) => (prev ? { ...prev, isActive: true } : prev));
    toast.success(t('exams.settings.toasts.defaultTemplateUpdated'));
  };

  const applyDraft = async (id) => {
    if (!canEditTemplate) {
      toast.error(t('exams.settings.errors.noPermissionEditTemplates'));
      return;
    }
    if (templateLocked) {
      toast.error(t('exams.settings.errors.templateLockedColumns'));
      return;
    }
    const draft = draftEdits?.[id];
    if (!draft) return;
    const typeName = String(draft.typeName ?? '').trim();
    const maxScore = Number(draft.maxScore);
    const order = Number(draft.order);
    if (!typeName) return toast.error(t('exams.settings.errors.nameRequired'));
    if (!Number.isFinite(maxScore) || maxScore <= 0) return toast.error(t('exams.settings.errors.maxScoreMustBeGt0'));
    if (!Number.isFinite(order) || order <= 0) return toast.error(t('exams.settings.errors.orderMustBeGt0'));
    if (draftValidation.sumExceedsTotal) return toast.error(t('exams.settings.errors.sumMaxCannotExceedTotal'));
    if (draftValidation.duplicateOrderIds.has(String(id))) return toast.error(t('exams.settings.errors.orderMustBeUnique'));

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
      toast.error(res?.data?.message || t('exams.settings.errors.saveFailed'));
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
    toast.success(t('common.actions.save'));
  };

  const addComponent = async () => {
    if (!canEditTemplate) {
      toast.error(t('exams.settings.errors.noPermissionEditTemplates'));
      return;
    }
    if (templateDetail?.hasScores) {
      toast.error(t('exams.settings.errors.templateHasScoresCloneToAdd'));
      return;
    }
    const typeName = String(newComponent.typeName || '').trim();
    const maxScore = Number(newComponent.maxScore);
    const order = Number(newComponent.order);
    if (!typeName) return toast.error(t('exams.settings.errors.nameRequired'));
    if (!Number.isFinite(maxScore) || maxScore <= 0) return toast.error(t('exams.settings.errors.maxScoreMustBeGt0'));
    if (!Number.isFinite(order) || order <= 0) return toast.error(t('exams.settings.errors.orderMustBeGt0'));
    if (draftValidation.newWouldExceed) return toast.error(t('exams.settings.errors.maxScoreExceedsTotal'));
    if (draftValidation.newOrderDuplicate) return toast.error(t('exams.settings.errors.orderMustBeUnique'));

    setSavingTemplate(true);
    const res = await createExamTemplateComponent({
      templateVersion: Number(templateVersion),
      typeName,
      maxScore,
      order,
    });
    setSavingTemplate(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || t('exams.settings.errors.addFailed'));
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
    toast.success(t('common.actions.add'));
  };

  const handleDeleteComponent = async (id) => {
    if (!canEditTemplate) {
      toast.error(t('exams.settings.errors.noPermissionEditTemplates'));
      return;
    }
    if (!id) return;
    const comp = templateDetail?.components?.find((c) => String(c._id) === String(id));
    if (comp?.hasScores) {
      toast.error(t('exams.settings.errors.cannotDeleteColumnHasScores'));
      return;
    }
    if (!window.confirm(t('exams.settings.confirms.deleteColumn'))) return;

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
      toast.error(res?.data?.message || t('exams.settings.errors.deleteFailed'));
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
    toast.success(t('exams.settings.toasts.deleted'));
  };

  const handleDeleteVersion = async () => {
    if (!canEditTemplate) {
      toast.error(t('exams.settings.errors.noPermissionEditTemplates'));
      return;
    }
    if (!templateVersion) return;
    if (templateDetail?.isActive) {
      toast.error(t('exams.settings.errors.cannotDeleteDefaultTemplate'));
      return;
    }
    if (templateDetail?.hasScores) {
      toast.error(t('exams.settings.errors.cannotDeleteTemplateHasScores'));
      return;
    }
    if (!window.confirm(t('exams.settings.confirms.deleteTemplateVersion', { version: templateVersion }))) return;

    setDeletingVersion(true);
    const res = await deleteExamTemplateVersion(Number(templateVersion));
    setDeletingVersion(false);
    if (!res?.ok) {
      toast.error(res?.data?.message || t('exams.settings.errors.deleteTemplateFailed'));
      return;
    }
    await refreshTemplateVersions();
    setTemplateDetail(null);
    setDraftEdits({});
    toast.success(t('exams.settings.toasts.deletedTemplateVersion', { version: templateVersion }));
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
              placeholder={t('exams.settings.placeholders.template')}
              options={(templateVersions || []).map((v) => ({
                value: String(v.templateVersion),
                label: `v${v.templateVersion}${v.isActive ? t('exams.settings.labels.defaultSuffix') : ''}`,
              }))}
            />
          </div>

          <div className="min-w-40">
            <label className="block text-xs text-(--nb-color-muted) mb-1">{t('exams.settings.labels.declaredTotal')}</label>
            <Input
              type="number"
              min={1}
              className={draftValidation.sumExceedsTotal ? 'border-red-500 focus-visible:ring-red-500' : ''}
              value={templateTotalInput}
              onChange={(e) => setTemplateTotalInput(e.target.value)}
              disabled={savingTemplate || templateLocked || !canEditTemplate}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <ActionButton
              variant="primary"
              onClick={handleSaveTemplateTotal}
              disabled={savingTemplate || !templateVersion || templateLocked || !isTotalDirty || !canEditTemplate}
            >
              {t('exams.settings.actions.saveTotal')}
            </ActionButton>
            <ActionButton variant="secondary" onClick={handleClone} disabled={savingTemplate || !templateVersion || !canEditTemplate}>
              {t('exams.settings.actions.cloneToNewTemplate')}
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={handleActivate}
              disabled={savingTemplate || !templateVersion || !canActivate || Boolean(templateDetail?.isActive) || !canEditTemplate}
            >
              {t('exams.settings.actions.setAsDefault')}
            </ActionButton>
            <ActionButton
              variant="danger"
              onClick={handleDeleteVersion}
              disabled={savingTemplate || deletingVersion || !templateVersion || templateDetail?.isActive || templateDetail?.hasScores || !canEditTemplate}
            >
              {t('exams.settings.actions.deleteTemplate')}
            </ActionButton>
          </div>
        </div>

        {!templateDetail ? (
          templateDetailLoading ? (
            <div className="text-sm text-(--nb-color-muted)">{t('exams.settings.states.loadingTemplate')}</div>
          ) : (
            <div className="text-sm text-(--nb-color-muted)">{t('exams.settings.hints.selectTemplateToEdit')}</div>
          )
        ) : (
          <>
            {templateDetailLoading ? <div className="text-xs text-(--nb-color-muted)">{t('exams.settings.states.refreshing')}</div> : null}
            <div className="text-sm text-(--nb-color-text)">
              {t('exams.settings.labels.templateWithVersion')} <span className="font-semibold">v{templateDetail.templateVersion}</span>
              {templateDetail.isActive ? (
                <span className="ml-2 text-xs px-2 py-1 rounded border bg-(--nb-color-brand) text-white border-(--nb-color-brand)">{t('exams.settings.labels.defaultBadge')}</span>
              ) : null}
              <span className="ml-3">
                {t('exams.settings.labels.sumMax')}:{' '}
                <span className={`font-semibold ${canActivate ? 'text-green-700' : 'text-red-700'}`}>{templateDetail.sumMaxScore}</span>
                {' '} / {t('exams.settings.labels.total')}: <span className="font-semibold">{templateDetail.templateTotal}</span>
              </span>
              {!canActivate ? <span className="ml-2 text-xs text-red-700">{t('exams.settings.hints.mustMatchToActivate')}</span> : null}
            </div>

            {templateDetail.hasScores ? (
              <div className="text-xs text-(--nb-color-muted)">
                {t('exams.settings.hints.templateLockedHelp')}
              </div>
            ) : null}

            <div className="overflow-auto">
              <StandardTable
                isLoading={false}
                items={templateDetail.components || []}
                emptyTitle={t('exams.settings.table.emptyTitle')}
                emptyDescription={t('exams.settings.table.emptyDescription')}
                rows={[...(templateDetail.components || []), { __type: 'new', _id: '__new' }]}
                columns={[
                  {
                    key: 'typeName',
                    label: t('exams.settings.table.columns.name'),
                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
                    tdClassName: 'px-4 py-2 border-x border-(--nb-color-border)',
                  },
                  {
                    key: 'maxScore',
                    label: t('exams.settings.table.columns.maxScore'),
                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
                    tdClassName: 'px-4 py-2 border-x border-(--nb-color-border)',
                  },
                  {
                    key: 'order',
                    label: t('common.table.order'),
                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
                    tdClassName: 'px-4 py-2 border-x border-(--nb-color-border)',
                  },
                  {
                    key: 'actions',
                    label: t('common.table.actions'),
                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
                    tdClassName: 'px-4 py-2 border-x border-(--nb-color-border)',
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
                            placeholder={t('exams.settings.placeholders.newColumnName')}
                            value={newComponent.typeName}
                            onChange={(e) => setNewComponent((p) => ({ ...p, typeName: e.target.value }))}
                            disabled={savingTemplate || templateLocked || !canEditTemplate}
                            className="w-56 border rounded-md px-2 py-1 text-sm bg-(--nb-color-bg-card) text-(--nb-color-fg) border-(--nb-color-border) focus:border-(--nb-color-brand) focus:outline-none focus:ring-0"
                          />
                        );
                      case 'maxScore':
                        return (
                          <input
                            type="number"
                            min={1}
                            placeholder={t('exams.settings.placeholders.max')}
                            value={newComponent.maxScore}
                            onChange={(e) => setNewComponent((p) => ({ ...p, maxScore: e.target.value }))}
                            disabled={savingTemplate || templateLocked || !canEditTemplate}
                            className={`w-32 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 ${
                              draftValidation.newWouldExceed ? 'border-red-500 focus:border-red-500' : 'bg-(--nb-color-bg-card) text-(--nb-color-fg) border-(--nb-color-border) focus:border-(--nb-color-brand)'
                            }`}
                          />
                        );
                      case 'order':
                        return (
                          <input
                            type="number"
                            min={1}
                            placeholder={t('common.table.order')}
                            value={newComponent.order}
                            onChange={(e) => setNewComponent((p) => ({ ...p, order: e.target.value }))}
                            disabled={savingTemplate || templateLocked || !canEditTemplate}
                            className={`w-24 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 ${
                              draftValidation.newOrderDuplicate ? 'border-red-500 focus:border-red-500' : 'bg-(--nb-color-bg-card) text-(--nb-color-fg) border-(--nb-color-border) focus:border-(--nb-color-brand)'
                            }`}
                          />
                        );
                      case 'actions':
                        return (
                          <ActionButton
                            variant="primary"
                            onClick={addComponent}
                            disabled={savingTemplate || templateLocked || draftValidation.newWouldExceed || draftValidation.newOrderDuplicate || !canEditTemplate}
                          >
                            {t('common.actions.add')}
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
                          disabled={savingTemplate || templateLocked || !canEditTemplate}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], typeName: e.target.value, maxScore, order },
                            }))
                          }
                          className="w-56 border rounded-md px-2 py-1 text-sm bg-(--nb-color-bg-card) text-(--nb-color-fg) border-(--nb-color-border) focus:border-(--nb-color-brand) focus:outline-none focus:ring-0"
                        />
                      );
                    case 'maxScore':
                      return (
                        <input
                          type="number"
                          min={1}
                          value={maxScore}
                          disabled={savingTemplate || templateLocked || !canEditTemplate}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], typeName, maxScore: e.target.value, order },
                            }))
                          }
                          className={`w-28 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 ${
                            maxInvalid ? 'border-red-500 focus:border-red-500' : 'bg-(--nb-color-bg-card) text-(--nb-color-fg) border-(--nb-color-border) focus:border-(--nb-color-brand)'
                          }`}
                        />
                      );
                    case 'order':
                      return (
                        <input
                          type="number"
                          min={1}
                          value={order}
                          disabled={savingTemplate || templateLocked || !canEditTemplate}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [id]: { ...prev[id], typeName, maxScore, order: e.target.value },
                            }))
                          }
                          className={`w-20 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 ${
                            orderInvalid ? 'border-red-500 focus:border-red-500' : 'bg-(--nb-color-bg-card) text-(--nb-color-fg) border-(--nb-color-border) focus:border-(--nb-color-brand)'
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
                              draftValidation.duplicateOrderIds.has(id) ||
                              !canEditTemplate
                            }
                          >
                            {t('common.actions.save')}
                          </ActionButton>
                          <ActionButton
                            variant="danger"
                            onClick={() => handleDeleteComponent(id)}
                            disabled={savingTemplate || isSavingRow || isDeletingRow || (c?.hasScores ?? false) || !canEditTemplate}
                          >
                            {t('common.actions.delete')}
                          </ActionButton>
                          {c?.hasScores ? <span className="text-xs text-(--nb-color-muted)">{t('exams.settings.labels.hasScores')}</span> : null}
                        </div>
                      );
                    default:
                      return '';
                  }
                }}
                tableProps={{
                  theadClassName: 'bg-(--nb-color-brand)',
                  useDefaultHeaderStyles: false,
                  baseRowClassName: 'border-t border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-bg) transition-colors',
                  rowClassName: (row) => (row?.__type === 'new' ? 'bg-(--nb-color-bg)' : ''),
                }}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
