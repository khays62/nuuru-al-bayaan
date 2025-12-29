// import React, { useEffect, useState } from "react";
// import { API_BASE_URL } from "../../../api/apiService"; // adjust path

// export default function AnnouncementsPage() {
//   const [announcements, setAnnouncements] = useState([]);
//   const [title, setTitle] = useState("");
//   const [message, setMessage] = useState("");
//   const [role] = useState(localStorage.getItem("role") || "student"); // get user role

//   const fetchAnnouncements = async () => {
//     const res = await fetch(`${API_BASE_URL}/announcements?role=${role}`);
//     const data = await res.json();
//     setAnnouncements(data);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     await fetch(`${API_BASE_URL}/announcements`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${localStorage.getItem("token")}`,
//       },
//       body: JSON.stringify({ title, message, targetRoles: ["student", "teacher"] }),
//     });
//     setTitle("");
//     setMessage("");
//     fetchAnnouncements();
//   };

//   useEffect(() => {
//     fetchAnnouncements();
//   }, []);

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">Announcements</h1>

//       {/* Create form for admin */}
//       {role === "admin" && (
//         <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded shadow">
//           <input
//             className="border p-2 w-full mb-2"
//             placeholder="Title"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//           />
//           <textarea
//             className="border p-2 w-full mb-2"
//             placeholder="Message"
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//           />
//           <button className="bg-blue-600 text-white px-4 py-2 rounded">
//             Post Announcement
//           </button>
//         </form>
//       )}

//       {/* List of announcements */}
//       <div className="space-y-4">
//         {announcements.map((a) => (
//           <div key={a._id} className="bg-white shadow p-4 rounded">
//             <h2 className="font-semibold text-lg">{a.title}</h2>
//             <p className="text-gray-700 mt-1">{a.message}</p>
//             <div className="text-sm text-gray-500 mt-2">
//               Posted by {a.createdBy?.fullName || "System"} on{" "}
//               {new Date(a.createdAt).toLocaleDateString()}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }


// import React, { useState } from "react";

// export default function AnnouncementsPage() {
//   const [announcements, setAnnouncements] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const userRole = localStorage.getItem("role"); // assuming role is stored in localStorage

//   const handlePost = () => {
//     if (!newMessage.trim()) return;
//     const announcement = {
//       id: Date.now(),
//       text: newMessage,
//       date: new Date().toLocaleString(),
//     };
//     setAnnouncements([announcement, ...announcements]);
//     setNewMessage("");
//   };

//   return (
//     <div className="space-y-4">
//       <h1 className="text-2xl font-semibold text-gray-800">📢 Announcements</h1>

//       {(userRole === "admin" || userRole === "teacher") && (
//         <div className="bg-white p-4 rounded-lg shadow">
//           <textarea
//             value={newMessage}
//             onChange={(e) => setNewMessage(e.target.value)}
//             placeholder="Write an announcement..."
//             className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
//             rows={3}
//           />
//           <button
//             onClick={handlePost}
//             className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
//           >
//             Post
//           </button>
//         </div>
//       )}

//       <div className="space-y-3">
//         {announcements.length === 0 ? (
//           <p className="text-gray-500">No announcements yet.</p>
//         ) : (
//           announcements.map((a) => (
//             <div key={a.id} className="bg-white p-4 rounded-lg shadow">
//               <p className="text-gray-800">{a.text}</p>
//               <p className="text-xs text-gray-400 mt-2">Posted on {a.date}</p>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }


// import React, { useState, useEffect } from "react";

// export default function AnnouncementsPage() {
//   const [announcements, setAnnouncements] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [user, setUser] = useState(null);

//   // Fetch user from /verify
//   useEffect(() => {
//     fetch("http://localhost:7000/api/auth/verify", {
//       credentials: "include",
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.success) setUser(data.user);
//       })
//       .catch(() => setUser(null));
//   }, []);

