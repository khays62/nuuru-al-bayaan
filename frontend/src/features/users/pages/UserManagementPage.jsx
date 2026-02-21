import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
// import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Printer } from 'lucide-react';
import {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  getUserById,
  resetUserLoginLockout,
} from "../api/usersApi";

import { useDebounce } from '../../../hooks/useDebounce';

import SearchInput from "../../../shared/components/DataToolbar/SearchInput.jsx";
import { FilterItem, FilterRow } from "../../../shared/components/DataToolbar/FilterLayout.jsx";
import FilterDropdownSelect from "../../../shared/components/DataToolbar/FilterDropdownSelect.jsx";
import ListPageShell from "../../../shared/components/ui/ListPageShell.jsx";
import { useClientSort } from "../../../shared/hooks/useClientSort";
import Button from "../../../shared/components/ui/Button.jsx";
import Card from '../../../shared/components/ui/Card.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import UserTable from "../components/UserTable.jsx";
import UserFormModal from "../components/UserFormModal.jsx";
import { userKeys } from '../queryKeys';
import { useUsersRealtimeInvalidation } from '../useUsersRealtimeInvalidation';

import { useI18n } from '../../../i18n/I18nProvider';

import { MODULE_PERMISSIONS, MODULES } from "../../../shared/auth/permissionContract.js";

/* ---------------- Role -> default permissions ---------------- */
// NOTE: Permissions should be unchecked by default when creating users.
// We keep a single empty template and let admins tick what they need.

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
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const editingUserId = editingUser?._id ? String(editingUser._id) : '';
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
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

  const queryClient = useQueryClient();
  useUsersRealtimeInvalidation({ userId: editingUserId || undefined });
  const hydratingRef = useRef(false);
  const lastRemoteUpdatedAtRef = useRef('');

  const patchUserInCachedLists = useCallback((userId, patch) => {
    if (!userId) return;
    queryClient.setQueriesData({ queryKey: userKeys.adminListBase }, (old) => {
      if (!Array.isArray(old)) return old;
      let changed = false;
      const next = old.map((u) => {
        if (String(u?._id || '') !== String(userId)) return u;
        changed = true;
        const updated = typeof patch === 'function' ? patch(u) : { ...(u || {}), ...(patch || {}) };
        return updated;
      });
      return changed ? next : old;
    });
  }, [queryClient]);

  const upsertUserInCachedLists = useCallback((user) => {
    const id = user?._id;
    if (!id) return;
    queryClient.setQueriesData({ queryKey: userKeys.adminListBase }, (old) => {
      if (!Array.isArray(old)) return old;
      const idx = old.findIndex((u) => String(u?._id || '') === String(id));
      if (idx >= 0) {
        const next = old.slice();
        next[idx] = { ...(next[idx] || {}), ...(user || {}) };
        return next;
      }
      // Insert new staff/admin users at top; keep list stable otherwise.
      const role = String(user?.role || '').toLowerCase();
      if (role === 'student' || role === 'teacher') return old;
      return [user, ...old];
    });
  }, [queryClient]);

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    salary: "",
    password: "",
    confirmPassword: "",
    role: "staff",
    permissions: JSON.parse(JSON.stringify(emptyPermissions)),
    selectedModule: "",
  });

  const hydrateFormFromUser = useCallback((u) => {
    if (!u) return;

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
        .filter((p) => p !== 'full')
        .every((p) => permissions[module][p]);

      permissions[module].full = allChecked;
    });

    hydratingRef.current = true;
    setForm((prev) => ({
      fullName: u.fullName || "",
      username: u.username || "",
      email: u.email || "",
      phone: u.phone || "",
      salary: u.salary ?? "",
      password: "",
      confirmPassword: "",
      role: u.role || "staff",
      permissions,
      // UI-only selection: preserve current selection so the admin keeps their place.
      selectedModule: prev?.selectedModule || "",
    }));
    hydratingRef.current = false;
    setIsDirty(false);
  }, []);

