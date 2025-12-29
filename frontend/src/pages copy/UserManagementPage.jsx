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
  students: ["view", "add", "edit", "transfer", "deactivate", "reactivate", "download", "full"],
  teachers: ["view", "add", "edit", "transfer", "deactivate", "reactivate", "full"],
  cohorts: ["view", "add", "edit", "delete", "full"],
  // promotions: ["preview", "promote", "view", "full"],
  promotions: ["view", "preview", "promote", "full"], // ✅ order fixed
  transcript: ["view", "print", "download", "full"],
  // transcript: ["print", "download", "full"],
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
    students: { view: true, add: true, edit: true, transfer: true, deactivate: true, reactivate: true, download: true },
    teachers: { view: true, add: true, edit: true, transfer: true, deactivate: true, reactivate: true },
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
  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   if (name === "role") {
  //     setForm((prev) => ({ ...prev, role: value, permissions: applyRoleDefaults(value), selectedModule: "" }));
  //     return;
  //   }
  //   if (name === "selectedModule") {
  //     setForm((prev) => ({ ...prev, selectedModule: value }));
  //     return;
  //   }
  //   setForm((prev) => ({ ...prev, [name]: value }));
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // Only allow digits
      if (!/^\d*$/.test(value)) {
        toast.error("Phone must contain digits only");
        return;
      }
    
      // Limit to 9 digits
      if (value.length > 9) {
        toast.error("Phone number cannot exceed 9 digits");
        return;
      }
    
      // Update state if valid
      setForm((prev) => ({ ...prev, phone: value }));
      return;
    }

    // if (name === "role") {
    //   setForm((prev) => ({ ...prev, role: value, permissions: applyRoleDefaults(value), selectedModule: "" }));
    //   return;
    // }
    // if (name === "selectedModule") {
    //   setForm((prev) => ({ ...prev, selectedModule: value }));
    //   return;
    // }
    // setForm((prev) => ({ ...prev, [name]: value }));

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
    
    // if (name === "role") {
    //   setForm((prev) => ({
    //     ...prev,
    //     role: value,
    //     permissions: applyRoleDefaults(value),
    //     selectedModule: "", // reset module selection when role changes
    //   }));
    //   return;
    // }
    // setForm((prev) => ({ ...prev, [name]: value }));
  
  /* ---------------- Toggle Permission ---------------- */
  // const togglePermission = (module, permission) => {
  //   setForm((prev) => {
  //     const permissions = JSON.parse(JSON.stringify(prev.permissions));
  //     if (permission === "full") {
  //       const newFull = !permissions[module].full;
  //       MODULE_PERMISSIONS[module].forEach((p) => permissions[module][p] = newFull);
  //       permissions[module].full = newFull;
  //     } else {
  //       permissions[module][permission] = !permissions[module][permission];
  //       const allNonFull = MODULE_PERMISSIONS[module].filter((p) => p !== "full").every((p) => permissions[module][p]);
  //       permissions[module].full = allNonFull;
  //     }
  //     return { ...prev, permissions };
  //   });
  // };


  // const togglePermission = (module, permission) => {
  //   setForm((prev) => {
  //     const permissions = structuredClone(prev.permissions);
  
  //     // Toggle FULL explicitly
  //     if (permission === "full") {
  //       const next = !permissions[module].full;
  
  //       permissions[module].full = next;
  
  //       MODULE_PERMISSIONS[module]
  //         .filter((p) => p !== "full")
  //         .forEach((p) => {
  //           permissions[module][p] = next;
  //         });
  
  //       return { ...prev, permissions };
  //     }
  
  //     // Toggle single permission ONLY
  //     permissions[module][permission] = !permissions[module][permission];
  
  //     // ❌ DO NOT auto-toggle FULL
  //     permissions[module].full = false;
  
  //     return { ...prev, permissions };
  //   });
  // };
  
  const togglePermission = (module, permission) => {
    setForm((prev) => {
      const permissions = structuredClone(prev.permissions);
  
      // ✅ FULL ACCESS clicked
      if (permission === "full") {
        const next = !permissions[module].full;
  
        MODULE_PERMISSIONS[module].forEach((p) => {
          permissions[module][p] = next;
        });
  
        return { ...prev, permissions };
      }
  
      // ✅ Toggle individual permission
      permissions[module][permission] = !permissions[module][permission];
  
      // ✅ Check if ALL non-full permissions are true
      const allChecked = MODULE_PERMISSIONS[module]
        .filter((p) => p !== "full")
        .every((p) => permissions[module][p]);
  
      // ✅ Sync FULL correctly
      permissions[module].full = allChecked;
  
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

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!editingUser && !form.password) return toast.error("Password required");
  //   if (form.password && form.password !== form.confirmPassword) return toast.error("Passwords do not match");

  //   const payload = { fullName: form.fullName, username: form.username, email: form.email, phone: form.phone, role: form.role, permissions: form.permissions, ...(form.password && { password: form.password }) };

  //   try {
  //     setIsLoading(true);
  //     if (editingUser) { await updateUser(editingUser._id, payload); toast.success("User updated successfully"); }
  //     else { await createUser(payload); toast.success("User created successfully"); }
  //     setShowModal(false); resetForm(); fetchUsers();
  //   } catch (err) {
  //     console.error(err); toast.error("Failed to save user");
  //   } finally { setIsLoading(false); }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Password checks
    if (!editingUser && !form.password) {
      toast.error("Password is required for new users");
      return;
    }
    if (form.password || form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }
  
    // Clean permissions
    const cleanedPermissions = {};
    Object.keys(form.permissions || {}).forEach((m) => {
      if (!MODULE_PERMISSIONS[m]) return;
      cleanedPermissions[m] = {};
      MODULE_PERMISSIONS[m].forEach((p) => {
        cleanedPermissions[m][p] = !!form.permissions[m][p];
      });
    });
  
    const payload = {
      fullName: form.fullName,
      username: form.username,
      email: form.email,
      phone: form.phone,
      role: form.role,
      permissions: cleanedPermissions,
    };
    if (form.password) payload.password = form.password;
  
    try {
      setIsLoading(true);
  
      // Check for existing username/email/phone
      const exists = users.some((u) => {
        if (editingUser && u._id === editingUser._id) return false; // skip current user when editing
        return (
          u.username === form.username ||
          u.email === form.email ||
          (form.phone && u.phone === form.phone)
        );
      });
  
      if (exists) {
        toast.error("Username, Email, or Phone already exists");
        return;
      }
  
      // Create or update
      if (editingUser) {
        await updateUser(editingUser._id, payload);
        toast.success("User updated successfully");
      } else {
        await createUser(payload);
        toast.success("User created successfully");
      }
  
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error("Failed to save user", err);
      toast.error("Failed to save user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user) => {
    const permissions = buildEmptyPermissions();
    const userPerms = user.permissions || {};
  
    MODULES.forEach((module) => {
      MODULE_PERMISSIONS[module].forEach((perm) => {
        permissions[module][perm] = !!userPerms?.[module]?.[perm];
      });
  
      // ✅ recompute FULL properly
      const allChecked = MODULE_PERMISSIONS[module]
        .filter((p) => p !== "full")
        .every((p) => permissions[module][p]);
  
      permissions[module].full = allChecked;
    });
  
    setForm({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      password: "",
      confirmPassword: "",
      role: user.role,
      permissions,
      selectedModule: "", // user selects module manually
    });
  
    setEditingUser(user);
    setShowModal(true);
  };
  

  // const handleEditUser = (user) => {
  //   const permissions = JSON.parse(JSON.stringify(emptyPermissions));
  //   const userPerms = user.permissions || {};
  //   MODULES.forEach((m) => { if (userPerms[m]) MODULE_PERMISSIONS[m].forEach((p) => (permissions[m][p] = !!userPerms[m][p])); });
  //   setForm({ fullName: user.fullName, username: user.username, email: user.email, phone: user.phone, password: "", confirmPassword: "", role: user.role, permissions, selectedModule: "" });
  //   setEditingUser(user); setShowModal(true);
  // };

  const handleToggleStatus = async (id) => {
    setIsLoading(true);
    try { await toggleUserStatus(id); fetchUsers(); toast.success("Status updated"); }
    catch (err) { console.error(err); toast.error("Failed to update status"); }
    finally { setIsLoading(false); }
  };
  /* ---------------- Filtering & Pagination ---------------- */
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
      {/* <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingUser ? "Edit User" : "Create User"}>
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
      </Modal> */}



<Modal
  isOpen={showModal}
  onClose={() => {
    setShowModal(false);
    resetForm();
  }}
  title={editingUser ? "Edit User" : "Create User"}
>
  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

    {["fullName", "username", "email", "phone", "password", "confirmPassword"].map((field) => {
      const isPassword = field.toLowerCase().includes("password");
      const isConfirm = field === "confirmPassword";
      const passwordsMismatch =
        form.confirmPassword && form.password !== form.confirmPassword;

      return (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.replace(/([A-Z])/g, " $1")}
          </label>

          <input
            type={
              field === "email"
                ? "email"
                : isPassword
                ? "password"
                : "text"
            }
            name={field}
            value={form[field]}
            onChange={handleChange}
            placeholder={
              editingUser && field === "password"
                ? "New Password (optional)"
                : field
            }
            className={`w-full border px-3 py-2 rounded outline-none focus:ring-2 ${
              isConfirm && passwordsMismatch
                ? "border-red-500 focus:ring-red-500"
                : "focus:ring-blue-500"
            }`}
            required={
              !editingUser &&
              ["fullName", "username", "email", "password", "confirmPassword"].includes(field)
            }
          />

          {/* Password mismatch error */}
          {isConfirm && passwordsMismatch && (
            <p className="text-red-500 text-sm mt-1">
              Passwords do not match
            </p>
          )}
        </div>
      );
    })}

    {/* Role */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
      <select
        name="role"
        value={form.role}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500"
      >
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </select>
    </div>

    {/* Module + Permissions */}
    {form.role === "staff" && (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Module
          </label>
          <select
            name="selectedModule"
            value={form.selectedModule}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500"
            required={!editingUser}

          >
            <option value="">-- Choose Module --</option>
            {MODULES.map((mod) => (
              <option key={mod} value={mod}>
                {mod.charAt(0).toUpperCase() + mod.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {form.selectedModule && (
          <div className="col-span-full p-4 border rounded bg-white">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">
                Permissions for {form.selectedModule}
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* {MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2 border p-2 rounded hover:bg-gray-50 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={
                      !!(
                        form.permissions?.[form.selectedModule]?.[perm]
                      )
                    }
                    onChange={() =>
                      togglePermission(form.selectedModule, perm)
                    }
                  />
                  {perm.charAt(0).toUpperCase() + perm.slice(1)}
                </label>
              ))} */}

{MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
  <label key={perm} className="flex items-center gap-2 border p-2 rounded">
    <input
      type="checkbox"
      checked={!!form.permissions[form.selectedModule][perm]}
      onChange={() => togglePermission(form.selectedModule, perm)}
    />
    {perm === "full" ? "Full Access (Select All)" : perm}
  </label>
))}

            </div>
          </div>
        )}
      </>
    )}

    {/* Actions */}
    <div className="col-span-full flex justify-end gap-2 mt-2">
      <button
        type="button"
        onClick={() => {
          setShowModal(false);
          resetForm();
        }}
        className="px-4 py-2 border rounded hover:bg-gray-100"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={
          form.confirmPassword && form.password !== form.confirmPassword
        }
        className={`px-4 py-2 text-white rounded transition ${
          form.confirmPassword && form.password !== form.confirmPassword
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {editingUser ? "Update" : "Save"}
      </button>
    </div>

  </form>
</Modal>



    </div>
  );


};