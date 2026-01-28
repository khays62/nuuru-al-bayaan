import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Send } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../shared/components/ui/Button.jsx";
import Card from "../../../shared/components/ui/Card.jsx";
import Input from "../../../shared/components/ui/Input.jsx";
import Textarea from "../../../shared/components/ui/Textarea.jsx";
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
    return !!user && typeof hasPermission === 'function' && hasPermission('announcements', 'add');
  }, [user, hasPermission]);

  const canEditAny = useMemo(() => {
    return !!user && typeof hasPermission === 'function' && hasPermission('announcements', 'edit');
  }, [user, hasPermission]);

  const canDeleteAny = useMemo(() => {
    return !!user && typeof hasPermission === 'function' && hasPermission('announcements', 'delete');
  }, [user, hasPermission]);

   


  // 📝 Create
const handlePost = async () => {
  if (!newTitle.trim() || !newBody.trim()) {
    toast.error("Please fill out both title and body");
    return;
  }

  try {
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
  }
};

// ✏️ Edit
const handleEdit = async (id) => {
  try {
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
  }
};

// ❌ Delete
const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to delete this announcement?"))
    return;
  try {
    await deleteAnnouncement(id);
    queryClient.setQueryData(announcementKeys.list(), (prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.filter((a) => String(a?._id) !== String(id));
    });
    toast.success("Announcement deleted!");
  } catch {
    toast.error("Network error — unable to delete");
  }
};


  return (
    
    
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-800">📢 Announcements</h1>

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
          <Button onClick={handlePost} variant="brand" icon={<Send size={18} />}>
            Post
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
                    <Button onClick={() => handleEdit(a._id)} variant="brand">Save</Button>
                    <Button onClick={() => setEditingId(null)} variant="neutral">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-gray-900">{a.title}</h1>
                  <p className="text-gray-700 mt-9">{a.body}</p>

                  <div className="flex justify-between items-center mt-10">
                    <p className="text-sm text-gray-500">
                      Posted by <strong>{a.author}</strong> ({a.role}) on{" "}
                      {new Date(a.date).toLocaleString()}
                    </p>

                    {user && (canEditAny || canDeleteAny) && (
                        <div className="flex items-center gap-3 text-gray-400">
                          {canEditAny ? (
                            <button
                              onClick={() => {
                                setEditingId(a._id);
                                setEditTitle(a.title);
                                setEditBody(a.body);
                              }}
                              className="hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                          ) : null}
                          {canDeleteAny ? (
                            <button
                              onClick={() => handleDelete(a._id)}
                              className="hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : null}
                        </div>
                      )}
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
