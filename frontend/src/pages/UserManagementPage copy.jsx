// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useAuth } from "../contexts/AuthContext";
// // import { Eye, Pencil, Trash2 } from "lucide-react";

// import {
//   listUsers,
//   createUser,
//   updateUser,
//   toggleUserStatus,
// } from "../api";
// import Modal from "../components/common/Modal";
// import { Eye, Pencil, Trash2, RotateCcw, Repeat } from 'lucide-react';
// import TableShell from "../components/common/table/TableShell";
// import SearchInput from "../components/common/DataToolbar/SearchInput";
// import PaginationControls from "../components/common/Pagination/PaginationControls";
// import LoadingState from "../components/common/Feedback/LoadingState";
// import EmptyState from "../components/common/Feedback/EmptyState";
// import StatusBadge from '../components/common/badges/StatusBadge';
// import ActionButton from "../components/common/ActionButton";
// import DataToolbar from "../components/common/DataToolbar/DataToolbar";
// import FilterSelect from "../components/common/DataToolbar/FilterSelect";
// import { Link } from "react-router-dom";
// import toast from "react-hot-toast";

// /* ---------------- MODULE -> allowed permissions ---------------- */
// const MODULE_PERMISSIONS = {
//   // Registration modules
//   students: ["view", "add", "edit", "transfer", "deactivate", "reactive", "download", "full"],
//   teachers: ["view", "add", "edit", "transfer", "deactivate", "reactive", "full"],
//   cohorts: ["view", "add", "edit", "delete", "full"],
//   promotions: ["preview", "promote", "full"],
//   transcript: ["print", "download", "full"],

//   // Exam modules
//   subjects: ["view", "add", "edit", "delete", "full"],
//   grades: ["view", "add", "edit", "delete", "full"],
//   exams: ["view", "input", "full"], // "input" = exam management / score entry
//   results: ["download", "print", "full"],
// };

// /* ---------------- Role -> default permissions ---------------- */
// const ROLE_DEFAULTS = {
//   registration: {
//     students: { view: true, add: true, edit: true, transfer: true, deactivate: true, reactive: true, download: true },
//     teachers: { view: true, add: true, edit: true, transfer: true, deactivate: true, reactive: true },
//     cohorts: { view: true, add: true, edit: true, delete: true },
//     promotions: { preview: true, promote: true },
//     transcript: { print: true, download: true },
//   },
//   exam_office: {
//     subjects: { view: true, add: true, edit: true, delete: true },
//     grades: { view: true, add: true, edit: true, delete: true },
//     exams: { view: true, input: true },
//     results: { download: true, print: true },
//   },
//   admin: {},
// };

// /* ---------------- helper to build empty permissions object ---------------- */
// const MODULES = Object.keys(MODULE_PERMISSIONS);

// const buildEmptyPermissions = () => {
//   const out = {};
//   MODULES.forEach((m) => {
//     out[m] = {};
//     MODULE_PERMISSIONS[m].forEach((p) => (out[m][p] = false));
//     if (!("full" in out[m])) out[m].full = false;
//   });
//   return out;
// };

// const emptyPermissions = buildEmptyPermissions();

// /* ---------------- utility: apply role defaults ---------------- */
// const applyRoleDefaults = (role) => {
//   const base = JSON.parse(JSON.stringify(emptyPermissions));
//   const def = ROLE_DEFAULTS[role] || {};
//   Object.keys(def).forEach((mod) => {
//     if (!base[mod]) base[mod] = {};
//     Object.keys(def[mod]).forEach((perm) => {
//       if (perm in base[mod]) base[mod][perm] = !!def[mod][perm];
//     });
//     const nonFull = MODULE_PERMISSIONS[mod].filter((p) => p !== "full");
//     const allTrue = nonFull.length > 0 && nonFull.every((p) => base[mod][p] === true);
//     base[mod].full = allTrue;
//   });
//   return base;
// };

// export default function UserManagementPage() {
//   const [users, setUsers] = useState([]);
//   const [search, setSearch] = useState("");
//   const [showModal, setShowModal] = useState(false);
//   const [editingUser, setEditingUser] = useState(null);
//   const [openMenu, setOpenMenu] = useState(null);
//   // const indexOfLastUser = currentPage * limit;
//   // const indexOfFirstUser = indexOfLastUser - limit;
//   // const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
//   const [isLoading, setIsLoading] = useState(true);

//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const [rowsPerPage, setRowsPerPage] = useState(5);
//   const [limit, setLimit] = useState(10);
//   const [roleFilter, setRoleFilter] = useState("");
//   const [statusFilter, setStatusFilter] = useState("");
//    const [meta, setMeta] = useState({
//     page: 1,
//     totalPages: 1,
//     total: 0,
//     limit: 10,
//   });
//   const [form, setForm] = useState({
//     fullName: "",
//     username: "",
//     email: "",
//     phone: "",
//     password: "",
//     confirmPassword: "",
//     role: "registration",
//     permissions: JSON.parse(JSON.stringify(emptyPermissions)),
//     selectedModule: "",
//   });

