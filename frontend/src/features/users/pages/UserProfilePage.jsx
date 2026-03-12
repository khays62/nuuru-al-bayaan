import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BadgeCheck,
  Boxes,
  Hash,
  Key,
  Layers,
  Mail,
  Phone,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../../auth/AuthContext.jsx';

import StatusBadge from '../../../shared/components/ui/badges/StatusBadge.jsx';
import Badge from '../../../shared/components/ui/Badge.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import Skeleton from '../../../shared/components/ui/Skeleton.jsx';
import AuditHistoryTable from '../../../shared/components/audit/AuditHistoryTable.jsx';
import { getUserById, getUserAuditLogs } from '../api/usersApi';
import { useQuery } from '@tanstack/react-query';
import { userKeys } from '../queryKeys';
import { useUsersRealtimeInvalidation } from '../useUsersRealtimeInvalidation';
import { getSomaliaDistrictLabel, getSomaliaRegionLabel } from '../../../shared/data/somaliaAdminDivisions.js';

import { useI18n } from '../../../i18n/useI18n';
import { displayText } from '../../../utils/displayText';

export default function UserProfilePage() {
  const { t, lang } = useI18n();
  const { userId } = useParams();
  const { auth, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const isSelfMode = !userId;
  const effectiveUserId = isSelfMode ? (auth?.user?._id || auth?.user?.id || '') : userId;
  const viewerRole = String(auth?.user?.role || '').trim();
  const showAudit = isSelfMode ? viewerRole === 'admin' : true;

  useUsersRealtimeInvalidation({ userId: userId || undefined });

  const userQuery = useQuery({
    queryKey: userKeys.adminProfile(userId),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => getUserById(userId, { signal }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const logsQuery = useQuery({
    queryKey: userKeys.adminAuditLogs({ userId: effectiveUserId, page, limit }),
    enabled: Boolean(showAudit && effectiveUserId),
    queryFn: async ({ signal }) => getUserAuditLogs(effectiveUserId, { page, limit }, { signal }),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const logs = useMemo(() => logsQuery.data?.data || [], [logsQuery.data]);
  const logsMeta = useMemo(() => {
    const m = logsQuery.data?.meta;
    if (m) return m;
    const total = Array.isArray(logs) ? logs.length : 0;
    return { page, limit, total, totalPages: 1 };
  }, [logsQuery.data, logs, page, limit]);

  const isInitialLoading = isSelfMode
    ? Boolean(authLoading && auth?.user == null)
    : Boolean(userQuery.isLoading && userQuery.data == null);
  const user = isSelfMode ? (auth?.user || null) : (userQuery.data || null);

  useEffect(() => {
    if (userQuery.isError) {
      toast.error(t('users.profile.failedLoad'));
    }
  }, [userQuery.isError, t]);

  useEffect(() => {
    setPage(1);
    setLimit(10);
  }, [effectiveUserId]);

  if (!isInitialLoading && !user) {
    return (
      <div className="space-y-6">
        <Alert variant="danger" title={t('users.profile.couldNotLoad')} />
      </div>
    );
  }

  return (
    <Card className="p-0 rounded-xl overflow-hidden">
      <div className="p-6">
        {userQuery.isError ? (
          <div className="text-sm text-red-600 mb-4">
            {userQuery.error?.data?.message || userQuery.error?.message || t('users.profile.failedLoad')}
          </div>
        ) : null}

        {isInitialLoading ? (
          <>
            <div className="w-full">
              <UserProfileCardSkeleton />
            </div>
            <UserDetailsCardsSkeleton />
          </>
        ) : (
          <>
            <div className="w-full">
              <UserProfileCard user={user} />
            </div>
            <UserDetailsCards user={user} lang={lang} />
          </>
        )}

        {showAudit ? (
          <div className="mt-6">
            <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
              <div className="px-4 py-3 border-b border-(--nb-color-border)">
                <h3 className="text-base font-semibold">{t('users.profile.auditHistory', { defaultValue: 'Audit History' })}</h3>
                <p className="text-xs text-(--nb-color-muted)">{t('users.profile.auditSubtitle', { defaultValue: 'Recent actions recorded for this user account' })}</p>
              </div>
              <div className="p-4">
                <AuditHistoryTable
                  logs={logs}
                  isLoading={Boolean(logsQuery.isLoading && logs.length === 0)}
                  error={logsQuery.isError ? (logsQuery.error?.data?.message || logsQuery.error?.message || t('users.profile.auditLoadFailed')) : null}
                  meta={logsMeta}
                  onPage={setPage}
                  onLimit={(v) => {
                    setLimit(v);
                    setPage(1);
                  }}
                  storageKey="users:auditLogs:columns:v2"
                  emptyTitle={t('users.profile.auditEmptyTitle')}
                  emptyDescription={t('users.profile.auditEmptyDescription')}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function firstChar(s) {
  const t = String(s || '').trim();
  return t ? t.charAt(0).toUpperCase() : '?';
}

function safeStr(v) {
  return displayText(v, '-');
}

function fmtDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return safeStr(value);
  return d.toISOString().slice(0, 10);
}

function UserProfileCard({ user }) {
  const { t } = useI18n();
  const fullName = String(user?.fullName || '').trim();
  const photoUrl = String(user?.photo?.url || user?.photoUrl || '').trim();
  const initials = useMemo(() => {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${firstChar(parts[0])}${firstChar(parts[1])}`;
    return firstChar(fullName);
  }, [fullName]);

  const role = String(user?.role || '').trim();
  const status = String(user?.status || '').trim();
  const staffCode = String(user?.staffCode || '').trim();

  return (
    <Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)] hover:border-(--nb-color-accent) focus-within:border-(--nb-color-accent) focus-within:ring-2 focus-within:ring-(--nb-color-accent-200) transition-colors">
      <div className="px-6 py-3 bg-(--nb-color-brand) text-white">
        <div className="font-semibold">{t('teachers.dashboard.profile.title', { defaultValue: 'My Profile' })}</div>
        <div className="text-xs text-white/80 mt-0.5">{t('teachers.dashboard.profile.subtitle', { defaultValue: 'Quick account info' })}</div>
      </div>

      <div className="p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full bg-linear-to-r from-(--nb-color-brand) to-(--nb-color-accent) text-white flex items-center justify-center text-lg md:text-xl font-semibold overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt={t('users.form.fields.photo', { defaultValue: 'Photo' })} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xl md:text-2xl font-semibold text-(--nb-color-text) truncate">{fullName || t('common.user', { defaultValue: 'User' })}</div>
              <span className="inline-flex items-center gap-1 rounded-full bg-(--nb-color-accent-50) text-(--nb-color-fg) border border-(--nb-color-border) px-2 py-0.5 text-xs font-semibold">
                <BadgeCheck size={14} /> {role ? role.toUpperCase() : t('users.profile.roleFallback', { defaultValue: 'STAFF' })}
              </span>
              {status ? <StatusBadge status={status} /> : null}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-base text-(--nb-color-text) min-w-0">
                <UserCircle2 size={18} className="text-(--nb-color-muted)" />
                <span className="truncate">{t('teachers.dashboard.profile.fields.username', { defaultValue: 'Username' })}: {safeStr(user?.username)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-base text-(--nb-color-text) min-w-0">
                <Hash size={18} className="text-(--nb-color-muted)" />
                <span className="truncate">{t('users.form.fields.staffCode', { defaultValue: 'Staff Code' })}: {displayText(staffCode, '-')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-base text-(--nb-color-text) min-w-0">
                <Mail size={18} className="text-(--nb-color-muted)" />
                <span className="truncate">{t('teachers.dashboard.profile.fields.email', { defaultValue: 'Email' })}: {safeStr(user?.email)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-base text-(--nb-color-text) min-w-0">
                <Phone size={18} className="text-(--nb-color-muted)" />
                <span className="truncate">{t('teachers.dashboard.profile.fields.phone', { defaultValue: 'Phone' })}: {safeStr(user?.phone)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-(--nb-color-muted)">
              <span>{t('users.profile.tip', { defaultValue: 'Tip: If profile fields are missing, ask admin to update this user record.' })}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function UserProfileCardSkeleton() {
  return (
    <Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)]">
      <div className="px-6 py-3 bg-(--nb-color-brand) text-white">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40 mt-2" />
      </div>

      <div className="p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <Skeleton className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-(--nb-color-muted)">{label}</div>
      <div className="text-sm font-semibold text-(--nb-color-text) wrap-break-word">{safeStr(value)}</div>
    </div>
  );
}

function PermissionsItem({ label, permissions, icon }) {
  const { t } = useI18n();
  const granted = useMemo(() => summarizePermissions(permissions, t), [permissions, t]);
  return (
    <div className="min-w-0 sm:col-span-2">
      <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-(--nb-color-muted)">
          {icon ? <span className="shrink-0 text-(--nb-color-muted)">{icon}</span> : null}
          <span>{label}</span>
        </div>
        {granted.length === 0 ? (
          <div className="text-sm font-semibold text-(--nb-color-text)">-</div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {granted.map((p) => (
              <Badge key={p.key} variant="neutral">{p.label}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BadgesItem({ label, values, icon, colSpanClass = 'sm:col-span-2' }) {
  const items = Array.isArray(values) ? values.filter(Boolean) : [];
  return (
    <div className={`min-w-0 ${colSpanClass}`}>
      <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-(--nb-color-muted)">
          {icon ? <span className="shrink-0 text-(--nb-color-muted)">{icon}</span> : null}
          <span>{label}</span>
        </div>
        {items.length === 0 ? (
          <div className="text-sm font-semibold text-(--nb-color-text)">-</div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {items.map((v) => (
              <Badge key={v} variant="neutral">{v}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function summarizePermissions(permissions, t) {
  if (!permissions || typeof permissions !== 'object') return [];
  const tt = typeof t === 'function' ? t : (k) => k;

  const actionLabel = (moduleName, perm) => {
    if (moduleName === 'security' && perm === 'deactivate') return tt('common.status.inactive');
    if (moduleName === 'security' && perm === 'activate') return tt('common.status.active');
    const key = `perms.${String(perm || '')}`;
    const translated = tt(key);
    if (translated && translated !== key) return translated;
    return String(perm || '').trim();
  };

  const out = [];
  for (const [moduleName, modulePerms] of Object.entries(permissions)) {
    if (!modulePerms || typeof modulePerms !== 'object') continue;
    const isFull = Boolean(modulePerms.full);
    const moduleLabel = moduleLabelForProfile(moduleName, tt);
    if (isFull) {
      const fullLabelKey = 'perms.full';
      const fullLabel = tt(fullLabelKey);
      out.push({
        key: `${moduleName}:full`,
        label: `${moduleLabel}: ${fullLabel && fullLabel !== fullLabelKey ? fullLabel : 'FULL'}`,
      });
      continue;
    }
    const actions = Object.keys(modulePerms)
      .filter((k) => k !== 'full')
      .filter((k) => Boolean(modulePerms[k]));
    if (actions.length) {
      const actionsLabel = actions.map((a) => actionLabel(moduleName, a)).join(', ');
      out.push({ key: `${moduleName}:custom`, label: `${moduleLabel}: ${actionsLabel}` });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

function UserDetailsCards({ user, lang }) {
  const { t } = useI18n();
  const isSomali = user?.isSomali !== false;
  const regionLabel = user?.residenceRegionId ? getSomaliaRegionLabel(user.residenceRegionId, lang) : '';
  const districtLabel = (user?.residenceRegionId && user?.residenceDistrictId)
    ? getSomaliaDistrictLabel(user.residenceRegionId, user.residenceDistrictId, lang)
    : '';

  const cardBase =
    'rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) ' +
    'shadow-(--nb-shadow-md) shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)] ' +
    'hover:border-(--nb-color-accent) focus-within:border-(--nb-color-accent) ' +
    'focus-within:ring-2 focus-within:ring-(--nb-color-accent-200) transition-colors';

  const cardHeaderBase =
    'px-4 py-3 border-b border-(--nb-color-border) ' +
    'bg-linear-to-r from-(--nb-color-brand-100) to-(--nb-color-accent-100) ' +
    'rounded-t-(--nb-radius-md)';

  const cardTitleClass = 'text-base font-semibold text-(--nb-color-fg)';

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className={cardBase}>
        <div className={cardHeaderBase}>
          <h3 className={cardTitleClass}>{t('users.form.sections.personal', { defaultValue: 'Personal' })}</h3>
          <p className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.profile.subtitle', { defaultValue: 'Quick account info' })}</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem label={t('users.form.fields.fullName', { defaultValue: 'Full Name' })} value={user?.fullName} />
          <InfoItem label={t('users.form.fields.username', { defaultValue: 'Username' })} value={user?.username} />
          <InfoItem label={t('users.profile.labels.role', { defaultValue: 'Role' })} value={String(user?.role || '').toUpperCase()} />
          <InfoItem label={t('users.profile.labels.status', { defaultValue: 'Status' })} value={user?.status} />
        </div>
      </Card>

      <Card className={cardBase}>
        <div className={cardHeaderBase}>
          <h3 className={cardTitleClass}>{t('users.form.sections.contact', { defaultValue: 'Contact' })}</h3>
          <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.contacts.subtitle', { defaultValue: 'Phone numbers and email addresses' })}</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem label={t('users.form.fields.email', { defaultValue: 'Email' })} value={user?.email} />
          <InfoItem label={t('users.form.primaryPhone', { defaultValue: 'Primary Phone' })} value={user?.phone} />
          <InfoItem label={t('users.form.secondaryPhone', { defaultValue: 'Secondary Phone' })} value={user?.phone2} />
          <InfoItem label={t('users.profile.labels.lastLogin', { defaultValue: 'Last Login' })} value={user?.lastLogin ? fmtDate(user.lastLogin) : t('users.profile.never', { defaultValue: 'Never' })} />
        </div>
      </Card>

      <Card className={cardBase}>
        <div className={cardHeaderBase}>
          <h3 className={cardTitleClass}>{t('users.form.sections.address', { defaultValue: 'Address' })}</h3>
          <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.residence.subtitle', { defaultValue: 'Home location details' })}</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem
            label={t('students.address.nationality.label', { defaultValue: 'Nationality' })}
            value={isSomali
              ? t('students.address.nationality.somali', { defaultValue: 'Somali' })
              : t('students.address.nationality.notSomali', { defaultValue: 'Not Somali' })}
          />
          <InfoItem
            label={t('users.form.nationalityDetail', { defaultValue: 'Nationality (details)' })}
            value={isSomali ? '-' : (user?.nationality || '-')}
          />
          <InfoItem
            label={t('students.address.region.label', { defaultValue: 'Region' })}
            value={!isSomali ? '-' : (regionLabel || user?.residenceRegionId)}
          />
          <InfoItem
            label={t('students.address.district.label', { defaultValue: 'District' })}
            value={!isSomali ? '-' : (districtLabel || user?.residenceDistrictId)}
          />
          <InfoItem
            label={t('students.address.neighborhood.label', { defaultValue: 'Neighborhood' })}
            value={!isSomali ? '-' : user?.residenceNeighborhood}
          />
        </div>
      </Card>

      <Card className={cardBase}>
        <div className={cardHeaderBase}>
          <h3 className={cardTitleClass}>{t('users.profile.sections.staff', { defaultValue: 'Staff' })}</h3>
          <p className="text-xs text-(--nb-color-muted)">{t('users.profile.sections.staffSubtitleDetails', { defaultValue: 'Work details' })}</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem label={t('users.form.fields.staffCode', { defaultValue: 'Staff Code' })} value={user?.staffCode} />
          <InfoItem label={t('users.form.fields.salary', { defaultValue: 'Salary' })} value={user?.salary} />
          <InfoItem label={t('users.profile.labels.createdAt', { defaultValue: 'Created At' })} value={fmtDate(user?.createdAt)} />
          <InfoItem label={t('users.profile.labels.updatedAt', { defaultValue: 'Updated At' })} value={fmtDate(user?.updatedAt)} />
        </div>
      </Card>

      <Card className={`${cardBase} lg:col-span-2 border-(--nb-color-accent)`}>
        <div className={cardHeaderBase}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-(--nb-color-fg)" />
            <h3 className={cardTitleClass}>{t('users.form.sections.permissions', { defaultValue: 'Permissions' })}</h3>
          </div>
          <p className="text-xs text-(--nb-color-muted)">{t('users.profile.sections.permissionsSubtitle', { defaultValue: 'Module groups, modules, and granted permissions' })}</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(() => {
            const enabledModules = getEnabledModulesFromPermissions(user?.permissions);
            const groupIds = getModuleGroupIdsForModules(enabledModules);
            const groupLabels = groupIds.map((g) => t(`users.staff.units.${g}`, { defaultValue: g }));
            const moduleLabels = enabledModules.map((m) => moduleLabelForProfile(m, t));

            return (
              <>
                <BadgesItem
                  label={t('users.form.selectModuleGroup', { defaultValue: 'Select Module Group' })}
                  values={groupLabels}
                  icon={<Layers size={14} />}
                  colSpanClass="sm:col-span-1"
                />
                <BadgesItem
                  label={t('users.form.selectModule', { defaultValue: 'Select Module' })}
                  values={moduleLabels}
                  icon={<Boxes size={14} />}
                  colSpanClass="sm:col-span-1"
                />
              </>
            );
          })()}
          <PermissionsItem
            label={t('users.form.sections.permissions', { defaultValue: 'Permissions' })}
            permissions={user?.permissions}
            icon={<Key size={14} />}
          />
        </div>
      </Card>
    </div>
  );
}

function getEnabledModulesFromPermissions(permissions) {
  const p = permissions && typeof permissions === 'object' ? permissions : {};

  const moduleHasAnyEnabledPermission = (permObj) => {
    if (!permObj || typeof permObj !== 'object') return false;
    if (permObj.full === true) return true;
    return Object.entries(permObj).some(([k, v]) => k !== 'full' && v === true);
  };

  return Object.entries(p)
    .filter(([, permObj]) => moduleHasAnyEnabledPermission(permObj))
    .map(([module]) => String(module))
    .sort((a, b) => a.localeCompare(b));
}

function moduleGroupIdFor(moduleName) {
  const m = String(moduleName || '');
  if (m.startsWith('finance')) return 'finance';
  if (m === 'security' || m === 'trackingAudit' || m === 'privacyControl') return 'security';
  if (m === 'announcements') return 'announcements';
  if (m === 'students' || m === 'teachers') return 'users';
  if (['grades', 'subjects', 'cohorts', 'promotions', 'transfers'].includes(m)) return 'academics';
  if (['exams', 'results', 'transcript'].includes(m)) return 'exams';
  if (['attendance', 'attendanceReports', 'timetable', 'library'].includes(m)) return 'operations';
  return 'other';
}

function getModuleGroupIdsForModules(modules) {
  const mods = Array.isArray(modules) ? modules : [];
  return Array.from(new Set(mods.map(moduleGroupIdFor))).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function moduleLabelForProfile(moduleName, t) {
  const m = String(moduleName || '').trim();
  if (!m) return '';
  const key = `modules.${m}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return formatModuleLabel(m);
}

function formatModuleLabel(moduleName) {
  const s = String(moduleName || '').trim();
  if (!s) return '';
  const spaced = s
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function UserDetailsCardsSkeleton() {
  const cardBase =
    'rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) ' +
    'shadow-(--nb-shadow-md) shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)]';

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className={cardBase}>
          <div className="px-4 py-3 border-b border-(--nb-color-border) bg-linear-to-r from-(--nb-color-brand-100) to-(--nb-color-accent-100) rounded-t-(--nb-radius-md)">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-44 mt-2" />
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((__, j) => (
              <div key={j}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full mt-2" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
