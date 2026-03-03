import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Send, Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../shared/components/ui/Button.jsx";
import Card from "../../../shared/components/ui/Card.jsx";
import Input from "../../../shared/components/ui/Input.jsx";
import Textarea from "../../../shared/components/ui/Textarea.jsx";
import LoadingState from "../../../shared/components/ui/LoadingState.jsx";
import RowActionButtons from "../../../shared/components/table/RowActionButtons.jsx";
import { useAuth } from "../../../auth/AuthContext";
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, markAnnouncementsRead } from "../../../api";
import { announcementKeys } from '../queryKeys';
import { useAnnouncementsRealtimeInvalidation } from '../useAnnouncementsRealtimeInvalidation';
import { useI18n } from '../../../i18n/useI18n';

export default function AnnouncementsPage() {
  const { t } = useI18n();
  const { auth, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const user = auth?.user || null;
  const userKey = user?._id || user?.username || null;

  const {
    data: announcements = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: announcementKeys.list(),
    queryFn: async ({ signal }) => {
      const data = await getAnnouncements({ signal });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
  });

  // Clear unread badge when Announcements page opens
  useEffect(() => {
    if (!userKey) return;
    let cancelled = false;
    (async () => {
      try {
        // Optimistic clear so UI feels instant.
        queryClient.setQueryData(['announcements', 'unreadCount', userKey], 0);
        await markAnnouncementsRead();
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: ['announcements', 'unreadCount', userKey] });
      } catch {
        // Non-blocking: badge will refresh via polling.
      }
    })();
    return () => { cancelled = true; };
  }, [user?._id, user?.username]);

  // Live refresh: keep announcements synced across browsers/tabs.
  useAnnouncementsRealtimeInvalidation({ userKey });

  const canPost = useMemo(() => {
    if (!user) return false;
    const role = String(user?.role || '').toLowerCase();
    if (role === 'teacher') return true;
    return typeof hasPermission === 'function' && hasPermission('announcements', 'add');
  }, [user, hasPermission]);

  const canEditAny = useMemo(() => {
    if (!user) return false;
    const role = String(user?.role || '').toLowerCase();
    if (role === 'teacher') return true;
    return typeof hasPermission === 'function' && hasPermission('announcements', 'edit');
  }, [user, hasPermission]);

  const canDeleteAny = useMemo(() => {
    if (!user) return false;
    const role = String(user?.role || '').toLowerCase();
    if (role === 'teacher') return true;
    return typeof hasPermission === 'function' && hasPermission('announcements', 'delete');
  }, [user, hasPermission]);

  const canManageAnnouncement = (a) => {
    if (!user || !a) return false;
    const role = String(user?.role || '').toLowerCase();
    if (role === 'teacher') {
      const byId = user?._id && a?.createdById && String(a.createdById) === String(user._id);
      const byAuthor = user?.username && a?.author && String(a.author) === String(user.username);
      return byId || byAuthor;
    }
    return true;
  };

   


  // ðŸ“ Create
const handlePost = async () => {
  if (posting) return;
  if (!newTitle.trim() || !newBody.trim()) {
    toast.error(t('announcements.page.toasts.fillTitleAndBody', { defaultValue: 'Please fill out both title and body' }));
    return;
  }

  try {
    setPosting(true);
    const data = await createAnnouncement({ title: newTitle, body: newBody });
    queryClient.setQueryData(announcementKeys.list(), (prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.some((a) => String(a?._id) === String(data?._id));
      if (exists) return list;
      return [data, ...list];
    });
    setNewTitle("");
    setNewBody("");
    toast.success(t('announcements.page.toasts.posted', { defaultValue: 'Announcement posted successfully!' }));
  } catch {
    toast.error(t('common.errors.networkOrServerError', { defaultValue: 'Network or server error' }));
  } finally {
    setPosting(false);
  }
};

// âœï¸ Edit
const handleEdit = async (id) => {
  if (updatingId) return;
  try {
    setUpdatingId(id);
    const updated = await updateAnnouncement(id, { title: editTitle, body: editBody });
    queryClient.setQueryData(announcementKeys.list(), (prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.map((a) => (String(a?._id) === String(id) ? updated : a));
    });
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
    toast.success(t('announcements.page.toasts.updated', { defaultValue: 'Announcement updated!' }));
  } catch {
    toast.error(t('common.errors.somethingWentWrong', { defaultValue: 'Something went wrong.' }));
  } finally {
    setUpdatingId(null);
  }
};