//   // // Fetch announcements
//   // useEffect(() => {
//   //   fetch("http://localhost:7000/api/announcements", {
//   //     credentials: "include",
//   //   })
//   //     .then((res) => res.json())
//   //     .then(setAnnouncements)
//   //     .catch(() => setAnnouncements([]));
//   // }, []);

//   // Fetch announcements safely
// useEffect(() => {
//   fetch("http://localhost:7000/api/announcements", {
//     credentials: "include",
//   })
//     .then((res) => res.json())
//     .then((data) => {
//       if (Array.isArray(data)) setAnnouncements(data);
//       else if (data.announcements && Array.isArray(data.announcements))
//         setAnnouncements(data.announcements);
//       else setAnnouncements([]);
//     })
//     .catch(() => setAnnouncements([]));
// }, []);

//   const handlePost = async () => {
//     if (!newMessage.trim()) return;
//     const res = await fetch("http://localhost:7000/api/announcements", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include",
//       body: JSON.stringify({ message: newMessage }),
//     });

//     if (res.ok) {
//       const data = await res.json();
//       setAnnouncements([data, ...announcements]);
//       setNewMessage("");
//     }
//   };

//   const canPost =
//     user && (user.role === "admin" || user.role === "teacher");

//   return (
//     <div className="space-y-4">
//       <h1 className="text-2xl font-semibold text-gray-800">📢 Announcements</h1>

//       {canPost && (
//         <div className="bg-white p-4 rounded-lg shadow">
//           <textarea
//             value={newMessage}
//             onChange={(e) => setNewMessage(e.target.value)}
//             placeholder="Write an announcement..."
//             className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
//             rows={3}
//           />
//           <button
//             onClick={handlePost}
//             className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
//           >
//             Post
//           </button>
//         </div>
//       )}

//       <div className="space-y-3">
//         {announcements.length === 0 ? (
//           <p className="text-gray-500">No announcements yet.</p>
//         ) : (
//           announcements.map((a) => (
//             <div key={a._id} className="bg-white p-4 rounded-lg shadow">
//               <p className="text-gray-800">{a.message}</p>
//               <p className="text-xs text-gray-400 mt-2">
//                 Posted by {a.author} ({a.role}) on{" "}
//                 {new Date(a.date).toLocaleString()}
//               </p>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }


// import React, { useState, useEffect } from "react";
// import { Pencil, Trash2, Send } from "lucide-react";

// export default function AnnouncementsPage() {
//   const [announcements, setAnnouncements] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [editingId, setEditingId] = useState(null);
//   const [editMessage, setEditMessage] = useState("");
//   const [user, setUser] = useState(null);

//   // 🧠 Fetch logged-in user
//   useEffect(() => {
//     fetch("http://localhost:7000/api/auth/verify", { credentials: "include" })
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.success) setUser(data.user);
//       })
//       .catch(() => setUser(null));
//   }, []);

//   // 📢 Fetch announcements
//   useEffect(() => {
//     fetch("http://localhost:7000/api/announcements", { credentials: "include" })
//       .then((res) => res.json())
//       .then((data) => {
//         if (Array.isArray(data)) setAnnouncements(data);
//         else setAnnouncements([]);
//       })
//       .catch(() => setAnnouncements([]));
//   }, []);

//   const canPost = user && (user.role === "admin" || user.role === "teacher");

//   // ✏️ Post
//   const handlePost = async () => {
//     if (!newMessage.trim()) return;
//     const res = await fetch("http://localhost:7000/api/announcements", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include",
//       body: JSON.stringify({ message: newMessage }),
//     });
//     if (res.ok) {
//       const data = await res.json();
//       setAnnouncements([data, ...announcements]);
//       setNewMessage("");
//     }
//   };

//   // ✏️ Edit
//   const handleEdit = async (id) => {
//     const res = await fetch(`http://localhost:7000/api/announcements/${id}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include",
//       body: JSON.stringify({ message: editMessage }),
//     });
//     if (res.ok) {
//       const updated = await res.json();
//       setAnnouncements((prev) => prev.map((a) => (a._id === id ? updated : a)));
//       setEditingId(null);
//       setEditMessage("");
//     }
//   };