//   /* ----------------- handle outside click for menu ----------------- */
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (!e.target.closest(".menu-button") && !e.target.closest(".menu-dropdown")) {
//         setOpenMenu(null);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   /* ----------------- fetch users ----------------- */
//   // const fetchUsers = async () => {
//   //   try {
//   //     const data = await listUsers({ search });
//   //     setUsers(Array.isArray(data) ? data : []);
//   //     setCurrentPage(1);
//   //   } catch (err) {
//   //     console.error("Failed to fetch users", err);
//   //     setUsers([]);
//   //   }
//   // };

//   // const fetchUsers = async () => {
//   //   setIsLoading(true); // start loading
    
//   //   try {
//   //     const data = await listUsers({ search });
//   //     setUsers(Array.isArray(data) ? data : []);
//   //     setCurrentPage(1);
//   //   } catch (err) {
//   //     console.error("Failed to fetch users", err);
//   //     setUsers([]);
//   //   } finally {
//   //     setIsLoading(false); // stop loading
//   //   }
//   // };
  
//   // useEffect(() => {
//   //    setCurrentPage(1);
//   //   fetchUsers();
//   // }, [limit, search, roleFilter, statusFilter]);

//   const fetchUsers = async () => {
//     setIsLoading(true); // start loading
  
//     try {
//       const data = await listUsers({ search, role: roleFilter, status: statusFilter });
  
//       // Make sure data is an array
//       const usersArray = Array.isArray(data) ? data : [];
  
//       // Sort by creation date descending (latest first)
//       const sortedUsers = usersArray.sort(
//         (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//       );
  
//       setUsers(sortedUsers);
//       setCurrentPage(1);
//     } catch (err) {
//       console.error("Failed to fetch users", err);
//       setUsers([]);
//     } finally {
//       setIsLoading(false); // stop loading
//     }
//   };
  
//   // refetch users when filters or limit/search changes
//   useEffect(() => {
//     setCurrentPage(1);
//     fetchUsers();
//   }, [limit, search, roleFilter, statusFilter]);
  

//   /* ----------------- handle form changes ----------------- */
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name === "phone") {
//       // Only allow digits
//       if (!/^\d*$/.test(value)) {
//         toast.error("Phone must contain digits only");
//         return;
//       }
    
//       // Limit to 9 digits
//       if (value.length > 9) {
//         toast.error("Phone number cannot exceed 9 digits");
//         return;
//       }
    
//       // Update state if valid
//       setForm((prev) => ({ ...prev, phone: value }));
//       return;
//     }
    
//     if (name === "role") {
//       setForm((prev) => ({
//         ...prev,
//         role: value,
//         permissions: applyRoleDefaults(value),
//         selectedModule: "", // reset module selection when role changes
//       }));
//       return;
//     }
//     setForm((prev) => ({ ...prev, [name]: value }));
//   };

//   /* ----------------- toggle permissions ----------------- */
//   const togglePermission = (module, permission) => {
//     setForm((prev) => {
//       const permissions = JSON.parse(JSON.stringify(prev.permissions || emptyPermissions));

//       if (!permissions[module]) {
//         permissions[module] = {};
//         MODULE_PERMISSIONS[module].forEach((p) => (permissions[module][p] = false));
//       }

//       if (permission === "full") {
//         const newFull = !permissions[module].full;
//         MODULE_PERMISSIONS[module].forEach((p) => {
//           permissions[module][p] = newFull;
//         });
//         permissions[module].full = newFull;
//       } else {
//         permissions[module][permission] = !permissions[module][permission];
//         const nonFullPerms = MODULE_PERMISSIONS[module].filter((p) => p !== "full");
//         const allNonFullTrue =
//           nonFullPerms.length > 0 && nonFullPerms.every((p) => permissions[module][p] === true);
//         permissions[module].full = allNonFullTrue;
//       }

//       return { ...prev, permissions };
//     });
//   };

//   /* ----------------- reset form ----------------- */
//   const resetForm = () => {
//     setForm({
//       fullName: "",
//       username: "",
//       email: "",
//       phone: "",
//       password: "",
//       confirmPassword: "",
//       role: "registration",
//       permissions: JSON.parse(JSON.stringify(emptyPermissions)),
//       selectedModule: "",
//     });
//     setEditingUser(null);
//   };

//   /* ----------------- handle submit ----------------- */
//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();

//   //   if (!editingUser && !form.password) {
//   //     alert("Password is required for new users");
//   //     return;
//   //   }
//   //   if (form.password || form.confirmPassword) {
//   //     if (form.password !== form.confirmPassword) {
//   //       alert("Passwords do not match");
//   //       return;
//   //     }
//   //   }

//   //   const cleanedPermissions = {};
//   //   Object.keys(form.permissions || {}).forEach((m) => {
//   //     if (!MODULE_PERMISSIONS[m]) return;
//   //     cleanedPermissions[m] = {};
//   //     MODULE_PERMISSIONS[m].forEach((p) => {
//   //       cleanedPermissions[m][p] = !!form.permissions[m][p];
//   //     });
//   //   });

//   //   const payload = {
//   //     fullName: form.fullName,
//   //     username: form.username,
//   //     email: form.email,
//   //     phone: form.phone,
//   //     role: form.role,
//   //     permissions: cleanedPermissions,
//   //   };
//   //   if (form.password) payload.password = form.password;

//   //   try {
//   //     if (editingUser) await updateUser(editingUser._id, payload);
//   //     else await createUser(payload);

//   //     setShowModal(false);
//   //     resetForm();
//   //     fetchUsers();
//   //   } catch (err) {
//   //     console.error("Failed to save user", err);
//   //     alert("Failed to save user");
//   //   }
//   // };

//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();
  
//   //   if (!editingUser && !form.password) {
//   //     alert("Password is required for new users");
//   //     return;
//   //   }
  
//   //   if (form.password || form.confirmPassword) {
//   //     if (form.password !== form.confirmPassword) {
//   //       alert("Passwords do not match");
//   //       return;
//   //     }
//   //   }
  
//   //   const cleanedPermissions = {};
//   //   Object.keys(form.permissions || {}).forEach((m) => {
//   //     if (!MODULE_PERMISSIONS[m]) return;
//   //     cleanedPermissions[m] = {};
//   //     MODULE_PERMISSIONS[m].forEach((p) => {
//   //       cleanedPermissions[m][p] = !!form.permissions[m][p];
//   //     });
//   //   });
  
//   //   const payload = {
//   //     fullName: form.fullName,
//   //     username: form.username,
//   //     email: form.email,
//   //     phone: form.phone,
//   //     role: form.role,
//   //     permissions: cleanedPermissions,
//   //   };
//   //   if (form.password) payload.password = form.password;
  
//   //   setIsLoading(true);  // 🔥 start loading skeleton
  
//   //   try {
//   //     if (editingUser) {
//   //       await updateUser(editingUser._id, payload);
//   //     } else {
//   //       await createUser(payload);
//   //     }
  
//   //     setShowModal(false);
//   //     resetForm();
//   //     await fetchUsers(); // reload table
//   //   } catch (err) {
//   //     console.error("Failed to save user", err);
//   //     alert("Failed to save user");
//   //   } finally {
//   //     setIsLoading(false); // 🔥 stop loading skeleton
//   //   }
//   // };

//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();
  
//   //   // --- Validation ---
//   //   if (!editingUser && !form.password) {
//   //     toast.error("Password is required for new users");
//   //     return;
//   //   }
  
//   //   if (form.password || form.confirmPassword) {
//   //     if (form.password !== form.confirmPassword) {
//   //       toast.error("Passwords do not match");
//   //       return;
//   //     }
//   //   }
  
//   //   // --- Clean Permissions ---
//   //   const cleanedPermissions = {};
//   //   Object.keys(form.permissions || {}).forEach((m) => {
//   //     if (!MODULE_PERMISSIONS[m]) return;
//   //     cleanedPermissions[m] = {};
//   //     MODULE_PERMISSIONS[m].forEach((p) => {
//   //       cleanedPermissions[m][p] = !!form.permissions[m][p];
//   //     });
//   //   });
  
//   //   const payload = {
//   //     fullName: form.fullName,
//   //     username: form.username,
//   //     email: form.email,
//   //     phone: form.phone,
//   //     role: form.role,
//   //     permissions: cleanedPermissions,
//   //   };
//   //   if (form.password) payload.password = form.password;
  
//   //   // --- Start Loading ---
//   //   setIsLoading(true);
  
//   //   try {
//   //     if (editingUser) {
//   //       await updateUser(editingUser._id, payload);
//   //       toast.success("User updated successfully");
//   //     } else {
//   //       await createUser(payload);
//   //       toast.success("User created successfully");
//   //     }
  
//   //     // Close Modal + Reset
//   //     setShowModal(false);
//   //     resetForm();
  
//   //     // Refresh table
//   //     await fetchUsers();
  
//   //   } catch (err) {
//   //     console.error("Failed to save user", err);
//   //     toast.error("Failed to save user");
//   //   } finally {
//   //     // --- Stop Loading ---
//   //     setIsLoading(false);
//   //   }
//   // };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
  
//     // Password checks
//     if (!editingUser && !form.password) {
//       toast.error("Password is required for new users");
//       return;
//     }
//     if (form.password || form.confirmPassword) {
//       if (form.password !== form.confirmPassword) {
//         toast.error("Passwords do not match");
//         return;
//       }
//     }
  
//     // Clean permissions
//     const cleanedPermissions = {};
//     Object.keys(form.permissions || {}).forEach((m) => {
//       if (!MODULE_PERMISSIONS[m]) return;
//       cleanedPermissions[m] = {};
//       MODULE_PERMISSIONS[m].forEach((p) => {
//         cleanedPermissions[m][p] = !!form.permissions[m][p];
//       });
//     });
  
//     const payload = {
//       fullName: form.fullName,
//       username: form.username,
//       email: form.email,
//       phone: form.phone,
//       role: form.role,
//       permissions: cleanedPermissions,
//     };
//     if (form.password) payload.password = form.password;
  
//     try {
//       setIsLoading(true);
  
//       // Check for existing username/email/phone
//       const exists = users.some((u) => {
//         if (editingUser && u._id === editingUser._id) return false; // skip current user when editing
//         return (
//           u.username === form.username ||
//           u.email === form.email ||
//           (form.phone && u.phone === form.phone)
//         );
//       });
  
//       if (exists) {
//         toast.error("Username, Email, or Phone already exists");
//         return;
//       }
  
//       // Create or update
//       if (editingUser) {
//         await updateUser(editingUser._id, payload);
//         toast.success("User updated successfully");
//       } else {
//         await createUser(payload);
//         toast.success("User created successfully");
//       }
  
//       setShowModal(false);
//       resetForm();
//       fetchUsers();
//     } catch (err) {
//       console.error("Failed to save user", err);
//       toast.error("Failed to save user");
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
  
  
//   /* ----------------- handle edit user ----------------- */
//   // const handleEditUser = (user) => {
//   //   setEditingUser(user);
//   //   const permissions = JSON.parse(JSON.stringify(emptyPermissions));
//   //   const userPerms = user.permissions || {};
//   //   MODULES.forEach((m) => {
//   //     if (userPerms[m]) {
//   //       MODULE_PERMISSIONS[m].forEach((p) => {
//   //         permissions[m][p] = !!userPerms[m][p];
//   //       });
//   //       const nonFull = MODULE_PERMISSIONS[m].filter((p) => p !== "full");
//   //       const allTrue = nonFull.length > 0 && nonFull.every((p) => permissions[m][p] === true);
//   //       permissions[m].full = permissions[m].full || allTrue;
//   //     }
//   //   });

//   //   setForm({
//   //     fullName: user.fullName || "",
//   //     username: user.username || "",
//   //     email: user.email || "",
//   //     phone: user.phone || "",
//   //     password: "",
//   //     confirmPassword: "",
//   //     role: user.role || "registration_office",
//   //     permissions,
//   //     selectedModule: "",
//   //   });

//   //   setShowModal(true);
//   // };

//   const handleEditUser = (user) => {
//     try {
//       setIsLoading(true); // show skeleton / disable UI
//       setEditingUser(user);
  
//       const permissions = JSON.parse(JSON.stringify(emptyPermissions));
//       const userPerms = user.permissions || {};
  
//       MODULES.forEach((m) => {
//         if (userPerms[m]) {
//           MODULE_PERMISSIONS[m].forEach((p) => {
//             permissions[m][p] = !!userPerms[m][p];
//           });
  
//           // Auto-check full access if all permissions except "full" are true
//           const nonFull = MODULE_PERMISSIONS[m].filter((p) => p !== "full");
//           const allTrue =
//             nonFull.length > 0 &&
//             nonFull.every((p) => permissions[m][p] === true);
  
//           permissions[m].full = permissions[m].full || allTrue;
//         }
//       });
  
//       // Fill form with selected user's data
//       setForm({
//         fullName: user.fullName || "",
//         username: user.username || "",
//         email: user.email || "",
//         phone: user.phone || "",
//         password: "",
//         confirmPassword: "",
//         role: user.role || "registration",
//         permissions,
//         selectedModule: "",
//       });
  
//       setShowModal(true);
//       // toast.success("Loaded user for editing"); // optional
  
//     } catch (err) {
//       console.error("Failed to load user for edit", err);
//       toast.error("Failed to load user details");
//     } finally {
//       setIsLoading(false); // stop skeleton
//     }
//   };
  
//   /* ----------------- toggle user status ----------------- */
//   const handleToggleStatus = async (id) => {
//     setIsLoading(true);

//     try {
//       await toggleUserStatus(id);
//       fetchUsers();
//       toast.success("Status updated!");
//     } catch (err) {
//       console.error("Failed to toggle user status", err);
//       toast.error("Failed to toggle user status");
//     } finally {
//       setIsLoading(false);
//     }
//   };

  //   const handleResetLockout = async (id) => {
  //   setIsLoading(true);

  //   try {
  //     await fetch(`/api/auth/users/${id}/reset-lockout`, {
  //       method: "PATCH",
  //       headers: { "Content-Type": "application/json" },
  //     });
  //     // alert("Login lockout reset successfully");
  //     toast.success("Login lockout reset successfully")
  //     fetchUsers();
  //   } catch (err) {
  //     console.error("Reset lockout failed", err);
  //     // alert("Failed to reset lockout");
  //     toast.error("Failed to reset lockout")
  //   }  finally {
  //     setIsLoading(false);
  //   }
  // };

//   /* ----------------- reset role defaults ----------------- */
//   const resetToRoleDefaults = () => {
//     setForm((prev) => ({ ...prev, permissions: applyRoleDefaults(prev.role), selectedModule: "" }));
//   };

//   /* ----------------- filtered modules by role ----------------- */
//   const getFilteredModules = () => {
//     if (form.role === "registration") {
//       return ["students", "teachers", "cohorts", "promotions", "transcript"];
//     } else if (form.role === "exam") {
//       return ["subjects", "grades", "exams", "results"];
//     } else {
//       return MODULES;
//     }
//   };
//   const { hasPermission } = useAuth();


//   // ========== STATE ==========
//   // const [users, setUsers] = useState([]);



//   const [page, setPage] = useState(1);

 


// // Pagination slice
// // const indexOfLast = currentPage * rowsPerPage;
// // const indexOfFirst = indexOfLast - rowsPerPage;
// // const currentUsers = users.slice(indexOfFirst, indexOfLast);



// // const indexOfLast = currentPage * limit;
// // const indexOfFirst = indexOfLast - limit;
// // const currentUsers = users.slice(indexOfFirst, indexOfLast);

// // 1️⃣ Apply filtering before slicing for pagination
// const filteredUsers = users.filter((u) => {
//   const roleMatch = roleFilter ? u.role === roleFilter : true;
//   const statusMatch = statusFilter ? u.status === statusFilter : true;
//   return roleMatch && statusMatch;
// });

// // 2️⃣ Pagination slice
// const indexOfLast = currentPage * limit;
// const indexOfFirst = indexOfLast - limit;
// const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);



//   return (
//     <div className="space-y-5">
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
//         {/* <input
//           type="text"
//           placeholder="Search users..."
//           className="border rounded px-3 py-2 w-full md:w-1/3"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         /> */}
//       <div>
//         <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
//         <p className="mt-1 text-sm text-gray-600">Manage all user records in the system.</p>
//       </div>
//         <div className="flex items-center gap-2">
//           <button
//             className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
//             onClick={() => {
//               resetForm();
//               setForm((prev) => ({ ...prev, permissions: applyRoleDefaults(prev.role) }));
//               setShowModal(true);
//             }}
//           >
//             + Add User
//           </button>
//         </div>
//       </div>
//        {/* <div className="flex justify-end ">
//           <button
//             className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
//             onClick={() => {
//               resetForm();
//               setForm((prev) => ({ ...prev, permissions: applyRoleDefaults(prev.role) }));
//               setShowModal(true);
//             }}
//           >
//             + Add User
//           </button>
//         </div> */}
//       <DataToolbar
//         searchSlot={
//           <SearchInput
//             value={search}
//             // onChange={(v) => {
//             //   setSearch(v);
//             //   setPage(1);
//             // }}
//             onChange={(e) =>{ setSearch(e.target.value); setCurrentPage(1);}}

            
//             placeholder="Search by name or username..."
//           />
//         }
//         onReset={() => {
//           setSearch("");
//           setRoleFilter("");
//           setStatusFilter("");
//           setCurrentPage(1);
//         }}
//         // filtersSlot={
//         //   <div className="flex gap-3">
//         //     <FilterSelect
//         //       value={roleFilter}
//         //       onChange={(v) => {
//         //         setRoleFilter(v);
//         //         setCurrentPage(1);
//         //       }}
//         //       placeholder="Role"
//         //       options={[
//         //         { value: "Admin", label: "Admin" },
//         //         { value: "Registration", label: "Registration" },
//         //         { value: "Exam", label: "Exam" },
//         //       ]}
//         //     />

//         //     <FilterSelect
//         //       value={statusFilter}
//         //       onChange={(v) => {
//         //         setStatusFilter(v);
//         //         setCurrentPage(1);
//         //       }}
//         //       placeholder="Status"
//         //       options={[
//         //         { value: "active", label: "Active" },
//         //         { value: "inactive", label: "Inactive" },
//         //       ]}
//         //     />
//         //   </div>
//         // }
//         filtersSlot={
//           <div className="flex gap-3">
//             <FilterSelect
//               value={roleFilter}
//               onChange={(v) => {
//                 setRoleFilter(v);
//                 setCurrentPage(1);
//               }}
//               placeholder="Role"
//               options={[
//                 { value: "admin", label: "Admin" },
//                 { value: "registration", label: "Registration" },
//                 { value: "exam", label: "Exam" },
//               ]}
//             />
        
//             <FilterSelect
//               value={statusFilter}
//               onChange={(v) => {
//                 setStatusFilter(v);
//                 setCurrentPage(1);
//               }}
//               placeholder="Status"
//               options={[
//                 { value: "active", label: "Active" },
//                 { value: "inactive", label: "Inactive" },
//               ]}
//             />
//           </div>
//         }
        
//       />

//       {/* ================= TABLE ================= */}
//       {isLoading ? (
//         <LoadingState variant="table" message="Loading users..." rows={6} columns={5} />
//       ) : users.length === 0 ? (
//         <EmptyState
//           title="No users found"
//           description="Try adjusting filters or add a new user."
//         />
//       ) : (
//         // <TableShell>
//         //   <thead className="bg-gray-800">
//         //     <tr>
//         //       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border">
//         //         Full Name
//         //       </th>
//         //       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border">
//         //         Username
//         //       </th>
//         //       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border">
//         //         Role
//         //       </th>
//         //       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border">
//         //         Status
//         //       </th>
//         //       <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border">
//         //         Actions
//         //       </th>
//         //     </tr>
//         //   </thead>

//         //   <tbody className="divide-y divide-gray-200">
//         //     {users.map((u) => (
//         //       <tr key={u._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50">
//         //         <td className="px-6 py-4 border">{u.fullName}</td>
//         //         <td className="px-6 py-4 border">{u.username}</td>
//         //         <td className="px-6 py-4 border">{u.role}</td>
//         //         <td className="px-6 py-4 border capitalize">
//         //           {u.status || "active"}
//         //         </td>

//         //         <td className="px-6 py-4 border text-right space-x-2">
                  
//         //           {/* VIEW */}
//         //           <Link
//         //             to={`/users/${u._id}`}
//         //             className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50 shadow-sm text-blue-700 border-blue-300"
//         //           >
//         //             <Eye size={16} /> <span className="hidden sm:inline">View</span>
//         //           </Link>

//         //           {/* EDIT */}
//         //           {hasPermission("users", "edit") && (
//         //             <ActionButton
//         //               variant="neutral"
//         //               onClick={() => console.log("Edit", u)}
//         //               icon={<Pencil size={16} />}
//         //             >
//         //               <span className="hidden sm:inline">Edit</span>
//         //             </ActionButton>
//         //           )}

//         //           {/* DELETE */}
//         //           {hasPermission("users", "delete") && (
//         //             <ActionButton
//         //               variant="danger"
//         //               onClick={() => deleteUser(u)}
//         //               icon={<Trash2 size={16} />}
//         //             >
//         //               <span className="hidden sm:inline">Delete</span>
//         //             </ActionButton>
//         //           )}
//         //         </td>
//         //       </tr>
//         //     ))}
//         //   </tbody>
//         // </TableShell>

//         <TableShell>
//   <thead className="bg-gray-800">
//     <tr>
//       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
//         Full Name
//       </th>
//       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
//         Username
//       </th>
//       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
//         Email
//       </th>
//       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
//         Phone
//       </th>
//       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
//         Role
//       </th>
//       <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
//         Status
//       </th>
//       <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
//         Actions
//       </th>
//     </tr>
//   </thead>

//   <tbody className="divide-y divide-gray-200">
//     {currentUsers.map((u) => (
//       <tr
//         key={u._id}
//         className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors"
//       >
//         <td className="px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200">
//           {u.fullName}
//         </td>

//         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
//           {u.username}
//         </td>

//         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
//           {u.email}
//         </td>

//         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
//           {u.phone}
//         </td>

//         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
//           {u.role}
//         </td>

//         <td className="px-6 py-4 whitespace-nowrap border-x border-gray-200">
//           <StatusBadge status={u.status} />
//         </td>

//         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 border-x border-gray-200">

//         {/* <ActionButton
//             variant="neutral"
//             title="View Profile"
//             onClick={() => handleEditUser(u)}
//             icon={<Eye size={16} />}
//           >
//             <span className="hidden sm:inline">View</span>
//           </ActionButton> */}

// <Link
//   to={`/users/${u._id}`}
//   title="View User"
//   className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50 shadow-sm text-blue-700 border-blue-300"
// >
//   <Eye size={16} /> <span className="hidden sm:inline">View</span>
// </Link>


//           <ActionButton
//             variant="neutral"
//             title="Edit User"
//             onClick={() => handleEditUser(u)}
//             icon={<Pencil size={16} />}
//           >
//             <span className="hidden sm:inline">Edit</span>
//           </ActionButton>

//           <ActionButton
//             variant={u.status === "active" ? "danger" : "primary"}
//             title={u.status === "active" ? "Deactivate User" : "Activate User"}
//             onClick={() => handleToggleStatus(u._id)}
//             icon={
//               u.status === "active" ? (
//                 <Trash2 size={16} />
//               ) : (
//                 <RotateCcw size={16} />
//               )
//             }
//           >
//             <span className="hidden sm:inline">
//               {u.status === "active" ? "Deactivate" : "Activate"}
//             </span>
//           </ActionButton>

//           <ActionButton
//             variant="info"
//             title="Reset Login Lockout"
//             onClick={() => handleResetLockout(u._id)}
//             icon={<Repeat size={16} />}
//           >
//             <span className="hidden sm:inline">Reset Lockout</span>
//           </ActionButton>

//         </td>
//       </tr>
//     ))}

//     {currentUsers.length === 0 && (
//       <tr>
//         <td
//           colSpan={7}
//           className="px-6 py-6 text-center text-gray-500 border-x border-gray-200"
//         >
//           No users found
//         </td>
//       </tr>
//     )}
//   </tbody>
// </TableShell>
//       )}

//       {/* ============= PAGINATION ============= */}
//       {/* <PaginationControls
//   page={meta.page}
//   totalPages={meta.totalPages}
//   limit={meta.limit}
//   onPage={(p) => {
//     setCurrentPage(p);
//     setIsLoading(true);   // triggers skeleton immediately
//   }}
//   onLimit={(newLimit) => {
//     setLimit(newLimit);
//     setCurrentPage(1);
//     setIsLoading(true);   // triggers skeleton immediately
//   }}
// /> */}

// {/* <PaginationControls
//   page={currentPage}
//   totalPages={Math.ceil(users.length / limit)}
//   limit={limit}
//   onPage={(p) => {
//     setCurrentPage(p);
//     setIsLoading(true);
//   }}
//   onLimit={(newLimit) => {
//     setLimit(newLimit);
//     setCurrentPage(1);
//     setIsLoading(true);
//   }}
// /> */}

// <PaginationControls
//   page={currentPage}
//   totalPages={Math.ceil(users.length / limit)}
//   limit={limit}
//   onPage={(p) => setCurrentPage(p)}
//   onLimit={(newLimit) => {
//     setLimit(newLimit);
//     setCurrentPage(1); // reset to first page
//   }}
// />

//   {/* Modal */}
//   <Modal
//         isOpen={showModal}
//         onClose={() => {
//           setShowModal(false);
//           resetForm();
//         }}
//         title={editingUser ? "Edit User" : "Create User"}
//       >
//         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {/* Full Name */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
//             <input
//               type="text"
//               name="fullName"
//               placeholder="Full Name"
//               className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
//               onChange={handleChange}
//               value={form.fullName}
//               required
//             />
//           </div>

//           {/* Username */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
//             <input
//               type="text"
//               name="username"
//               placeholder="Username"
//               className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
//               onChange={handleChange}
//               value={form.username}
//               required
//             />
//           </div>

//           {/* Email */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
//             <input
//               type="email"
//               name="email"
//               placeholder="Email"
//               className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
//               onChange={handleChange}
//               value={form.email}
//               required
//             />
//           </div>

//           {/* Phone */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
//             <input
//               type="text"
//               name="phone"
//               placeholder="Phone"
//               className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
//               onChange={handleChange}
//               value={form.phone}
//             />
//           </div>

//           {/* Password */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
//             <input
//               type="password"
//               name="password"
//               placeholder={editingUser ? "New Password (optional)" : "Password"}
//               className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
//               onChange={handleChange}
//               value={form.password}
//               required={!editingUser}
//             />
//           </div>

//           {/* Confirm Password */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
//             <input
//               type="password"
//               name="confirmPassword"
//               placeholder="Confirm Password"
//               className={`w-full border px-3 py-2 rounded focus:ring-2 outline-none ${
//                 form.confirmPassword && form.password !== form.confirmPassword
//                   ? "border-red-500 focus:ring-red-500"
//                   : "focus:ring-blue-500"
//               }`}
//               onChange={handleChange}
//               value={form.confirmPassword}
//               required={!editingUser}
//             />
//             {form.confirmPassword && form.password !== form.confirmPassword && (
//               <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
//             )}
//           </div>

//           {/* Role select */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
//             <select
//               name="role"
//               className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
//               onChange={handleChange}
//               value={form.role}
//             >
//               <option value="registration">Registration</option>
//               <option value="exam">Exam</option>
//               <option value="admin">Admin</option>
//             </select>
//           </div>

//           {/* Module select */}
//           {form.role !== "admin" && (
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">Select Module</label>
//               <select
//                 name="selectedModule"
//                 className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
//                 onChange={handleChange}
//                 value={form.selectedModule}
//               >
//                 <option value="">-- Choose Module --</option>
//                 {getFilteredModules().map((mod) => (
//                   <option key={mod} value={mod}>
//                     {mod.charAt(0).toUpperCase() + mod.slice(1)}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           {/* Permissions checkboxes */}
//           {form.role !== "admin" && form.selectedModule && (
//             <div className="col-span-full mt-4 border rounded p-4 bg-white">
//               <div className="flex items-center justify-between mb-3">
//                 <h3 className="font-semibold">Permissions for {form.selectedModule}</h3>
//                 <button
//                   type="button"
//                   className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
//                   onClick={() => togglePermission(form.selectedModule, "full")}
//                 >
//                   Toggle All
//                 </button>
//               </div>
//               <div className="flex flex-wrap gap-3">
//                 {MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
//                   <label key={perm} className="flex items-center gap-2 text-sm">
//                     <input
//                       type="checkbox"
//                       checked={
//                         !!(
//                           form.permissions &&
//                           form.permissions[form.selectedModule] &&
//                           form.permissions[form.selectedModule][perm]
//                         )
//                       }
//                       onChange={() => togglePermission(form.selectedModule, perm)}
//                     />
//                     <span className="capitalize">{perm}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Action buttons */}
//           <div className="col-span-full flex justify-end gap-2 mt-2">
//             <button
//               type="button"
//               className="px-4 py-2 border rounded hover:bg-gray-100 transition"
//               onClick={() => {
//                 setShowModal(false);
//                 resetForm();
//               }}
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               className={`px-4 py-2 text-white rounded transition ${
//                 form.confirmPassword && form.password !== form.confirmPassword
//                   ? "bg-gray-400 cursor-not-allowed"
//                   : "bg-blue-600 hover:bg-blue-700"
//               }`}
//               disabled={form.confirmPassword && form.password !== form.confirmPassword}
//             >
//               {editingUser ? "Update" : "Save"}
//             </button>
//           </div>
//         </form>
//       </Modal>



//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, Pencil, Trash2, RotateCcw, Repeat } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
} from "../api";

