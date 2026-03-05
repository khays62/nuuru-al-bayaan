import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload } from 'lucide-react';

import Card from '../../../shared/components/ui/Card.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';

import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/useI18n';

import { createLibraryResource, deleteLibraryResource, listLibraryResources } from '../api/library';
import { libraryKeys } from '../queryKeys';

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
    return isDocs
      ? t('students.libraryTab.kinds.docs', { defaultValue: 'Docs' })
      : t('students.libraryTab.kinds.pdf', { defaultValue: 'PDF' });
  }
  return '-';
}

export default function LibraryManagementPage() {
  const queryClient = useQueryClient();
  const { auth, hasPermission } = useAuth();
  const { t } = useI18n();

  const role = String(auth?.user?.role || '').toLowerCase();

  const canUpload = role === 'admin'
    || role === 'teacher'
    || (role === 'staff' && (hasPermission?.('library', 'add') || hasPermission?.('library', 'full')));

  const canDelete = role === 'admin'
    || role === 'teacher'
    || (role === 'staff' && (hasPermission?.('library', 'delete') || hasPermission?.('library', 'full')));

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('pdf'); // pdf | docs | link
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState(null);

  const isLink = kind === 'link';
  const docsAccept = '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const pdfAccept = '.pdf,application/pdf';
  const fileAccept = kind === 'docs' ? docsAccept : pdfAccept;

  const deleteConfirmMessage = t('students.libraryTab.confirmDelete', { defaultValue: 'Delete this resource?' });

  const listQuery = useQuery({
    queryKey: libraryKeys.list({ q: '', limit: 500 }),
    queryFn: async ({ signal }) => {
      return await listLibraryResources({ limit: 500 }, { signal });
    },
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    const d = listQuery.data;
    const items = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
    return Array.isArray(items) ? items : [];
  }, [listQuery.data]);

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
      setTitle('');
      setCategory('');
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

    return [
      {
        key: 'title',
        label: t('students.libraryTab.columns.title', { defaultValue: 'Title' }),
        thClassName: th,
        tdClassName: `${td} whitespace-normal`,
        render: (row) => (
          <div className="min-w-0">
            <div className="font-semibold text-(--nb-color-text)">{String(row?.title || '-')}</div>
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
      {
        key: 'category',
        label: t('students.libraryTab.columns.category', { defaultValue: 'Category' }),
        thClassName: th,
        tdClassName: `${td} whitespace-nowrap`,
        render: (row) => String(row?.category || '-'),
      },
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
        thClassName: `${th} text-center`,
        tdClassName: `${td} whitespace-nowrap text-center`,
        render: (row) => {
          const k = String(row?.kind || '').toLowerCase();
          const href = k === 'pdf' ? row?.file?.url : (k === 'link' ? row?.linkUrl : '');
          const openLabel = k === 'pdf'
            ? t('students.libraryTab.actions.download', { defaultValue: 'Download' })
            : t('students.libraryTab.actions.open', { defaultValue: 'Open' });

          const id = row?._id || row?.id;

          return (
            <div className="inline-flex items-center gap-2 justify-center">
              {href ? (
                <Button
                  as="a"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  variant="outline"
                  size="sm"
                >
                  {openLabel}
                </Button>
              ) : null}

              {canDelete && id ? (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    const ok = window.confirm(deleteConfirmMessage);
                    if (!ok) return;
                    deleteMut.mutate(String(id));
                  }}
                >
                  {t('common.actions.delete', { defaultValue: 'Delete' })}
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ];
  }, [t, canDelete, deleteMut.isPending, deleteConfirmMessage]);

  const submit = async (e) => {
    e.preventDefault();
    if (createMut.isPending) return;

    const titleStr = String(title || '').trim();
    if (!titleStr) return;

    const k = String(kind || '').toLowerCase();
    const fd = new FormData();
    fd.append('title', titleStr);
    // API supports kind=pdf|link. We treat "docs" as kind=pdf (file) based on uploaded mime type.
    fd.append('kind', k === 'link' ? 'link' : 'pdf');
    if (category && String(category).trim()) fd.append('category', String(category).trim());
    if (description && String(description).trim()) fd.append('description', String(description).trim());

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
        <div className="border-l-4 border-(--nb-color-brand) bg-(--nb-color-brand-50) rounded px-3 py-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-(--nb-color-fg)">{t('nav.library')}</h2>
            <div className="text-xs text-(--nb-color-muted) mt-0.5">{t('students.libraryTab.subtitle', { defaultValue: 'PDFs, notes, past papers and links.' })}</div>
          </div>
          {canUpload ? (
            <Button variant="brand" size="md" onClick={() => setOpen(true)}>
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
          loadingMessage={t('common.loading')}
          loadingVariant="table"
          loadingRows={8}
          loadingColumns={5}
          isEmpty={!listQuery.isLoading && !loadError && rows.length === 0}
          emptyTitle={t('students.libraryTab.emptyTitle', { defaultValue: 'No resources yet' })}
          emptyDescription={t('students.libraryTab.empty', { defaultValue: 'There are no library resources available right now.' })}
          tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-semibold text-(--nb-color-fg)">{t('students.libraryTab.form.category', { defaultValue: 'Category (optional)' })}</label>
              <input
                className="mt-1 w-full rounded-md border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-sm"
                value={category ?? ''}
                onChange={(e) => setCategory(e?.target?.value ?? '')}
                placeholder={t('students.libraryTab.form.categoryPlaceholder', { defaultValue: 'Notes / Past Papers / Link' })}
              />
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
            <div className="text-xs text-(--nb-color-muted) mt-1">{t('students.libraryTab.form.pdfHint', { defaultValue: 'Supported: PDF, DOC, DOCX.' })}</div>
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
              disabled={createMut.isPending || !title.trim() || (kind === 'link' ? !linkUrl.trim() : !file)}
            >
              {createMut.isPending ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.actions.save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