//   // ❌ Delete
//   const handleDelete = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this announcement?")) return;
//     const res = await fetch(`http://localhost:7000/api/announcements/${id}`, {
//       method: "DELETE",
//       credentials: "include",
//     });
//     if (res.ok) {
//       setAnnouncements((prev) => prev.filter((a) => a._id !== id));
//     }
//   };

//   return (
//     <div className="space-y-6 p-6">
//       <h1 className="text-3xl font-bold text-gray-800">📢 Announcements</h1>

//       {canPost && (
//         <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
//           <textarea
//             value={newMessage}
//             onChange={(e) => setNewMessage(e.target.value)}
//             placeholder="Write a new announcement..."
//             className="w-full border border-gray-200 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 resize-none"
//             rows={3}
//           />
//           <button
//             onClick={handlePost}
//             className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
//           >
//             <Send size={18} /> Post
//           </button>
//         </div>
//       )}

//       <div className="space-y-4">
//         {announcements.length === 0 ? (
//           <p className="text-gray-500 italic">No announcements yet.</p>
//         ) : (
//           announcements.map((a) => (
//             <div
//               key={a._id}
//               className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
//             >
//               {editingId === a._id ? (
//                 <div>
//                   <textarea
//                     value={editMessage}
//                     onChange={(e) => setEditMessage(e.target.value)}
//                     className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
//                     rows={3}
//                   />
//                   <div className="flex gap-3 mt-3">
//                     <button
//                       onClick={() => handleEdit(a._id)}
//                       className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
//                     >
//                       Save
//                     </button>
//                     <button
//                       onClick={() => setEditingId(null)}
//                       className="bg-gray-300 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-400"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <>
//                   <p className="text-gray-800 text-lg">{a.message}</p>
//                   <div className="flex justify-between items-center mt-3">
//                     <p className="text-sm text-gray-500">
//                       Posted by <strong>{a.author}</strong> ({a.role}) on{" "}
//                       {new Date(a.date).toLocaleString()}
//                     </p>

//                     {user &&
//                       (user.username === a.author || user.role === "admin") && (
//                         <div className="flex items-center gap-3 text-gray-400">
//                           <button
//                             onClick={() => {
//                               setEditingId(a._id);
//                               setEditMessage(a.message);
//                             }}
//                             className="hover:text-blue-600 transition-colors"
//                           >
//                             <Pencil size={18} />
//                           </button>
//                           <button
//                             onClick={() => handleDelete(a._id)}
//                             className="hover:text-red-600 transition-colors"
//                           >
//                             <Trash2 size={18} />
//                           </button>
//                         </div>
//                       )}
//                   </div>
//                 </>
//               )}
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }


// import React, { useState, useEffect } from "react";
// import { Pencil, Trash2, Send, X } from "lucide-react";

// export default function AnnouncementsPage() {
//   const [announcements, setAnnouncements] = useState([]);
//   const [newTitle, setNewTitle] = useState("");
//   const [newBody, setNewBody] = useState("");
//   const [editingId, setEditingId] = useState(null);
//   const [editTitle, setEditTitle] = useState("");
//   const [editBody, setEditBody] = useState("");
//   const [user, setUser] = useState(null);

//   // Fetch user
//   useEffect(() => {
//     fetch("http://localhost:7000/api/auth/verify", { credentials: "include" })
//       .then((res) => res.json())
//       .then((data) => data.success && setUser(data.user))
//       .catch(() => setUser(null));
//   }, []);

//   // Fetch announcements
//   useEffect(() => {
//     fetch("http://localhost:7000/api/announcements", { credentials: "include" })
//       .then((res) => res.json())
//       .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
//       .catch(() => setAnnouncements([]));
//   }, []);

//   const canPost = user && (user.role === "admin" || user.role === "teacher");

//   // Create
//   const handlePost = async () => {
//     if (!newTitle.trim() || !newBody.trim()) return;

//     const res = await fetch("http://localhost:7000/api/announcements", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include",
//       body: JSON.stringify({ title: newTitle, body: newBody }),
//     });

