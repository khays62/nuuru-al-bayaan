import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
// import { useAuth } from "../contexts/AuthContext";
import {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  getUserById,
  resetUserLoginLockout,
} from "../api/usersApi";

import SearchInput from "../../../shared/components/DataToolbar/SearchInput.jsx";
import DataToolbar from "../../../shared/components/DataToolbar/DataToolbar.jsx";
import { FilterItem, FilterRow } from "../../../shared/components/DataToolbar/FilterLayout.jsx";
import FilterDropdownSelect from "../../../shared/components/DataToolbar/FilterDropdownSelect.jsx";
import ListPageShell from "../../../shared/components/ui/ListPageShell.jsx";
import { useClientSort } from "../../../shared/hooks/useClientSort";
import Button from "../../../shared/components/ui/Button.jsx";
import UserTable from "../components/UserTable.jsx";
import UserFormModal from "../components/UserFormModal.jsx";
import { on as onEvent, off as offEvent, EVENTS } from "../../../utils/events";

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

  const [statusOverrides, setStatusOverrides] = useState({});
  const [pendingById, setPendingById] = useState({});

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

  
  const fetchUsers = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true); // start loading
  
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
      if (!silent) setCurrentPage(1);
    } catch (err) {
      console.error("Failed to fetch users", err);
      if (!silent) setUsers([]);
    } finally {
      if (!silent) setIsLoading(false); // stop loading
    }
  }, [search, roleFilter, statusFilter]);
  
  // refetch users when filters or limit/search changes
  useEffect(() => {
    setCurrentPage(1);
    fetchUsers();
  }, [limit, fetchUsers]);

  // Live refresh: when another part of the app changes user status (e.g. bell actions)
  useEffect(() => {
    const handler = () => fetchUsers({ silent: true });
    onEvent(EVENTS.USERS_CHANGED, handler);
    return () => offEvent(EVENTS.USERS_CHANGED, handler);
  }, [fetchUsers]);

   

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
    if (!editingUser && String(form.password || '').trim().length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password || form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    // Module selection is a UI dropdown (not a native required select anymore).
    // Keep the previous rule: when creating a staff user, pick a module before saving.
    if (!editingUser && String(form.role || '').toLowerCase() === 'staff' && !String(form.selectedModule || '').trim()) {
      toast.error('Please select a module before saving');
      return;
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
        const res = await updateUser(editingUser._id, payload);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        toast.success("User updated successfully");
      } else {
        const res = await createUser(payload);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
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
    if (!id) return;
    if (pendingById[id]) return;

    const currentUser = users.find((u) => u?._id === id);
    const currentStatus = (statusOverrides[id] ?? currentUser?.status ?? 'active') === 'inactive' ? 'inactive' : 'active';
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const verb = nextStatus === 'inactive' ? 'Deactivate' : 'Activate';
    if (!confirm(`${verb} this user?`)) return;

    setPendingById((prev) => ({ ...prev, [id]: true }));
    setStatusOverrides((prev) => ({ ...prev, [id]: nextStatus }));

    try {
      const res = await toggleUserStatus(id);
      if (res?.error) throw new Error(res.error);

      setUsers((prev) => prev.map((u) => (u?._id === id ? { ...u, status: nextStatus } : u)));
      toast.success('Status updated');
    } catch (err) {
      console.error(err);
      setStatusOverrides((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setPendingById((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };
  /* ---------------- Filtering & Pagination ---------------- */
  const viewUsers = users.map((u) => {
    const id = u?._id;
    const override = id ? statusOverrides[id] : null;
    return override ? { ...u, status: override } : u;
  });

  const filteredUsers = viewUsers.filter((u) => {
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
    if (!id) return;
    if (pendingById[id]) return;

    if (!confirm('Reset login lockout for this user?')) return;

    setPendingById((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await resetUserLoginLockout(id);
      if (!res?.ok) throw new Error(res?.error || 'Failed to reset lockout');
      toast.success('Login lockout reset successfully');
    } catch (err) {
      console.error('Reset lockout failed', err);
      toast.error(err?.message || 'Failed to reset lockout');
    } finally {
      setPendingById((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
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
              onChange={(v) => setSearch(v)}
              placeholder="Search by name or username..."
            />
          }
          onReset={() => {
            setSearch("");
            setRoleFilter("");
            setStatusFilter("");
          }}
          filtersSlot={
            <FilterRow>
              <FilterItem grow minWidthClass="min-w-32.5">
                <FilterDropdownSelect
                  value={roleFilter}
                  onChange={(v) => setRoleFilter(v)}
                  placeholder="Role"
                  options={[
                    { value: "", label: "All Roles" },
                    { value: "admin", label: "Admin" },
                    { value: "staff", label: "Staff" },
                  ]}
                />
              </FilterItem>
              <FilterItem grow minWidthClass="min-w-32.5">
                <FilterDropdownSelect
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v)}
                  placeholder="Status"
                  options={[
                    { value: "", label: "All Status" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </FilterItem>
            </FilterRow>
          }
        />
      )}
    >

      <UserTable
        isLoading={isLoading}
        items={sortedUsersForView}
        rows={currentUsers}
        allCount={sortedUsersForView.length}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        page={currentPage}
        totalPages={Math.ceil(sortedUsersForView.length / limit)}
        limit={limit}
        onPage={(p) => setCurrentPage(p)}
        onLimit={(newLimit) => {
          setLimit(newLimit);
          setCurrentPage(1);
        }}
        onEdit={handleEditUser}
        onToggleStatus={handleToggleStatus}
        onResetLockout={handleResetLockout}
        pendingById={pendingById}
      />

      <UserFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingUser ? "Edit User" : "Create User"}
        editingUser={editingUser}
        isFormLoading={isFormLoading}
        isSaving={isSaving}
        form={form}
        createReadOnly={createReadOnly}
        setCreateReadOnly={setCreateReadOnly}
        handleSubmit={handleSubmit}
        handleChange={handleChange}
        togglePermission={togglePermission}
        MODULES={MODULES}
        MODULE_PERMISSIONS={MODULE_PERMISSIONS}
        onCancel={() => {
          setShowModal(false);
          resetForm();
        }}
      />



    </ListPageShell>
  );


};