import React, { useState, useEffect } from "react";
import { Pencil, Trash2, Send } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../shared/components/ui/Button.jsx";
import Input from "../../../shared/components/ui/Input.jsx";
import Textarea from "../../../shared/components/ui/Textarea.jsx";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [user, setUser] = useState(null);

  // 🧠 Fetch logged-in user
  useEffect(() => {
    fetch("/api/auth/verify", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.user);
      })
      .catch(() => setUser(null));
  }, []);

  // 📢 Fetch announcements
  useEffect(() => {
    fetch("/api/announcements", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
        else setAnnouncements([]);
      })
      .catch(() => setAnnouncements([]));
  }, []);

  const canPost = user && (user.role === "admin" || user.role === "teacher");

   


  // 📝 Create
const handlePost = async () => {
  if (!newTitle.trim() || !newBody.trim()) {
    toast.error("Please fill out both title and body");
    return;
  }

  try {
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: newTitle, body: newBody }),
    });

    if (res.ok) {
      const data = await res.json();
      setAnnouncements([data, ...announcements]);
      setNewTitle("");
      setNewBody("");
      toast.success("Announcement posted successfully!");
    } else {
      const err = await res.json();
      toast.error(err.message || "Failed to post announcement");
    }
  } catch {
    toast.error("Network error — please try again");
  }
};

// ✏️ Edit
const handleEdit = async (id) => {
  try {
    const res = await fetch(`/api/announcements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: editTitle, body: editBody }),
    });

    if (res.ok) {
      const updated = await res.json();
      setAnnouncements((prev) =>
        prev.map((a) => (a._id === id ? updated : a))
      );
      setEditingId(null);
      setEditTitle("");
      setEditBody("");
      toast.success("Announcement updated!");
    } else {
      const err = await res.json();
      toast.error(err.message || "Failed to update announcement");
    }
  } catch {
    toast.error("Something went wrong. Try again later.");
  }
};

// ❌ Delete
const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to delete this announcement?"))
    return;
  try {
    const res = await fetch(`/api/announcements/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      toast.success("Announcement deleted!");
    } else {
      toast.error("Failed to delete announcement");
    }
  } catch {
    toast.error("Network error — unable to delete");
  }
};


  return (
    
    
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-800">📢 Announcements</h1>

      {canPost && (
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
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
        </div>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <p className="text-gray-500 italic">No announcements yet.</p>
        ) : (
          announcements.map((a) => (
            <div
              key={a._id}
              className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
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

                    {user &&
                      (user.username === a.author || user.role === "admin") && (
                        <div className="flex items-center gap-3 text-gray-400">
                          <button
                            onClick={() => {
                              setEditingId(a._id);
                              setEditTitle(a.title);
                              setEditBody(a.body);
                            }}
                            className="hover:text-blue-600 transition-colors"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(a._id)}
                            className="hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
