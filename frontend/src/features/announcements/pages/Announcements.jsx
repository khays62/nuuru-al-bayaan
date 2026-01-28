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

export default function AnnouncementsPage() {
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
    const userKey = user?._id || user?.username || null;
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

   


  // 📝 Create
const handlePost = async () => {
  if (posting) return;
  if (!newTitle.trim() || !newBody.trim()) {
    toast.error("Please fill out both title and body");
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
    toast.success("Announcement posted successfully!");
  } catch {
    toast.error("Network error — please try again");
  } finally {
    setPosting(false);
  }
};

// ✏️ Edit
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
    toast.success("Announcement updated!");
  } catch {
    toast.error("Something went wrong. Try again later.");
  } finally {
    setUpdatingId(null);
  }
};

// ❌ Delete
const handleDelete = async (id) => {
  if (deletingId) return;
  if (!window.confirm("Are you sure you want to delete this announcement?"))
    return;
  try {
    setDeletingId(id);
    await deleteAnnouncement(id);
    queryClient.setQueryData(announcementKeys.list(), (prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.filter((a) => String(a?._id) !== String(id));
    });
    toast.success("Announcement deleted!");
  } catch {
    toast.error("Network error — unable to delete");
  } finally {
    setDeletingId(null);
  }
};


  return (
    
    
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Megaphone className="text-(--nb-color-brand)" size={28} />
        <h1 className="text-3xl font-bold text-gray-800">Announcements</h1>
      </div>

      {canPost && (
        <Card className="rounded-xl p-5 border-gray-100 shadow-md">
          <Input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Announcement title..."
            className="mb-3"
          />
          <Textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Write your announcement details..."
            className="mb-3 resize-none"
            rows={4}
          />
          <Button
            onClick={handlePost}
            variant="brand"
            disabled={posting}
            icon={posting ? <LoadingState variant="inline" className="border-t-white" /> : <Send size={18} />}
          >
            {posting ? 'Posting…' : 'Post'}
          </Button>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-gray-500 italic">Loading announcements…</p>
        ) : isError || announcements.length === 0 ? (
          <p className="text-gray-500 italic">No announcements yet.</p>
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
                    placeholder="Edit title"
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
                      {updatingId === a._id ? 'Updating…' : 'Update'}
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="neutral"
                      disabled={updatingId === a._id}
                    >
                      Cancel
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
                        Posted by <strong>{a.author}</strong> ({a.role}) on{' '}
                        {new Date(a.date).toLocaleString()}
                      </p>

                      {a.updatedBy ? (
                        <p className="text-xs text-gray-500 mt-1">
                          Updated by <strong>{a.updatedBy}</strong>
                          {a.updatedByRole ? ` (${a.updatedByRole})` : ''}
                          {a.updatedAt ? ` on ${new Date(a.updatedAt).toLocaleString()}` : ''}
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
                                  label: 'Edit',
                                  title: 'Edit',
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
                                  label: 'Delete',
                                  title: deletingId === a._id ? 'Deleting…' : 'Delete',
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