import Modal from "../components/common/Modal";
import TableShell from "../components/common/table/TableShell";
import SearchInput from "../components/common/DataToolbar/SearchInput";
import PaginationControls from "../components/common/Pagination/PaginationControls";
import LoadingState from "../components/common/Feedback/LoadingState";
import EmptyState from "../components/common/Feedback/EmptyState";
import StatusBadge from "../components/common/badges/StatusBadge";
import ActionButton from "../components/common/ActionButton";
import DataToolbar from "../components/common/DataToolbar/DataToolbar";
import FilterSelect from "../components/common/DataToolbar/FilterSelect";

/* ---------------- MODULE -> allowed permissions ---------------- */
const MODULE_PERMISSIONS = {
  students: ["view", "add", "edit", "transfer", "deactivate", "reactive", "download", "full"],
  teachers: ["view", "add", "edit", "transfer", "deactivate", "reactive", "full"],
  cohorts: ["view", "add", "edit", "delete", "full"],
  promotions: ["preview", "promote", "view", "full"],
  transcript: ["print", "download", "full"],
  subjects: ["view", "add", "edit", "delete", "full"],
  grades: ["view", "add", "edit", "delete", "full"],
  exams: ["view", "input", "full"],
  results: ["view", "download", "print", "full"],
};

/* ---------------- Role -> default permissions ---------------- */
const ROLE_DEFAULTS = {
  admin: Object.fromEntries(
    Object.keys(MODULE_PERMISSIONS).map((mod) => [
      mod,
      Object.fromEntries(MODULE_PERMISSIONS[mod].map((p) => [p, true])),
    ])
  ),
  staff: {
    students: { view: true, add: true, edit: true, transfer: true, deactivate: true, reactive: true, download: true },
    teachers: { view: true, add: true, edit: true, transfer: true, deactivate: true, reactive: true },
    cohorts: { view: true, add: true, edit: true, delete: true },
    promotions: {view: true, preview: true, promote: true },
    transcript: { print: true, download: true },
    subjects: { view: true, add: true, edit: true, delete: true },
    grades: { view: true, add: true, edit: true, delete: true },
    exams: { view: true, input: true },
    results: { view: true, download: true, print: true },
  },
};

