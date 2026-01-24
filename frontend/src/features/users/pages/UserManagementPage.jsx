import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, Pencil, Trash2, RotateCcw, Repeat } from "lucide-react";
// import { useAuth } from "../contexts/AuthContext";
import {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  getUserById,
} from "../api/usersApi";

import Modal from "../../../shared/components/ui/Modal.jsx";
import SearchInput from "../../../shared/components/DataToolbar/SearchInput.jsx";
import StatusBadge from "../../../shared/components/ui/badges/StatusBadge.jsx";
import ActionButton from "../../../shared/components/ui/ActionButton.jsx";
import DataToolbar from "../../../shared/components/DataToolbar/DataToolbar.jsx";
import FilterSelect from "../../../shared/components/DataToolbar/FilterSelect.jsx";
import ListPageShell from "../../../shared/components/ui/ListPageShell.jsx";
import StandardTable from "../../../shared/components/table/StandardTable.jsx";
import { useClientSort } from "../../../shared/hooks/useClientSort";
import Button from "../../../shared/components/ui/Button.jsx";
import Checkbox from "../../../shared/components/ui/Checkbox.jsx";
import Input from "../../../shared/components/ui/Input.jsx";
import Select from "../../../shared/components/ui/Select.jsx";

/* ---------------- MODULE -> allowed permissions ---------------- */
const MODULE_PERMISSIONS = {
  students: ["view", "add", "edit", "resetPassword", "transfer", "deactivate", "reactivate", "download", "full"],
  // Teachers page actions: view list, add, edit, delete, manage assignments
  teachers: ["view", "add", "edit", "delete", "assign", "full"],
  transfers: ["view", "transfer", "full"],
  // Security: view auth lock notifications, lock accounts, and reset passwords/unlock
  security: ["view", "edit", "resetPassword", "full"],
  // Timetable page actions: view grid, add slots, edit/move/swap slots, delete slots, print, export (CSV)
  timetable: ["view", "add", "edit", "delete", "print", "download", "full"],
  attendance: ["view", "edit", "full"],
  attendanceReports: ["view", "print", "download", "full"],
  announcements: ["view", "add", "edit", "delete", "full"],
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
// NOTE: Permissions should be unchecked by default when creating users.
// We keep a single empty template and let admins tick what they need.

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

const buildEmptyPermissionsClone = () => JSON.parse(JSON.stringify(emptyPermissions));

/* ---------------- Component ---------------- */
export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [createReadOnly, setCreateReadOnly] = useState({
    username: true,
    password: true,
    confirmPassword: true,
  });
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

//   const { hasPermission } = useAuth();

  
  const fetchUsers = useCallback(async () => {
    setIsLoading(true); // start loading
  
    try {
      const data = await listUsers({ search, role: roleFilter, status: statusFilter });
  
      // Make sure data is an array
      const usersArray = Array.isArray(data) ? data : [];

      // User Management page should only show staff/admin accounts.
      const staffOnly = usersArray.filter((u) => {
        const r = String(u?.role || '').toLowerCase();
        return r !== 'student' && r !== 'teacher';
      });
  
      // Sort by creation date descending (latest first)
      const sortedUsers = staffOnly.sort(
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
  }, [search, roleFilter, statusFilter]);
  
  // refetch users when filters or limit/search changes
  useEffect(() => {
    setCurrentPage(1);
    fetchUsers();
  }, [limit, fetchUsers]);

   

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

    

    if (name === "role") {
      // Keep permissions unchecked by default for any role.
      setForm((prev) => ({
        ...prev,
        role: value,
        permissions: buildEmptyPermissionsClone(),
        selectedModule: "",
      }));
      return;
    }
    if (name === "selectedModule") {
      setForm((prev) => ({ ...prev, selectedModule: value }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };
    
     
  
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
      permissions: buildEmptyPermissionsClone(),
      selectedModule: "",
    });
    setEditingUser(null);
    setCreateReadOnly({ username: true, password: true, confirmPassword: true });
  };

 
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

    // Backward compatibility: if admin previously used attendance.print/download,
    // map those values into attendanceReports when not explicitly set.
    const legacyAttendance = form.permissions?.attendance || {};
    const nextReports = cleanedPermissions.attendanceReports || {};
    const reportsTouched = MODULE_PERMISSIONS.attendanceReports
      .filter((p) => p !== 'full')
      .some((p) => nextReports?.[p] === true);

    if (!reportsTouched) {
      cleanedPermissions.attendanceReports = {
        view: !!legacyAttendance.view || !!legacyAttendance.edit,
        print: !!legacyAttendance.print,
        download: !!legacyAttendance.download,
        full: false,
      };

      cleanedPermissions.attendanceReports.full = MODULE_PERMISSIONS.attendanceReports
        .filter((p) => p !== 'full')
        .every((p) => cleanedPermissions.attendanceReports[p]);
    }
  
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
      setIsSaving(true);
  
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
      setIsSaving(false);
    }
  };

  const handleEditUser = async (user) => {
    setEditingUser(user);
    setShowModal(true);
    setIsFormLoading(true);
    setCreateReadOnly({ username: false, password: false, confirmPassword: false });

    try {
      const userRes = await getUserById(user._id);
      const u = userRes?.ok ? userRes.data : user;

      const permissions = buildEmptyPermissions();
      const userPerms = u.permissions || {};

      MODULES.forEach((module) => {
        MODULE_PERMISSIONS[module].forEach((perm) => {
          permissions[module][perm] = !!userPerms?.[module]?.[perm];
        });

        // Backward compatibility: preserve FULL semantics
        if (userPerms?.[module]?.full === true) {
          MODULE_PERMISSIONS[module].forEach((perm) => {
            permissions[module][perm] = true;
          });
        }

        const allChecked = MODULE_PERMISSIONS[module]
          .filter((p) => p !== "full")
          .every((p) => permissions[module][p]);

        permissions[module].full = allChecked;
      });

      setForm({
        fullName: u.fullName || "",
        username: u.username || "",
        email: u.email || "",
        phone: u.phone || "",
        password: "",
        confirmPassword: "",
        role: u.role || "staff",
        permissions,
        selectedModule: "",
      });
    } catch (err) {
      console.error("Failed to load user details", err);
      toast.error("Failed to load user details");
    } finally {
      setIsFormLoading(false);
    }
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

  const {
    sortBy,
    sortDir,
    onSort,
    sortedRows: sortedUsersForView,
  } = useClientSort(filteredUsers, {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    onPageReset: () => setCurrentPage(1),
    getValue: (u, field) => {
      switch (field) {
        case 'fullName':
          return String(u?.fullName || '').toLowerCase();
        case 'username':
          return String(u?.username || '').toLowerCase();
        case 'email':
          return String(u?.email || '').toLowerCase();
        case 'phone':
          return String(u?.phone || '').toLowerCase();
        case 'role':
          return String(u?.role || '').toLowerCase();
        case 'status':
          return String(u?.status || '').toLowerCase();
        case 'createdAt':
        default:
          return new Date(u?.createdAt || 0).getTime();
      }
    },
  });
  
  // 2️⃣ Pagination slice
  const indexOfLast = currentPage * limit;
  const indexOfFirst = indexOfLast - limit;
  const currentUsers = sortedUsersForView.slice(indexOfFirst, indexOfLast);


  const handleResetLockout = async (id) => {
    setIsLoading(true);

    try {
      await fetch(`/api/auth/users/${id}/reset-lockout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
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
    <ListPageShell
      title="User Management"
      actions={(
        <Button
          variant="brand"
          size="lg"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add User
        </Button>
      )}
      toolbar={(
        <DataToolbar
          searchSlot={
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username..."
            />
          }
          onReset={() => {
            setSearch("");
            setRoleFilter("");
            setStatusFilter("");
          }}
          filtersSlot={
            <div className="flex gap-3">
              <FilterSelect
                value={roleFilter}
                onChange={(v) => setRoleFilter(v)}
                placeholder="Role"
                options={[
                  { value: "", label: "All Roles" },
                  { value: "admin", label: "Admin" },
                  { value: "staff", label: "Staff" },
                ]}
              />
              <FilterSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                placeholder="Status"
                options={[
                  { value: "", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
          }
        />
      )}
    >

      <StandardTable
        isLoading={isLoading}
        items={sortedUsersForView}
        loadingMessage="Loading users..."
        loadingVariant="table"
        loadingRows={6}
        loadingColumns={7}
        emptyTitle="No users found"
        emptyDescription="Try adjusting filters or add a new user."

        rows={currentUsers}
        columns={[
          { key: 'fullName', label: 'Full Name', sortable: true, field: 'fullName', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
          { key: 'username', label: 'Username', sortable: true, field: 'username' },
          { key: 'email', label: 'Email', sortable: true, field: 'email' },
          { key: 'phone', label: 'Phone', sortable: true, field: 'phone' },
          { key: 'role', label: 'Role', sortable: true, field: 'role' },
          { key: 'status', label: 'Status', sortable: true, field: 'status', tdClassName: 'px-6 py-4 whitespace-nowrap border-x border-gray-200' },
          { key: 'actions', label: 'Actions', align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 border-x border-gray-200 no-print' },
        ]}
        storageKey="users:columns:v1"
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        controlsProps={{
          limit,
          total: sortedUsersForView.length,
          onLimit: (newLimit) => {
            setLimit(newLimit);
            setCurrentPage(1);
          },
          limits: [5, 10, 20, 50, 100, 'all'],
        }}
        getRowKey={(u) => u._id}
        renderCell={(u, col) => {
          switch (col.key) {
            case 'fullName':
              return u.fullName;
            case 'username':
              return u.username;
            case 'email':
              return u.email;
            case 'phone':
              return u.phone;
            case 'role':
              return u.role;
            case 'status':
              return <StatusBadge status={u.status} />;
            case 'actions':
              return (
                <>
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
                    icon={u.status === "active" ? (<Trash2 size={16} />) : (<RotateCcw size={16} />)}
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
                </>
              );
            default:
              return '';
          }
        }}

        page={currentPage}
        totalPages={Math.ceil(sortedUsersForView.length / limit)}
        limit={limit}
        onPage={(p) => setCurrentPage(p)}
        onLimit={(newLimit) => {
          setLimit(newLimit);
          setCurrentPage(1);
        }}
        showRowsSelector={false}
      />

      {/* Modal */}
<Modal
  isOpen={showModal}
  onClose={() => {
    setShowModal(false);
    resetForm();
  }}
  title={editingUser ? "Edit User" : "Create User"}
>
  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4" autoComplete="off">

    {/*
      Prevent Chrome/password managers from autofilling this modal.
      These hidden fields act as a sink for saved credentials.
    */}
    {!editingUser && (
      <>
        <input
          type="text"
          name="fake_username"
          autoComplete="username"
          tabIndex={-1}
          className="hidden"
          aria-hidden="true"
        />
        <input
          type="password"
          name="fake_password"
          autoComplete="current-password"
          tabIndex={-1}
          className="hidden"
          aria-hidden="true"
        />
      </>
    )}

    {isFormLoading && (
      <div className="col-span-full text-sm text-gray-600">Loading user details...</div>
    )}

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

          <Input
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
            placeholder={editingUser && field === "password" ? "New Password (optional)" : ""}
            disabled={isFormLoading || isSaving}
            readOnly={!editingUser && ["username", "password", "confirmPassword"].includes(field) ? !!createReadOnly[field] : false}
            onFocus={() => {
              if (!editingUser && ["username", "password", "confirmPassword"].includes(field)) {
                setCreateReadOnly((r) => ({ ...r, [field]: false }));
              }
            }}
            autoComplete={
              editingUser
                ? (field === 'password' || field === 'confirmPassword' ? 'new-password' : 'off')
                : (field === 'password' || field === 'confirmPassword' ? 'new-password' : (field === 'username' ? 'off' : 'off'))
            }
            className={isConfirm && passwordsMismatch ? 'border-red-500 focus-visible:ring-red-500' : ''}
            required={
              ["fullName", "username"].includes(field) ||
              (!editingUser && ["email", "password", "confirmPassword"].includes(field))
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
      <Select
        name="role"
        value={form.role}
        onChange={handleChange}
        disabled={isFormLoading || isSaving}
      >
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </Select>
    </div>

    {/* Module + Permissions */}
    {form.role === "staff" && (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Module
          </label>
          <Select
            name="selectedModule"
            value={form.selectedModule}
            onChange={handleChange}
            disabled={isFormLoading || isSaving}
            required={!editingUser}

          >
            <option value="">-- Choose Module --</option>
            {MODULES.map((mod) => (
              <option key={mod} value={mod}>
                {mod.charAt(0).toUpperCase() + mod.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        {form.selectedModule && (
          <div className="col-span-full p-4 border rounded bg-white">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">
                Permissions for {form.selectedModule}
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              
{MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
  <label key={perm} className="flex items-center gap-2 border p-2 rounded">
    <Checkbox
      checked={!!form.permissions[form.selectedModule][perm]}
      onChange={() => togglePermission(form.selectedModule, perm)}
      disabled={isFormLoading || isSaving}
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
      <Button
        type="button"
        variant="neutral"
        onClick={() => {
          setShowModal(false);
          resetForm();
        }}
        disabled={isSaving}
      >
        Cancel
      </Button>

      <Button
        type="submit"
        variant="brand"
        disabled={
          isFormLoading ||
          isSaving ||
          (form.confirmPassword && form.password !== form.confirmPassword)
        }
      >
        {isSaving ? (editingUser ? "Updating..." : "Saving...") : (editingUser ? "Update" : "Save")}
      </Button>
    </div>

  </form>
</Modal>



    </ListPageShell>
  );


};