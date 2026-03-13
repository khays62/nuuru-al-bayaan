import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, Plus, Trash2, Upload } from 'lucide-react';

import Card from '../../../shared/components/ui/Card.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';

import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
import { EVENTS } from '../../../utils/events';
import { useRealtimeInvalidation } from '../../../shared/realtime/useRealtimeInvalidation';

import { createLibraryResource, deleteLibraryResource, listLibraryResources } from '../api/library';
import { libraryKeys } from '../queryKeys';
import { getGrades } from '../../lookups/api/lookups';
import { getSubjects } from '../../subjects/api/subjects';
import { getAssignments as getTeacherAssignments } from '../../teachers/api/teachersApi';

function formatDateShort(d) {
  try {
    const dt = d ? new Date(d) : null;
    if (!dt || Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString();
  } catch {
    return '-';
  }
}

function kindLabel(row, t) {
  const k = String(row?.kind || '').toLowerCase();
  if (k === 'link') return t('students.libraryTab.kinds.link', { defaultValue: 'Link' });
  if (k === 'pdf') {
    const mt = String(row?.file?.mimeType || '').toLowerCase();
    const name = String(row?.file?.originalName || '').toLowerCase();
    const isDocs =
      mt === 'application/msword'
      || mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || name.endsWith('.doc')
      || name.endsWith('.docx');
    const isPpt =
      mt === 'application/vnd.ms-powerpoint'
      || mt === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      || name.endsWith('.ppt')
      || name.endsWith('.pptx');
    if (isDocs) return t('students.libraryTab.kinds.docs', { defaultValue: 'Docs' });
    if (isPpt) return t('students.libraryTab.kinds.powerpoint', { defaultValue: 'PowerPoint' });
    return t('students.libraryTab.kinds.pdf', { defaultValue: 'PDF' });
  }
  return '-';
}

export default function LibraryManagementPage() {
  const queryClient = useQueryClient();
  const { auth, hasPermission } = useAuth();
  const { t } = useI18n();

  const role = String(auth?.user?.role || '').toLowerCase();
  const currentUserId = String(auth?.user?._id || auth?.user?.id || '').trim();

  const canUpload = role === 'admin'
    || role === 'teacher'
    || (role === 'staff' && (hasPermission?.('library', 'add') || hasPermission?.('library', 'full')));

  const staffCanDeleteAny = role === 'staff' && (hasPermission?.('library', 'delete') || hasPermission?.('library', 'full'));
  const canDeleteAny = role === 'admin' || staffCanDeleteAny;
  const canDeleteOwn = role === 'teacher';

  const showAudit = role === 'admin';

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [kind, setKind] = useState('pdf'); // pdf | docs | ppt | link
  const [audience, setAudience] = useState('public'); // public | level
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState(null);

  const isLink = kind === 'link';
  const isLevel = audience === 'level';
  const docsAccept = '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const pdfAccept = '.pdf,application/pdf';
  const pptAccept = '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
  const fileAccept = kind === 'docs' ? docsAccept : (kind === 'ppt' ? pptAccept : pdfAccept);

  const deleteConfirmMessage = t('students.libraryTab.confirmDelete', { defaultValue: 'Delete this resource?' });

  const gradesQuery = useQuery({
    queryKey: ['lookups', 'grades'],
    queryFn: async ({ signal }) => await getGrades({ signal }),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const teacherAssignmentsQuery = useQuery({
    queryKey: ['teacher', 'assignments', String(auth?.user?.teacherRef || '')],
    queryFn: async ({ signal }) => await getTeacherAssignments(String(auth?.user?.teacherRef || ''), {}, { signal }),
    enabled: role === 'teacher' && Boolean(auth?.user?.teacherRef),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const allowedTeacherGradeIds = useMemo(() => {
    if (role !== 'teacher') return null;
    const rows = Array.isArray(teacherAssignmentsQuery.data?.data) ? teacherAssignmentsQuery.data.data : [];
    const set = new Set();
    for (const a of rows) {
      const gid = a?.gradeSection?.grade?._id || a?.gradeSection?.grade;
      if (gid) set.add(String(gid));
    }
    return Array.from(set);
  }, [role, teacherAssignmentsQuery.data]);

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'byGrade', gradeId],
    queryFn: async ({ signal }) => await getSubjects({ limit: 200, grade: gradeId, sortBy: 'subjectName', sortDir: 'asc' }, { signal }),
    enabled: isLevel && Boolean(gradeId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const gradeOptions = useMemo(() => {
    const rows = Array.isArray(gradesQuery.data) ? gradesQuery.data : (Array.isArray(gradesQuery.data?.data) ? gradesQuery.data.data : []);
    return rows
      .filter((g) => {
        if (role !== 'teacher') return true;
        if (!allowedTeacherGradeIds) return true;
        return allowedTeacherGradeIds.includes(String(g?._id || ''));
      })
      .map((g) => ({
        value: String(g?._id || ''),
        label: String(g?.gradeName || ''),
      }))
      .filter((o) => o.value && o.label);
  }, [allowedTeacherGradeIds, gradesQuery.data, role]);

  const subjectOptions = useMemo(() => {
    const rows = Array.isArray(subjectsQuery.data?.data)
      ? subjectsQuery.data.data
      : (Array.isArray(subjectsQuery.data) ? subjectsQuery.data : []);
    return rows
      .map((s) => ({
        value: String(s?._id || ''),
        label: String(s?.subjectName || s?.name || ''),
      }))
      .filter((o) => o.value && o.label);
  }, [subjectsQuery.data]);

  const listQuery = useQuery({
    queryKey: libraryKeys.list({ q: '', limit, page }),
    queryFn: async ({ signal }) => {
      return await listLibraryResources({ limit, page }, { signal });
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => {
    const d = listQuery.data;
    const items = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
    return Array.isArray(items) ? items : [];
  }, [listQuery.data]);

  const meta = listQuery.data?.meta;

  useRealtimeInvalidation(
    [EVENTS.LIBRARY_CHANGED],
    () => {
      try {
        queryClient.invalidateQueries({ queryKey: libraryKeys.listBase() });
      } catch {
        // ignore
      }
    },
    { enabled: true }
  );

  React.useEffect(() => {
    const tp = meta?.totalPages != null ? Number(meta.totalPages) : null;
    if (!tp) return;
    if (page > tp) setPage(tp);
  }, [meta?.totalPages, page]);

  const createMut = useMutation({
    mutationFn: async (formData) => {
      const res = await createLibraryResource(formData);
      const ok = res?.success !== false;
      if (!ok) throw new Error(res?.message || 'Upload failed');
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: libraryKeys.listBase() });
      setOpen(false);
      setKind('pdf');
      setAudience('public');
      setGradeId('');
      setSubjectId('');
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setFile(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const res = await deleteLibraryResource(id);
      const ok = res?.success !== false;
      if (!ok) throw new Error(res?.message || 'Delete failed');
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: libraryKeys.listBase() });
    },
  });

  const loadError = listQuery.isError
    ? (listQuery.error?.message || t('students.libraryTab.loadFailed', { defaultValue: 'Library load failed' }))
    : null;

  const columns = useMemo(() => {
    const th = 'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide';
    const td = 'px-4 py-3 text-sm text-(--nb-color-fg) border-x border-(--nb-color-border)';

    const cols = [
      {
        key: 'title',
        label: t('students.libraryTab.columns.title', { defaultValue: 'Title' }),
        thClassName: th,
        tdClassName: `${td} whitespace-normal`,
        render: (row) => (
          <div className="min-w-0">
            <div className="font-semibold text-(--nb-color-text)">{String(row?.title || '-')}</div>
            {String(row?.audience || '').toLowerCase() === 'level' ? (
              <div className="text-xs text-(--nb-color-muted) mt-0.5">
                {String(row?.grade?.gradeName || t('common.level', { defaultValue: 'Level' }))}
                {row?.subject?.subjectName ? ` • ${String(row.subject.subjectName)}` : ''}
              </div>
            ) : null}
            {row?.description ? (
              <div className="text-xs text-(--nb-color-muted) mt-0.5 line-clamp-2">{String(row.description)}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'kind',
        label: t('students.libraryTab.columns.type', { defaultValue: 'Type' }),
        thClassName: th,
        tdClassName: `${td} whitespace-nowrap`,
        render: (row) => kindLabel(row, t),
      },
      ...(showAudit ? [
        {
          key: 'uploadedBy',
          label: t('students.libraryTab.columns.uploadedBy', { defaultValue: 'Uploaded By' }),
          thClassName: th,
          tdClassName: `${td} whitespace-nowrap`,
          render: (row) => {
            const name = String(row?.createdByName || '').trim();
            const roleStr = String(row?.createdByRole || '').trim();
            const display = name || '-';
            return (
              <div className="min-w-0">
                <div className="text-(--nb-color-fg)">{display}</div>
                {roleStr ? <div className="text-xs text-(--nb-color-muted)">{roleStr}</div> : null}
              </div>
            );
          },
        },
      ] : []),
      {
        key: 'createdAt',
        label: t('students.libraryTab.columns.added', { defaultValue: 'Added' }),
        thClassName: th,
        tdClassName: `${td} whitespace-nowrap`,
        render: (row) => formatDateShort(row?.createdAt),
      },
      {
        key: 'actions',
        label: t('common.table.actions', { defaultValue: 'Actions' }),
        align: 'right',
        noPrint: true,
        thClassName: `${th} text-right`,
        tdClassName: `${td} whitespace-nowrap text-right font-medium no-print`,
        render: (row) => {
          const k = String(row?.kind || '').toLowerCase();
          const href = k === 'pdf' ? row?.file?.url : (k === 'link' ? row?.linkUrl : '');
          const openLabel = k === 'pdf'
            ? t('students.libraryTab.actions.download', { defaultValue: 'Download' })
            : t('students.libraryTab.actions.open', { defaultValue: 'Open' });

          const id = row?._id || row?.id;

          const ownerId = String(row?.createdById || '').trim();
          const canDeleteThis = Boolean(id) && (
            canDeleteAny
            || (canDeleteOwn && ownerId && currentUserId && ownerId === currentUserId)
          );

          const actions = [
            href
              ? {
                key: 'open',
                label: openLabel,
                title: openLabel,
                tone: 'view',
                icon: k === 'pdf' ? <Download size={16} /> : <ExternalLink size={16} />,
                onClick: () => {
                  try {
                    window.open(String(href), '_blank', 'noopener,noreferrer');
                  } catch {
                    // ignore
                  }
                },
              }
              : null,
            canDeleteThis
              ? {
                key: 'delete',
                label: t('common.actions.delete', { defaultValue: 'Delete' }),
                title: t('common.actions.delete', { defaultValue: 'Delete' }),
                tone: 'delete',
                icon: <Trash2 size={16} />,
                disabled: deleteMut.isPending,
                onClick: () => {
                  const ok = window.confirm(deleteConfirmMessage);
                  if (!ok) return;
                  deleteMut.mutate(String(id));
                },
              }
              : null,
          ];

          return <RowActionButtons actions={actions} />;
        },
      },
    ];
    return cols;
  }, [t, canDeleteAny, canDeleteOwn, currentUserId, deleteMut, deleteConfirmMessage, showAudit]);

  const submit = async (e) => {
    e.preventDefault();
    if (createMut.isPending) return;

    const titleStr = String(title || '').trim();
    if (!titleStr) return;

    const k = String(kind || '').toLowerCase();
    const fd = new FormData();
    fd.append('title', titleStr);
    fd.append('audience', String(audience || 'public'));
    // API supports kind=pdf|link. We treat "docs" as kind=pdf (file) based on uploaded mime type.
    fd.append('kind', k === 'link' ? 'link' : 'pdf');
    if (description && String(description).trim()) fd.append('description', String(description).trim());

    if (String(audience || '').toLowerCase() === 'level') {
      const gid = String(gradeId || '').trim();
      const sid = String(subjectId || '').trim();
      if (!gid || !sid) return;
      fd.append('gradeId', gid);
      fd.append('subjectId', sid);
    }

    if (k !== 'link') {
      if (!file) return;
      fd.append('file', file);
    } else {
      const url = String(linkUrl || '').trim();
      if (!url) return;
      fd.append('linkUrl', url);
    }

    createMut.mutate(fd);
  };

  return (
    <Card className="p-4">
      <div className="mb-4">
        <div className="border-l-4 border-(--nb-color-brand) bg-(--nb-color-brand-50) rounded px-3 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-(--nb-color-fg)">{t('nav.library')}</h2>
            <div className="text-xs text-(--nb-color-muted) mt-0.5">{t('students.libraryTab.subtitle', { defaultValue: 'PDFs, notes, past papers and links.' })}</div>
          </div>
          {canUpload ? (
            <Button variant="brand" size="lg" className="self-stretch" onClick={() => setOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t('students.libraryTab.actions.add', { defaultValue: 'Add Resource' })}
              </span>
            </Button>
          ) : null}
        </div>
      </div>

      {deleteMut.isError ? (
        <Alert
          variant="danger"
          className="mb-3"
          title={String(deleteMut.error?.message || t('common.errors.failedToDelete', { defaultValue: 'Failed to delete' }))}
        />
      ) : null}

      <div className="overflow-x-auto border border-(--nb-color-border) rounded-xl">
        <StandardTable
          isLoading={listQuery.isLoading}
          error={loadError}
          items={rows}
          rows={rows}
          columns={columns}
          storageKey="library.management.table"
          controlsProps={{
            limit,
            total: meta?.total,
            onLimit: (l) => {
              setLimit(Number(l) || 10);
              setPage(1);
            },
          }}
          loadingMessage={t('common.loading')}
          loadingVariant="table"
          loadingRows={8}
          loadingColumns={5}
          isEmpty={!listQuery.isLoading && !loadError && rows.length === 0}
          emptyTitle={t('students.libraryTab.emptyTitle', { defaultValue: 'No resources yet' })}
          emptyDescription={t('students.libraryTab.empty', { defaultValue: 'There are no library resources available right now.' })}
          tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}

          meta={meta}
          page={page}
          totalPages={meta?.totalPages}
          limit={limit}
          total={meta?.total}
          onPage={(p) => setPage(Number(p) || 1)}
          onLimit={(l) => {
            setLimit(Number(l) || 10);
            setPage(1);
          }}
        />
      </div>

      <Modal
        isOpen={open}
        onClose={() => (createMut.isPending ? null : setOpen(false))}
        title={t('students.libraryTab.modal.title', { defaultValue: 'Add Library Resource' })}
        panelClassName="max-w-2xl"
      >
        <form onSubmit={submit} className="space-y-4">
          {createMut.isError ? (
            <Alert variant="danger" title={String(createMut.error?.message || t('students.libraryTab.uploadFailed', { defaultValue: 'Upload failed' }))} />
          ) : null}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.title', { defaultValue: 'Title' })}</label>
              <input
                className="mt-1 w-full rounded-md border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-sm"
                value={title ?? ''}
                onChange={(e) => setTitle(e?.target?.value ?? '')}
                placeholder={t('students.libraryTab.form.titlePlaceholder', { defaultValue: 'e.g., Math Notes - Unit 1' })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.audience', { defaultValue: 'Audience' })}</label>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="audience"
                  value="public"
                  checked={audience === 'public'}
                  onChange={() => {
                    setAudience('public');
                    setGradeId('');
                    setSubjectId('');
                  }}
                />
                {t('students.libraryTab.audience.public', { defaultValue: 'Public' })}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="audience"
                  value="level"
                  checked={audience === 'level'}
                  onChange={() => {
                    setAudience('level');
                    setSubjectId('');
                  }}
                />
                {t('students.libraryTab.audience.level', { defaultValue: 'Level' })}
              </label>
            </div>
            <div className="text-xs text-(--nb-color-muted) mt-1">
              {audience === 'public'
                ? t('students.libraryTab.audience.publicHint', { defaultValue: 'Visible to everyone.' })
                : t('students.libraryTab.audience.levelHint', { defaultValue: 'Visible to students in this level and teachers assigned to it.' })}
            </div>
          </div>

          <div className={isLevel ? '' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.level', { defaultValue: 'Level' })}</label>
                <div className="mt-1">
                  <DropdownSelect
                    name="gradeId"
                    value={String(gradeId || '')}
                    onChange={(v) => {
                      setGradeId(String(v || ''));
                      setSubjectId('');
                    }}
                    disabled={gradesQuery.isLoading || (role === 'teacher' && teacherAssignmentsQuery.isLoading)}
                    options={gradeOptions}
                    placeholder={t('common.select.placeholder', { defaultValue: 'Select...' })}
                    menuPlacement="down"
                    hideSelectedOption={false}
                    clearable
                  />
                </div>
                {role === 'teacher' ? (
                  <div className="text-xs text-(--nb-color-muted) mt-1">
                    {t('students.libraryTab.form.levelTeacherHint', { defaultValue: 'You can only choose levels you are assigned to.' })}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.subject', { defaultValue: 'Subject' })}</label>
                <div className="mt-1">
                  <DropdownSelect
                    name="subjectId"
                    value={String(subjectId || '')}
                    onChange={(v) => setSubjectId(String(v || ''))}
                    disabled={!String(gradeId || '').trim() || subjectsQuery.isLoading}
                    options={subjectOptions}
                    placeholder={t('common.select.placeholder', { defaultValue: 'Select...' })}
                    menuPlacement="down"
                    hideSelectedOption={false}
                    clearable
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.type', { defaultValue: 'Resource Type' })}</label>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="pdf"
                  checked={kind === 'pdf'}
                  onChange={() => {
                    setKind('pdf');
                    setLinkUrl('');
                    setFile(null);
                  }}
                />
                {t('students.libraryTab.kinds.pdf', { defaultValue: 'PDF' })}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="docs"
                  checked={kind === 'docs'}
                  onChange={() => {
                    setKind('docs');
                    setLinkUrl('');
                    setFile(null);
                  }}
                />
                {t('students.libraryTab.kinds.docs', { defaultValue: 'Docs' })}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="ppt"
                  checked={kind === 'ppt'}
                  onChange={() => {
                    setKind('ppt');
                    setLinkUrl('');
                    setFile(null);
                  }}
                />
                {t('students.libraryTab.kinds.powerpoint', { defaultValue: 'PowerPoint' })}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="link"
                  checked={kind === 'link'}
                  onChange={() => {
                    setKind('link');
                    setFile(null);
                  }}
                />
                {t('students.libraryTab.kinds.link', { defaultValue: 'Link' })}
              </label>
            </div>
          </div>

          {/* IMPORTANT: always render both inputs to avoid React reusing a single <input> and triggering controlled/uncontrolled warnings */}
          <div className={isLink ? '' : 'hidden'}>
            <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.link', { defaultValue: 'Link URL' })}</label>
            <input
              key={`library-link-${kind}`}
              className="mt-1 w-full rounded-md border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-sm"
              value={linkUrl ?? ''}
              onChange={(e) => setLinkUrl(e?.target?.value ?? '')}
              placeholder="https://"
              required={isLink}
              disabled={!isLink}
            />
          </div>

          <div className={isLink ? 'hidden' : ''}>
            <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.file', { defaultValue: 'File' })}</label>
            <div className="mt-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-(--nb-color-muted)" />
              <input
                key={`library-file-${kind}`}
                type="file"
                accept={fileAccept}
                className="w-full rounded-md border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-sm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required={!isLink}
                disabled={isLink}
              />
            </div>
            <div className="text-xs text-(--nb-color-muted) mt-1">{t('students.libraryTab.form.pdfHint', { defaultValue: 'Supported: PDF, DOC, DOCX, PPT, PPTX.' })}</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.description', { defaultValue: 'Description (optional)' })}</label>
            <textarea
              className="mt-1 w-full rounded-md border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-sm"
              rows={3}
              value={description ?? ''}
              onChange={(e) => setDescription(e?.target?.value ?? '')}
              placeholder={t('students.libraryTab.form.descriptionPlaceholder', { defaultValue: 'Short description...' })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="neutral"
              type="button"
              onClick={() => setOpen(false)}
              disabled={createMut.isPending}
            >
              {t('common.actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant="brand"
              type="submit"
              disabled={
                createMut.isPending
                || !title.trim()
                || (String(audience || '').toLowerCase() === 'level' && (!String(gradeId || '').trim() || !String(subjectId || '').trim()))
                || (kind === 'link' ? !linkUrl.trim() : !file)
              }
            >
              {createMut.isPending ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.actions.save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
