import React, { useState, useEffect } from "react";
import { Pencil, Trash2, Send } from "lucide-react";

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
    fetch("http://localhost:7000/api/auth/verify", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.user);
      })
      .catch(() => setUser(null));
  }, []);

  // 📢 Fetch announcements
  useEffect(() => {
    fetch("http://localhost:7000/api/announcements", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
        else setAnnouncements([]);
      })
      .catch(() => setAnnouncements([]));
  }, []);

  const canPost = user && (user.role === "admin" || user.role === "teacher");

  // 📝 Create
  // const handlePost = async () => {
  //   if (!newTitle.trim() || !newBody.trim()) return;

  //   const res = await fetch("http://localhost:7000/api/announcements", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     credentials: "include",
  //     body: JSON.stringify({ title: newTitle, body: newBody }),
  //   });

  //   if (res.ok) {
  //     const data = await res.json();
  //     setAnnouncements([data, ...announcements]);
  //     setNewTitle("");
  //     setNewBody("");
  //   }
  // };

  // const handlePost = async () => {
  //   if (!newTitle.trim() || !newBody.trim()) return;
  
  //   const res = await fetch("http://localhost:7000/api/announcements", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     credentials: "include",
  //     body: JSON.stringify({ title: newTitle, body: newBody }),
  //   });
  
  //   if (res.ok) {
  //     const data = await res.json();
  //     setAnnouncements([data, ...announcements]);
  //     setNewTitle("");
  //     setNewBody("");
  //   } else {
  //     const err = await res.json();
  //     console.error("❌ Post failed:", err);
  //   }
  // };
  

  // // ✏️ Edit
  // const handleEdit = async (id) => {
  //   const res = await fetch(`http://localhost:7000/api/announcements/${id}`, {
  //     method: "PUT",
  //     headers: { "Content-Type": "application/json" },
  //     credentials: "include",
  //     body: JSON.stringify({ title: editTitle, body: editBody }),
  //   });

  //   if (res.ok) {
  //     const updated = await res.json();
  //     setAnnouncements((prev) => prev.map((a) => (a._id === id ? updated : a)));
  //     setEditingId(null);
  //     setEditTitle("");
  //     setEditBody("");
  //   }
  // };

  // // ❌ Delete
  // const handleDelete = async (id) => {
  //   if (!window.confirm("Are you sure you want to delete this announcement?")) return;
  //   const res = await fetch(`http://localhost:7000/api/announcements/${id}`, {
  //     method: "DELETE",
  //     credentials: "include",
  //   });
  //   if (res.ok) {
  //     setAnnouncements((prev) => prev.filter((a) => a._id !== id));
  //   }
  // };


  // 📝 Create
const handlePost = async () => {
  if (!newTitle.trim() || !newBody.trim()) {
    toast.error("Please fill out both title and body");
    return;
  }

  try {
    const res = await fetch("http://localhost:7000/api/announcements", {
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
  } catch (error) {
    toast.error("Network error — please try again");
  }
};

// ✏️ Edit
const handleEdit = async (id) => {
  try {
    const res = await fetch(`http://localhost:7000/api/announcements/${id}`, {
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
    const res = await fetch(`http://localhost:7000/api/announcements/${id}`, {
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
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Announcement title..."
            className="w-full border border-gray-200 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Write your announcement details..."
            className="w-full border border-gray-200 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
          <button
            onClick={handlePost}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            <Send size={18} /> Post
          </button>
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
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Edit title"
                    className="w-full border border-gray-300 rounded-lg p-2 mb-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    rows={3}
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleEdit(a._id)}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-gray-300 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
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