const MODULES = Object.keys(MODULE_PERMISSIONS);

/* ---------------- Helpers ---------------- */
const buildEmptyPermissions = () => {
  const out = {};
  MODULES.forEach((m) => {
    out[m] = {};
    MODULE_PERMISSIONS[m].forEach((p) => (out[m][p] = false));
  });
  return out;
};

const emptyPermissions = buildEmptyPermissions();

const applyRoleDefaults = (role) => {
  const base = JSON.parse(JSON.stringify(emptyPermissions));
  const def = ROLE_DEFAULTS[role] || {};
  Object.keys(def).forEach((mod) => {
    Object.keys(def[mod]).forEach((perm) => {
      base[mod][perm] = !!def[mod][perm];
    });
  });
  return base;
};

/* ---------------- Component ---------------- */
export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "staff",
    permissions: JSON.parse(JSON.stringify(emptyPermissions)),
    selectedModule: "",
  });

  const { hasPermission } = useAuth();

  /* ---------------- Fetch Users ---------------- */
  // const fetchUsers = async () => {
  //   setIsLoading(true);
  //   try {
  //     const data = await listUsers({ search, role: roleFilter, status: statusFilter });
  //     const usersArray = Array.isArray(data) ? data : [];
  //     setUsers(usersArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  //   } catch (err) {
  //     console.error(err);
  //     setUsers([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // useEffect(() => { fetchUsers(); }, [search, roleFilter, statusFilter]);

  
  const fetchUsers = async () => {
    setIsLoading(true); // start loading
  
    try {
      const data = await listUsers({ search, role: roleFilter, status: statusFilter });
  
      // Make sure data is an array
      const usersArray = Array.isArray(data) ? data : [];
  
      // Sort by creation date descending (latest first)
      const sortedUsers = usersArray.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
  
      setUsers(sortedUsers);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setUsers([]);
    } finally {
      setIsLoading(false); // stop loading
    }
  };
  
  // refetch users when filters or limit/search changes
  useEffect(() => {
    setCurrentPage(1);
    fetchUsers();
  }, [limit, search, roleFilter, statusFilter]);

  /* ---------------- Handle Form Changes ---------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "role") {
      setForm((prev) => ({ ...prev, role: value, permissions: applyRoleDefaults(value), selectedModule: "" }));
      return;
    }
    if (name === "selectedModule") {
      setForm((prev) => ({ ...prev, selectedModule: value }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ---------------- Toggle Permission ---------------- */
  const togglePermission = (module, permission) => {
    setForm((prev) => {
      const permissions = JSON.parse(JSON.stringify(prev.permissions));
      if (permission === "full") {
        const newFull = !permissions[module].full;
        MODULE_PERMISSIONS[module].forEach((p) => permissions[module][p] = newFull);
        permissions[module].full = newFull;
      } else {
        permissions[module][permission] = !permissions[module][permission];
        const allNonFull = MODULE_PERMISSIONS[module].filter((p) => p !== "full").every((p) => permissions[module][p]);
        permissions[module].full = allNonFull;
      }
      return { ...prev, permissions };
    });
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "staff",
      permissions: JSON.parse(JSON.stringify(emptyPermissions)),
      selectedModule: "",
    });
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser && !form.password) return toast.error("Password required");
    if (form.password && form.password !== form.confirmPassword) return toast.error("Passwords do not match");

    const payload = { fullName: form.fullName, username: form.username, email: form.email, phone: form.phone, role: form.role, permissions: form.permissions, ...(form.password && { password: form.password }) };

    try {
      setIsLoading(true);
      if (editingUser) { await updateUser(editingUser._id, payload); toast.success("User updated successfully"); }
      else { await createUser(payload); toast.success("User created successfully"); }
      setShowModal(false); resetForm(); fetchUsers();
    } catch (err) {
      console.error(err); toast.error("Failed to save user");
    } finally { setIsLoading(false); }
  };

  const handleEditUser = (user) => {
    const permissions = JSON.parse(JSON.stringify(emptyPermissions));
    const userPerms = user.permissions || {};
    MODULES.forEach((m) => { if (userPerms[m]) MODULE_PERMISSIONS[m].forEach((p) => (permissions[m][p] = !!userPerms[m][p])); });
    setForm({ fullName: user.fullName, username: user.username, email: user.email, phone: user.phone, password: "", confirmPassword: "", role: user.role, permissions, selectedModule: "" });
    setEditingUser(user); setShowModal(true);
  };

  const handleToggleStatus = async (id) => {
    setIsLoading(true);
    try { await toggleUserStatus(id); fetchUsers(); toast.success("Status updated"); }
    catch (err) { console.error(err); toast.error("Failed to update status"); }
    finally { setIsLoading(false); }
  };

  // const filteredUsers = users.filter((u) => {
  //   const roleMatch = roleFilter ? u.role === roleFilter : true;
  //   const statusMatch = statusFilter ? u.status === statusFilter : true;
  //   const searchMatch = search ? (u.fullName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())) : true;
  //   return roleMatch && statusMatch && searchMatch;
  // });


  const filteredUsers = users.filter((u) => {
    const roleMatch = roleFilter ? u.role === roleFilter : true;
    const statusMatch = statusFilter ? u.status === statusFilter : true;
    const searchMatch = search ? (u.fullName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())) : true;
    return roleMatch && statusMatch  && searchMatch;;
  });
  
  // 2️⃣ Pagination slice
  const indexOfLast = currentPage * limit;
  const indexOfFirst = indexOfLast - limit;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);


  const handleResetLockout = async (id) => {
    setIsLoading(true);

    try {
      await fetch(`/api/auth/users/${id}/reset-lockout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      // alert("Login lockout reset successfully");
      toast.success("Login lockout reset successfully")
      fetchUsers();
    } catch (err) {
      console.error("Reset lockout failed", err);
      // alert("Failed to reset lockout");
      toast.error("Failed to reset lockout")
    }  finally {
      setIsLoading(false);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => { resetForm(); setShowModal(true); }}>
          + Add User
        </button>
      </div>

      <DataToolbar
        searchSlot={<SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or username..." />}
        onReset={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); }}
        filtersSlot={
          <div className="flex gap-3">
            <FilterSelect value={roleFilter} onChange={(v) => setRoleFilter(v)} placeholder="Role" options={[{ value: "", label: "All Roles" }, { value: "admin", label: "Admin" }, { value: "staff", label: "Staff" }]} />
            <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v)} placeholder="Status" options={[{ value: "", label: "All Status" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          </div>
        }
      />

      {isLoading ? (
        <LoadingState variant="table" message="Loading users..." rows={6} columns={5} />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting filters or add a new user." />
      ) : (
        <TableShell>
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3">Full Name</th>
              <th className="px-6 py-3">Username</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
    {currentUsers.map((u) => (
      <tr
        key={u._id}
        className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors"
      >
        <td className="px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200">
          {u.fullName}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
          {u.username}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
          {u.email}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
          {u.phone}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
          {u.role}
        </td>

        <td className="px-6 py-4 whitespace-nowrap border-x border-gray-200">
          <StatusBadge status={u.status} />
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 border-x border-gray-200">

        {/* <ActionButton
            variant="neutral"
            title="View Profile"
            onClick={() => handleEditUser(u)}
            icon={<Eye size={16} />}
          >
            <span className="hidden sm:inline">View</span>
          </ActionButton> */}

<Link
  to={`/users/${u._id}`}
  title="View User"
  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50 shadow-sm text-blue-700 border-blue-300"
>
  <Eye size={16} /> <span className="hidden sm:inline">View</span>
</Link>


          <ActionButton
            variant="neutral"
            title="Edit User"
            onClick={() => handleEditUser(u)}
            icon={<Pencil size={16} />}
          >
            <span className="hidden sm:inline">Edit</span>
          </ActionButton>

          <ActionButton
            variant={u.status === "active" ? "danger" : "primary"}
            title={u.status === "active" ? "Deactivate User" : "Activate User"}
            onClick={() => handleToggleStatus(u._id)}
            icon={
              u.status === "active" ? (
                <Trash2 size={16} />
              ) : (
                <RotateCcw size={16} />
              )
            }
          >
            <span className="hidden sm:inline">
              {u.status === "active" ? "Deactivate" : "Activate"}
            </span>
          </ActionButton>

          <ActionButton
            variant="info"
            title="Reset Login Lockout"
            onClick={() => handleResetLockout(u._id)}
            icon={<Repeat size={16} />}
          >
            <span className="hidden sm:inline">Reset Lockout</span>
          </ActionButton>

        </td>
      </tr>
    ))}

    {currentUsers.length === 0 && (
      <tr>
        <td
          colSpan={7}
          className="px-6 py-6 text-center text-gray-500 border-x border-gray-200"
        >
          No users found
        </td>
      </tr>
    )}
  </tbody>
         
        </TableShell>
      )}

      {/* <PaginationControls page={currentPage} totalPages={Math.max(1, Math.ceil(filteredUsers.length / limit))} limit={limit} onPage={(p) => setCurrentPage(p)} onLimit={(l) => setLimit(l)} /> */}

<PaginationControls
  page={currentPage}
  totalPages={Math.ceil(users.length / limit)}
  limit={limit}
  onPage={(p) => setCurrentPage(p)}
  onLimit={(newLimit) => {
    setLimit(newLimit);
    setCurrentPage(1); // reset to first page
  }}
/>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingUser ? "Edit User" : "Create User"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["fullName","username","email","phone","password","confirmPassword"].map((field) => (
            <div key={field}>
              <label className="block mb-1">{field.replace(/([A-Z])/g, " $1")}</label>
              <input type={field.includes("password") ? "password" : "text"} name={field} value={form[field]} onChange={handleChange} placeholder={field} className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" required={!editingUser || ["fullName","username"].includes(field)} />
            </div>
          ))}

          <div>
            <label>Role</label>
            <select name="role" value={form.role} onChange={handleChange} className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Module selection and permissions for staff */}
          {form.role !== "admin" && form.role === "staff" && (
            <>
              <div>
                <label>Select Module</label>
                <select name="selectedModule" value={form.selectedModule} onChange={handleChange} className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Choose Module --</option>
                  {MODULES.map((mod) => <option key={mod} value={mod}>{mod.charAt(0).toUpperCase() + mod.slice(1)}</option>)}
                </select>
              </div>

              {form.selectedModule && (
                <div className="col-span-full p-4 border rounded bg-white">
                  <h3 className="font-semibold mb-2">Permissions for {form.selectedModule}</h3>
                  <div className="flex flex-wrap gap-3">
                    {MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
                      <label key={perm} className="flex items-center gap-2 border p-2 rounded hover:bg-gray-50 text-sm">
                        <input type="checkbox" checked={!!form.permissions[form.selectedModule][perm]} onChange={() => togglePermission(form.selectedModule, perm)} />
                        {perm.charAt(0).toUpperCase() + perm.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="col-span-full flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