//   const { hasPermission } = useAuth();

  
  const usersQuery = useQuery({
    queryKey: userKeys.adminList({
      search: debouncedSearch,
      role: roleFilter,
      status: statusFilter,
    }),
    queryFn: async ({ signal }) => {
      const data = await listUsers({
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
      }, { signal });

      const usersArray = Array.isArray(data) ? data : [];

      // User Management page should only show staff/admin accounts.
      const staffOnly = usersArray.filter((u) => {
        const r = String(u?.role || '').toLowerCase();
        return r !== 'student' && r !== 'teacher';
      });

      // Default sort: latest first.
      staffOnly.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return staffOnly;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const users = usersQuery.data || [];
  const isLoading = Boolean(usersQuery.isLoading && usersQuery.data == null);

  // Keep an edited user fresh across browsers: refetch the user's details when USERS_CHANGED invalidates.
  const editingUserQuery = useQuery({
    queryKey: userKeys.adminProfile(editingUserId),
    enabled: Boolean(showModal && editingUserId),
    queryFn: async ({ signal }) => getUserById(editingUserId, { signal }),
    placeholderData: (prev) => prev,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Reset page when query inputs change.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, limit]);

   

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (!hydratingRef.current) setIsDirty(true);
    if (name === "phone") {
      // Only allow digits
      if (!/^\d*$/.test(value)) {
        toast.error(t('users.toasts.phoneDigitsOnly'));
        return;
      }
    
      // Limit to 9 digits
      if (value.length > 9) {
        toast.error(t('users.toasts.phoneMaxDigits'));
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
    if (!hydratingRef.current) setIsDirty(true);
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
    setIsDirty(false);
    setForm({
      fullName: "",
      username: "",
      email: "",
      phone: "",
      salary: "",
      password: "",
      confirmPassword: "",
      role: "staff",
      permissions: buildEmptyPermissionsClone(),
      selectedModule: "",
    });
    setEditingUser(null);
    setCreateReadOnly({ username: true, password: true, confirmPassword: true });
  };

  const createUserMutation = useMutation({
    mutationFn: (payload) => createUser(payload),
    onSuccess: (created) => {
      toast.success(t('users.toasts.created'));
      // Avoid extra refetch/cancel storms: update local cache now; SSE invalidation will refetch cross-browser.
      upsertUserInCachedLists(created?.user || created);
      setShowModal(false);
      resetForm();
    },
    onError: (e) => {
      toast.error(e?.data?.message || e?.message || t('users.toasts.saveFailed'));
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => updateUser(id, payload),
    onSuccess: (resp, vars) => {
      toast.success(t('users.toasts.updated'));
      if (vars?.id) {
        const updated = resp?.user || resp?.data?.user || resp?.data || resp?.user || null;
        if (updated) {
          patchUserInCachedLists(vars.id, updated);
          queryClient.setQueryData(userKeys.adminProfile(vars.id), updated);
        } else {
          // If API response isn't normalized, at least mirror what we submitted.
          patchUserInCachedLists(vars.id, (u) => ({ ...u, ...(vars?.payload || {}) }));
          queryClient.setQueryData(userKeys.adminProfile(vars.id), (prev) => ({ ...(prev || {}), ...(vars?.payload || {}) }));
        }
      }
      setShowModal(false);
      resetForm();
    },
    onError: (e) => {
      toast.error(e?.data?.message || e?.message || t('users.toasts.saveFailed'));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => toggleUserStatus(id),
    onSuccess: (resp, id) => {
      const updated = resp?.user || resp?.data?.user || resp?.data || resp;
      if (id) {
        if (updated && typeof updated === 'object') {
          patchUserInCachedLists(id, updated);
          queryClient.setQueryData(userKeys.adminProfile(id), updated);
        }
      }
    },
  });

  const resetLockoutMutation = useMutation({
    mutationFn: (id) => resetUserLoginLockout(id),
    onSuccess: (_, id) => {
      toast.success(t('users.toasts.lockoutReset'));
      // Prefer avoiding immediate refetch; SSE will broadcast the change.
      // If profile is open, we can still mark it as stale by updating a lightweight timestamp.
      if (id) {
        patchUserInCachedLists(id, (u) => ({ ...(u || {}), updatedAt: new Date().toISOString() }));
        queryClient.setQueryData(userKeys.adminProfile(id), (prev) => ({ ...(prev || {}), updatedAt: new Date().toISOString() }));
      }
    },
    onError: (e) => {
      toast.error(e?.data?.message || e?.message || t('users.toasts.lockoutResetFailed'));
    },
  });

  const isSaving = Boolean(createUserMutation.isPending || updateUserMutation.isPending);

  // Re-hydrate the edit form from the latest server state when the same user changes in another browser.
  useEffect(() => {
    if (!showModal) return;
    if (!editingUserId) return;
    const remote = editingUserQuery.data;
    if (!remote) return;

    const remoteUpdatedAt = String(remote?.updatedAt || '');
    const prevUpdatedAt = lastRemoteUpdatedAtRef.current;
    if (remoteUpdatedAt) lastRemoteUpdatedAtRef.current = remoteUpdatedAt;

    // If the admin has local unsaved edits, don't overwrite; just notify.
    if (isDirty) {
      if (remoteUpdatedAt && prevUpdatedAt && prevUpdatedAt !== remoteUpdatedAt) {
        toast(t('users.toasts.updatedElsewhere'), { duration: 2500 });
      }
      return;
    }

    if (isFormLoading || isSaving) return;
    hydrateFormFromUser(remote);
  }, [showModal, editingUserId, editingUserQuery.data, isDirty, isFormLoading, isSaving, hydrateFormFromUser]);

 
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Password checks
    if (!editingUser && !form.password) {
      toast.error(t('users.form.validations.passwordRequiredNew'));
      return;
    }
    if (!editingUser && String(form.password || '').trim().length < 6) {
      toast.error(t('users.form.validations.passwordMin'));
      return;
    }
    if (form.password || form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        toast.error(t('users.form.passwordsNoMatch'));
        return;
      }
    }

    // Module selection is a UI dropdown (not a native required select anymore).
    // Module selection is UI-only (used to show permission checkboxes). It must NOT block saving.
  
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
      salary: form.salary === '' || form.salary == null ? 0 : Number(form.salary),
      role: form.role,
      permissions: cleanedPermissions,
    };
    if (form.password) payload.password = form.password;
  
    try {
      // Best-effort client-side uniqueness check only when we're showing the full list.
      const canClientValidateUnique = !debouncedSearch && !roleFilter && !statusFilter;
      if (canClientValidateUnique) {
        const exists = users.some((u) => {
          if (editingUser && u._id === editingUser._id) return false;
          return (
            u.username === form.username ||
            (form.email && u.email === form.email) ||
            (form.phone && u.phone === form.phone)
          );
        });
        if (exists) {
          toast.error(t('users.toasts.uniqueExists'));
          return;
        }
      }

      if (editingUser) {
        await updateUserMutation.mutateAsync({ id: editingUser._id, payload });
      } else {
        await createUserMutation.mutateAsync(payload);
      }
    } catch (err) {
      // onError handles toast; keep console for debugging.
      console.error('Failed to save user', err);
    }
  };

  const handleEditUser = async (user) => {
    setEditingUser(user);
    setShowModal(true);
    setIsFormLoading(true);
    setIsDirty(false);
    setCreateReadOnly({ username: false, password: false, confirmPassword: false });

    try {
      const id = user?._id;
      const u = id
        ? await queryClient.fetchQuery({
          queryKey: userKeys.adminProfile(id),
          queryFn: ({ signal }) => getUserById(id, { signal }),
        })
        : user;

      hydrateFormFromUser(u);
    } catch (err) {
      console.error("Failed to load user details", err);
      toast.error(t('users.toasts.loadDetailsFailed'));
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
    const verb = nextStatus === 'inactive' ? t('users.table.actions.deactivate') : t('users.table.actions.activate');
    if (!confirm(t('users.confirms.toggleStatus', { verb }))) return;

    setPendingById((prev) => ({ ...prev, [id]: true }));
    setStatusOverrides((prev) => ({ ...prev, [id]: nextStatus }));

    try {
      await toggleStatusMutation.mutateAsync(id);
      setStatusOverrides((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      toast.success(t('users.toasts.statusUpdated'));
    } catch (err) {
      console.error(err);
      setStatusOverrides((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      toast.error(err?.message || t('users.toasts.statusUpdateFailed'));
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

    if (!confirm(t('users.confirms.resetLockout'))) return;

    setPendingById((prev) => ({ ...prev, [id]: true }));
    try {
      await resetLockoutMutation.mutateAsync(id);
    } catch (err) {
      console.error('Reset lockout failed', err);
      toast.error(err?.message || t('users.toasts.lockoutResetFailed'));
    } finally {
      setPendingById((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const canExport = Boolean(!isLoading && Array.isArray(sortedUsersForView) && sortedUsersForView.length > 0);
  const buildExportPayload = async () => {
    if (!canExport) return null;

    // Export should match visible table columns (and exclude action buttons).
    const STORAGE_KEY = 'users:columns:v1';
    let visible = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') visible = parsed;
      }
    } catch { /* ignore */ }
    const isVisible = (key) => visible?.[String(key)] !== false;

    const cols = [
      { key: 'fullName', label: t('users.table.columns.fullName'), get: (u) => u?.fullName || '' },
      { key: 'username', label: t('users.table.columns.username'), get: (u) => u?.username || '' },
      { key: 'email', label: t('users.table.columns.email'), get: (u) => u?.email || '' },
      { key: 'phone', label: t('users.table.columns.phone'), get: (u) => u?.phone || '' },
      { key: 'role', label: t('users.table.columns.role'), get: (u) => u?.role || '' },
      { key: 'status', label: t('users.table.columns.status'), get: (u) => u?.status || '' },
      // actions are UI-only; never export
    ].filter((c) => isVisible(c.key));

    const headers = cols.map((c) => c.label);
    const rows = (sortedUsersForView || []).map((u) => cols.map((c) => c.get(u)));

    const roleLabel = roleFilter
      ? (String(roleFilter).toLowerCase() === 'admin'
          ? t('users.filters.admin')
          : String(roleFilter).toLowerCase() === 'staff'
            ? t('users.filters.staff')
            : roleFilter)
      : '';
    const statusLabel = statusFilter
      ? (String(statusFilter).toLowerCase() === 'active'
          ? t('users.filters.active')
          : String(statusFilter).toLowerCase() === 'inactive'
            ? t('users.filters.inactive')
            : statusFilter)
      : '';

    const subtitleParts = [
      search ? `${t('users.export.labels.search')}: ${search}` : null,
      roleFilter ? `${t('users.export.labels.role')}: ${roleLabel || roleFilter}` : null,
      statusFilter ? `${t('users.export.labels.status')}: ${statusLabel || statusFilter}` : null,
    ].filter(Boolean);

    return {
      filename: t('users.export.filename'),
      sheetName: t('users.export.sheetName'),
      title: '',
      subtitle: subtitleParts.join(' • '),
      headerImageSrc: headerImg,
      headers,
      rows,
    };
  };

  const handlePrint = () => {
    if (!canExport) return;
    setTimeout(() => window.print(), 0);
  };

  /* ---------------- Render ---------------- */
  return (
    <ListPageShell
      title={null}
      actions={null}
      toolbar={(
      <Card className="p-4 no-print">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-lg">
              <SearchInput
                value={search}
                onChange={(v) => setSearch(v)}
                placeholder={t('users.searchPlaceholder')}
              />
            </div>
            <div className="w-full lg:max-w-2xl">
              <FilterRow align="end">
                <FilterItem grow minWidthClass="min-w-32.5">
                  <FilterDropdownSelect
                    value={roleFilter}
                    onChange={(v) => setRoleFilter(v)}
                    placeholder={t('users.filters.role')}
                    options={[
                      { value: "", label: t('users.filters.allRoles') },
                      { value: "admin", label: t('users.filters.admin') },
                      { value: "staff", label: t('users.filters.staff') },
                    ]}
                  />
                </FilterItem>
                <FilterItem grow minWidthClass="min-w-32.5">
                  <FilterDropdownSelect
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v)}
                    placeholder={t('users.filters.status')}
                    options={[
                      { value: "", label: t('users.filters.allStatus') },
                      { value: "active", label: t('users.filters.active') },
                      { value: "inactive", label: t('users.filters.inactive') },
                    ]}
                  />
                </FilterItem>
              </FilterRow>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto">
              <Button
                variant="brand"
                size="lg"
                className="w-full sm:w-auto justify-center"
                icon={<Plus size={20} />}
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                {t('users.addUser')}
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <ActionButton
                variant="outline"
                icon={<Printer size={16} />}
                disabled={!canExport}
                onClick={handlePrint}
                title={t('common.actions.print')}
              >
                {t('common.actions.print')}
              </ActionButton>
              <PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
              <ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
              <CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
              <CopyTableButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
              <ActionButton
                variant="outline"
                icon={<RotateCcw size={16} />}
                onClick={() => {
                  setSearch("");
                  setRoleFilter("");
                  setStatusFilter("");
                }}
              >
                {t('common.actions.reset')}
              </ActionButton>
            </div>
          </div>
        </div>
      </Card>
      )}
    >

      <div className="space-y-6 with-print-header with-print-footer print-fit-wide">
        <PrintHeader />
        <PrintFooter left={t('common.generatedBy')} />

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
      </div>

      <UserFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingUser ? t('users.editTitle') : t('users.createTitle')}
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