//     if (res.ok) {
//       const data = await res.json();
//       setAnnouncements([data, ...announcements]);
//       setNewTitle("");
//       setNewBody("");
//     }
//   };

//   // Edit
//   const handleEdit = async (id) => {
//     const res = await fetch(`http://localhost:7000/api/announcements/${id}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include",
//       body: JSON.stringify({ title: editTitle, body: editBody }),
//     });

//     if (res.ok) {
//       const updated = await res.json();
//       setAnnouncements((prev) => prev.map((a) => (a._id === id ? updated : a)));
//       setEditingId(null);
//       setEditTitle("");
//       setEditBody("");
//     }
//   };

//   // Delete
//   const handleDelete = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this?")) return;

//     const res = await fetch(`http://localhost:7000/api/announcements/${id}`, {
//       method: "DELETE",
//       credentials: "include",
//     });

//     if (res.ok) {
//       setAnnouncements((prev) => prev.filter((a) => a._id !== id));
//     }
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6 space-y-6">
//       <h1 className="text-4xl font-bold text-gray-800 mb-6 tracking-tight">
//         📢 Announcements
//       </h1>

//       {canPost && (
//         <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
//           <input
//             value={newTitle}
//             onChange={(e) => setNewTitle(e.target.value)}
//             placeholder="Announcement title..."
//             className="w-full border border-gray-200 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500 text-lg font-medium"
//           />
//           <textarea
//             value={newBody}
//             onChange={(e) => setNewBody(e.target.value)}
//             placeholder="Write announcement details..."
//             className="w-full border border-gray-200 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500 text-gray-700 resize-none"
//             rows={4}
//           />
//           <button
//             onClick={handlePost}
//             className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
//           >
//             <Send size={18} /> Post Announcement
//           </button>
//         </div>
//       )}

//       <div className="space-y-5">
//         {announcements.length === 0 ? (
//           <p className="text-gray-500 italic text-center">
//             No announcements yet.
//           </p>
//         ) : (
//           announcements.map((a) => (
//             <div
//               key={a._id}
//               className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300"
//             >
//               {editingId === a._id ? (
//                 <>
//                   <input
//                     value={editTitle}
//                     onChange={(e) => setEditTitle(e.target.value)}
//                     className="w-full border border-gray-300 rounded-lg p-2 mb-2 font-semibold text-lg"
//                   />
//                   <textarea
//                     value={editBody}
//                     onChange={(e) => setEditBody(e.target.value)}
//                     className="w-full border border-gray-300 rounded-lg p-2"
//                     rows={3}
//                   />
//                   <div className="flex gap-3 mt-3">
//                     <button
//                       onClick={() => handleEdit(a._id)}
//                       className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
//                     >
//                       Save
//                     </button>
//                     <button
//                       onClick={() => setEditingId(null)}
//                       className="bg-gray-300 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-400"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <h2 className="text-xl font-semibold text-gray-900 mb-2">
//                     {a.title}
//                   </h2>
//                   <p className="text-gray-700 whitespace-pre-line">{a.body}</p>
//                   <div className="flex justify-between items-center mt-4">
//                     <p className="text-sm text-gray-500">
//                       Posted by <strong>{a.author}</strong> ({a.role}) on{" "}
//                       {new Date(a.date).toLocaleString()}
//                     </p>

//                     {user &&
//                       (user.username === a.author || user.role === "admin") && (
//                         <div className="flex items-center gap-3 text-gray-400">
//                           <button
//                             onClick={() => {
//                               setEditingId(a._id);
//                               setEditTitle(a.title);
//                               setEditBody(a.body);
//                             }}
//                             className="hover:text-blue-600 transition"
//                           >
//                             <Pencil size={18} />
//                           </button>
//                           <button
//                             onClick={() => handleDelete(a._id)}
//                             className="hover:text-red-600 transition"
//                           >
//                             <Trash2 size={18} />
//                           </button>
//                         </div>
//                       )}
//                   </div>
//                 </>
//               )}
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

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