// âŒ Delete
const handleDelete = async (id) => {
  if (deletingId) return;
  if (!window.confirm(t('announcements.page.confirmDelete', { defaultValue: 'Are you sure you want to delete this announcement?' })))
    return;
  try {
    setDeletingId(id);
    await deleteAnnouncement(id);
    queryClient.setQueryData(announcementKeys.list(), (prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.filter((a) => String(a?._id) !== String(id));
    });
    toast.success(t('announcements.page.toasts.deleted', { defaultValue: 'Announcement deleted!' }));
  } catch {
    toast.error(t('common.errors.networkOrServerError', { defaultValue: 'Network or server error' }));
  } finally {
    setDeletingId(null);
  }
};


  return (
    
    
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Megaphone className="text-(--nb-color-brand)" size={28} />
        <h1 className="text-3xl font-bold text-gray-800">{t('announcements.page.title', { defaultValue: 'Announcements' })}</h1>
      </div>

      {canPost && (
        <Card className="rounded-xl p-5 border-gray-100 shadow-md">
          <Input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('announcements.page.form.titlePlaceholder', { defaultValue: 'Announcement titleâ€¦' })}
            className="mb-3"
          />
          <Textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder={t('announcements.page.form.bodyPlaceholder', { defaultValue: 'Write your announcement detailsâ€¦' })}
            className="mb-3 resize-none"
            rows={4}
          />
          <Button
            onClick={handlePost}
            variant="brand"
            disabled={posting}
            icon={posting ? <LoadingState variant="inline" className="border-t-white" /> : <Send size={18} />}
          >
            {posting ? t('announcements.page.status.posting', { defaultValue: 'Postingâ€¦' }) : t('announcements.page.actions.post', { defaultValue: 'Post' })}
          </Button>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-gray-500 italic">{t('announcements.page.loading', { defaultValue: 'Loading announcementsâ€¦' })}</p>
        ) : isError || announcements.length === 0 ? (
          <p className="text-gray-500 italic">{t('announcements.page.empty', { defaultValue: 'No announcements yet.' })}</p>
        ) : (
          announcements.map((a) => (
            <Card
              key={a._id}
              className="border-gray-100 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              {editingId === a._id ? (
                <div>
                  <Input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t('announcements.page.form.editTitlePlaceholder', { defaultValue: 'Edit title' })}
                    className="mb-2"
                  />
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-3 mt-3">
                    <Button
                      onClick={() => handleEdit(a._id)}
                      variant="brand"
                      disabled={updatingId === a._id}
                      icon={updatingId === a._id ? <LoadingState variant="inline" className="border-t-white" /> : null}
                    >
                      {updatingId === a._id ? t('announcements.page.status.updating', { defaultValue: 'Updatingâ€¦' }) : t('common.actions.update', { defaultValue: 'Update' })}
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="neutral"
                      disabled={updatingId === a._id}
                    >
                      {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-gray-900">{a.title}</h1>
                  <p className="text-gray-700 mt-9">{a.body}</p>

                  <div className="flex justify-between items-start gap-4 mt-10">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500">
                        {t('announcements.page.meta.postedBy', {
                          author: a.author,
                          role: a.role,
                          date: new Date(a.date).toLocaleString(),
                          defaultValue: 'Posted by {{author}} ({{role}}) on {{date}}',
                        })}
                      </p>

                      {a.updatedBy ? (
                        <p className="text-xs text-gray-500 mt-1">
                          {t('announcements.page.meta.updatedBy', {
                            updatedBy: a.updatedBy,
                            roleSuffix: a.updatedByRole ? ` (${a.updatedByRole})` : '',
                            dateSuffix: a.updatedAt ? ` ${t('announcements.page.meta.onPrefix', { defaultValue: 'on' })} ${new Date(a.updatedAt).toLocaleString()}` : '',
                            defaultValue: 'Updated by {{updatedBy}}{{roleSuffix}}{{dateSuffix}}',
                          })}
                        </p>
                      ) : null}
                    </div>

                    {(() => {
                      if (!user) return null;

                      const canManage = canManageAnnouncement(a);
                      const canEditThis = canEditAny && canManage;
                      const canDeleteThis = canDeleteAny && canManage;
                      if (!canEditThis && !canDeleteThis) return null;

                      return (
                        <RowActionButtons
                          actions={[
                            canEditThis
                              ? {
                                  key: 'edit',
                                  label: t('common.actions.edit', { defaultValue: 'Edit' }),
                                  title: t('common.actions.edit', { defaultValue: 'Edit' }),
                                  tone: 'edit',
                                  icon: <Pencil size={16} />,
                                  disabled: deletingId === a._id || updatingId === a._id,
                                  onClick: () => {
                                    setEditingId(a._id);
                                    setEditTitle(a.title);
                                    setEditBody(a.body);
                                  },
                                }
                              : null,
                            canDeleteThis
                              ? {
                                  key: 'delete',
                                  label: t('common.actions.delete', { defaultValue: 'Delete' }),
                                  title: deletingId === a._id ? t('announcements.page.status.deleting', { defaultValue: 'Deletingâ€¦' }) : t('common.actions.delete', { defaultValue: 'Delete' }),
                                  tone: 'delete',
                                  icon: deletingId === a._id ? <LoadingState variant="inline" /> : <Trash2 size={16} />,
                                  disabled: deletingId === a._id || updatingId === a._id,
                                  onClick: () => handleDelete(a._id),
                                }
                              : null,
                          ]}
                        />
                      );
                    })()}
                  </div>
                </>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
