import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart2, ClipboardList, BookOpenCheck, Users, CalendarDays } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { getStudentHistory, getStudentOverallSummary } from '../../../../api';
import { getSlotsWithOptions } from '../../../timetable/api/timetable';
import { getStudentAttendanceSelfWithOptions, getStudentSelfAttendanceWithOptions } from '../../../attendance/api/attendance';
import { getStudentTranscript } from '../../../exams/api/exams';
import { getStudentProfile, getStudentTransfers } from '../../../../api';
import { getSessionSignal } from '../../../../api/sessionAbort';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { studentKeys } from '../../queryKeys';
import PageLoading from '../../../../shared/components/feedback/PageLoading.jsx';
import ForcePasswordChangeModal from '../../../../auth/components/ForcePasswordChangeModal';
import { useStudentDashboardRealtimeInvalidation } from './useStudentDashboardRealtimeInvalidation';
import { useI18n } from '../../../../i18n/useI18n';

function isoDateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function subDays(date, days) {
  const dt = new Date(date);
  dt.setUTCDate(dt.getUTCDate() - Number(days || 0));
  return dt;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function statusGroup(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'present') return 'present';
  if (v === 'absent') return 'absent';
  if (v === 'late') return 'late';
  if (v === 'excused' || v === 'sick' || v === 'medical' || v === 'family' || v === 'other') return 'excused';
  return 'other';
}

async function buildLevelStats({ queryClient, studentId, historyRows }) {
  const sessionSignal = getSessionSignal();
  const rows = Array.isArray(historyRows) ? historyRows : [];
  const sorted = rows.slice().sort((a, b) => {
    const ya = ayStart(a?.academicYear?.yearName);
    const yb = ayStart(b?.academicYear?.yearName);
    if (ya !== yb) return ya - yb;
    const sa = (a?.sequenceInYear ?? 1);
    const sb = (b?.sequenceInYear ?? 1);
    return sa - sb;
  });

  const results = [];
  for (const en of sorted) {
    if (sessionSignal?.aborted) break;
    const academicYearId = en?.academicYear?._id || en?.academicYear;
    const gradeSectionId = en?.gradeSection?._id || en?.gradeSection;
    if (!academicYearId || !gradeSectionId) continue;

    const data = await queryClient.ensureQueryData({
      queryKey: studentKeys.transcriptByEnrollment(studentId, { academicYearId, gradeSectionId }),
      queryFn: async () => {
        const { ok, data, error } = await getStudentTranscript(
          { academicYearId, gradeSectionId, studentId },
          { signal: sessionSignal }
        );
        if (!ok) throw new Error(error || 'Transcript load failed');
        return data;
      },
    });

    const label = String(en?.grade?.gradeName || en?.gradeSection?.grade?.gradeName || 'Level').trim();
    results.push({
      label,
      yearName: String(en?.academicYear?.yearName || '').trim(),
      average: Number(data?.overall?.average || 0),
      total: Number(data?.overall?.total || 0),
    });
  }
  return results;
}

function SmallStat({ label, value, tone = 'gray', size = 'md' }) {
  const tones = {
    gray: 'bg-(--nb-color-bg) text-(--nb-color-fg)',
    blue: 'bg-(--nb-color-brand-50) text-(--nb-color-brand)',
    emerald: 'bg-(--nb-color-accent-50) text-(--nb-color-accent)',
    amber: 'bg-(--nb-color-brand-50) text-(--nb-color-brand)',
    red: 'bg-red-50 text-red-700',
  };

  const sizes = {
    md: { wrap: 'px-3 py-2', label: 'text-xs', value: 'text-sm' },
    sm: { wrap: 'px-2 py-1.5', label: 'text-[10px]', value: 'text-xs' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex items-center gap-2 rounded ${s.wrap} ${tones[tone] || tones.gray}`}>
      <span className={`${s.label} font-semibold uppercase tracking-wide`}>{label}</span>
      <span className={`${s.value} font-semibold`}>{value}</span>
    </div>
  );
}

function DashboardSkeletonCard() {
  return (
    <div className="rounded-xl border border-(--nb-color-border) p-5 shadow-sm bg-(--nb-color-bg-card) animate-pulse">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-11 h-11 rounded-lg bg-(--nb-color-bg) border border-(--nb-color-border)" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-28 bg-(--nb-color-bg) rounded" />
          <div className="h-3 w-44 bg-(--nb-color-bg) rounded mt-3" />
        </div>
      </div>
    </div>
  );
}

function StudentDashboardSkeleton({ t }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-(--nb-color-border) bg-linear-to-r from-(--nb-color-brand-50) to-(--nb-color-accent-50) p-5 animate-pulse">
        <div className="h-7 w-56 bg-(--nb-color-bg-card) opacity-70 rounded" />
        <div className="h-4 w-72 bg-(--nb-color-bg-card) opacity-70 rounded mt-3" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <DashboardSkeletonCard key={i} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
            <div className="font-semibold">{t('nav.attendance')}</div>
            <div className="text-xs text-white/80 mt-0.5">{t('common.loading')}</div>
          </div>
          <div className="p-5 animate-pulse">
            <div className="h-5 w-36 bg-(--nb-color-bg) rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-(--nb-color-bg)" />
              ))}
            </div>
            <div className="h-28 w-full rounded bg-(--nb-color-bg) mt-6" />
          </div>
        </div>

        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
            <div className="font-semibold">{t('students.selfDashboard.todayScheduleTitle')}</div>
            <div className="text-xs text-white/80 mt-0.5">{t('common.loading')}</div>
          </div>
          <div className="p-5 animate-pulse space-y-2">
            <div className="h-10 rounded bg-(--nb-color-bg)" />
            <div className="h-10 rounded bg-(--nb-color-bg)" />
            <div className="h-10 rounded bg-(--nb-color-bg)" />
            <div className="h-20 rounded bg-(--nb-color-bg) mt-4" />
          </div>
        </div>

        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-sm overflow-hidden xl:col-span-2">
          <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
            <div className="font-semibold">{t('nav.transcript')}</div>
            <div className="text-xs text-white/80 mt-0.5">{t('common.loading')}</div>
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
            <div className="lg:col-span-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) p-4">
              <div className="h-4 w-40 bg-(--nb-color-bg) rounded" />
              <div className="h-36 rounded bg-(--nb-color-bg) mt-4" />
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="h-9 w-24 rounded bg-(--nb-color-bg)" />
                <div className="h-9 w-24 rounded bg-(--nb-color-bg)" />
                <div className="h-9 w-24 rounded bg-(--nb-color-bg)" />
              </div>
            </div>
            <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) p-4">
              <div className="h-4 w-40 bg-(--nb-color-bg) rounded" />
              <div className="h-3 w-44 bg-(--nb-color-bg) rounded mt-3" />
              <div className="h-28 w-28 rounded-full bg-(--nb-color-bg) mt-6" />
              <div className="space-y-2 mt-6">
                <div className="h-3 w-full bg-(--nb-color-bg) rounded" />
                <div className="h-3 w-5/6 bg-(--nb-color-bg) rounded" />
                <div className="h-3 w-4/6 bg-(--nb-color-bg) rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerticalBarChart({ items = [], height = 88, onHover, onLeave }) {
  // items: [{ label, value, className }]
  const max = Math.max(1, ...items.map(i => Number(i?.value || 0)));

  return (
    <div className="w-full">
      <div className="flex items-end gap-3" style={{ height }}>
        {items.map((it) => {
          const v = Number(it?.value || 0);
          const h = Math.round((v / max) * (height - 10));
          const barHeight = clamp(h, 2, height - 10);
          return (
            <div key={it.label} className="flex-1 min-w-0">
              <div className="w-full rounded bg-(--nb-color-bg) overflow-hidden" style={{ height }}>
                <div
                  className={`${it.className} w-full`}
                  style={{ height: `${barHeight}px`, marginTop: `${height - barHeight}px` }}
                  onMouseEnter={typeof onHover === 'function' ? (() => onHover(it, max)) : undefined}
                  onMouseLeave={typeof onLeave === 'function' ? onLeave : undefined}
                />
              </div>
              <div className="mt-2 text-[11px] text-(--nb-color-muted) text-center truncate">{it.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PieChart({ segments = [], size = 112, onHover, onLeave }) {
  // segments: [{ value, className, label }]
  const total = segments.reduce((acc, s) => acc + Number(s?.value || 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  if (!total) {
    return <div className="h-28 w-28 rounded-full bg-gray-100" />;
  }

  let start = -Math.PI / 2;
  const toXY = (angle) => ({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {segments.map((s) => {
        const v = Number(s?.value || 0);
        const frac = v / total;
        const end = start + frac * Math.PI * 2;
        const a = toXY(start);
        const b = toXY(end);
        const large = frac > 0.5 ? 1 : 0;
        const d = [
          `M ${cx} ${cy}`,
          `L ${a.x.toFixed(3)} ${a.y.toFixed(3)}`,
          `A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(3)} ${b.y.toFixed(3)}`,
          'Z',
        ].join(' ');

        start = end;
        return (
          <path
            key={s.label}
            d={d}
            className={s.className}
            onMouseEnter={typeof onHover === 'function' ? (() => onHover(s, total)) : undefined}
            onMouseLeave={typeof onLeave === 'function' ? onLeave : undefined}
          />
        );
      })}
    </svg>
  );
}

function Donut({ segments = [], size = 72, strokeWidth = 10, onHover, onLeave }) {
  // segments: [{ value: number, className: string, label?: string }]
  const radius = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * radius;
  const total = segments.reduce((acc, s) => acc + Number(s?.value || 0), 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        strokeWidth={strokeWidth}
        className="stroke-gray-200"
      />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s, idx) => {
          const v = Number(s?.value || 0);
          const len = total > 0 ? (v / total) * c : 0;
          const dash = `${len} ${c - len}`;
          const dashOffset = -offset;
          offset += len;
          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={s.className}
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              onMouseEnter={typeof onHover === 'function' ? (() => onHover(s)) : undefined}
              onMouseLeave={typeof onLeave === 'function' ? onLeave : undefined}
            />
          );
        })}
      </g>
    </svg>
  );
}

function MiniBars({ values = [], height = 44 }) {
  const max = Math.max(1, ...values.map(v => Number(v || 0)));
  return (
    <div className="flex items-end gap-1 h-11">
      {values.map((v, idx) => {
        const n = Number(v || 0);
        const h = Math.round((n / max) * height);
        return (
          <div key={idx} className="flex-1 min-w-0">
            <div className="w-full rounded bg-(--nb-color-brand-50) overflow-hidden">
              <div className="w-full bg-(--nb-color-brand)" style={{ height: `${clamp(h, 2, height)}px` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ value = 0, max = 100 }) {
  const pct = max > 0 ? (Number(value || 0) / Number(max)) * 100 : 0;
  const w = `${clamp(pct, 0, 100).toFixed(1)}%`;
  return (
    <div className="w-full rounded bg-(--nb-color-border) h-2 overflow-hidden">
      <div className="bg-(--nb-color-accent) h-2" style={{ width: w }} />
    </div>
  );
}

function getTimetableDayIndexFromLocalDate(d = new Date()) {
  // TimetableGrid uses: 0=Saturday,1=Sunday,2=Monday,3=Tuesday,4=Wednesday,5=Thursday,6=Friday
  // JS Date.getDay(): 0=Sunday..6=Saturday
  const jsDay = d.getDay();
  return (jsDay + 1) % 7;
}

function localISODateOnly(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function ayStart(yearName) {
  if (!yearName) return 0;
  const m = String(yearName).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : 0;
}

function LineChart({ points = [], height = 140, onHover, onLeave }) {
  // points: [{ label: string, value: number }]
  const width = 560;
  const pad = 22;

  const values = points.map(p => Number(p?.value || 0));
  const minV = Math.min(0, ...values);
  const maxV = Math.max(100, ...values);
  const range = Math.max(1, maxV - minV);

  const xFor = (i) => {
    if (points.length <= 1) return pad;
    const w = width - pad * 2;
    return pad + (i / (points.length - 1)) * w;
  };

  const yFor = (v) => {
    const h = height - pad * 2;
    const t = (Number(v) - minV) / range;
    return height - pad - t * h;
  };

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`)
    .join(' ');

  const area = `${d} L ${xFor(points.length - 1).toFixed(1)} ${(height - pad).toFixed(1)} L ${xFor(0).toFixed(1)} ${(height - pad).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--nb-color-brand)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--nb-color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lineFill)" />
      <path d={d} fill="none" stroke="var(--nb-color-brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xFor(i)}
          cy={yFor(p.value)}
          r="5"
          fill="var(--nb-color-bg-card)"
          stroke="var(--nb-color-brand)"
          strokeWidth="2"
          onMouseEnter={typeof onHover === 'function' ? (() => onHover(p, i)) : undefined}
          onMouseLeave={typeof onLeave === 'function' ? onLeave : undefined}
        />
      ))}
    </svg>
  );
}

function Card({ to, title, description, Icon, tone }) {
  const base =
    'block rounded-xl border border-(--nb-color-border) border-b-4 border-b-(--nb-color-accent) ' +
    'bg-(--nb-color-bg-card) p-5 shadow-md transition';
  const active = 'hover:shadow-lg hover:border-(--nb-color-accent-200)';

  return (
    <NavLink
      to={to}
      className={`${base} ${active}`}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-11 h-11 rounded-lg border border-(--nb-color-border) bg-(--nb-color-accent-100) text-(--nb-color-brand) flex items-center justify-center">
          {Icon ? <Icon size={20} /> : null}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-(--nb-color-text)">{title}</div>
          <div className="text-sm text-(--nb-color-muted) mt-1">{description}</div>
        </div>
      </div>
    </NavLink>
  );
}

export default function StudentSelfDashboardShell() {
  const { auth, refreshUser } = useAuth();
  const mustChangePassword = auth?.user?.role === 'student' && !!auth?.user?.mustChangePassword;
  const [forceOpen, setForceOpen] = useState(false);

  const rawStudentRef = auth?.user?.studentRef;
  const studentId = auth?.user?.role === 'student' ? (rawStudentRef?._id || rawStudentRef || null) : null;

  useStudentDashboardRealtimeInvalidation({ studentId, isStudentSelf: true, enabled: true });

  useEffect(() => {
    if (!mustChangePassword) {
      setForceOpen(false);
      return;
    }
    const dismissed = sessionStorage.getItem('student_force_pw_dismissed') === '1';
    setForceOpen(!dismissed);
  }, [mustChangePassword, auth?.user?._id]);

  const skip = () => {
    sessionStorage.setItem('student_force_pw_dismissed', '1');
    setForceOpen(false);
  };

  const changed = async () => {
    sessionStorage.removeItem('student_force_pw_dismissed');
    setForceOpen(false);
    if (typeof refreshUser === 'function') {
      await refreshUser();
    }
  };

  return (
    <div className="space-y-4">
      <StudentSelfPrefetcher />
      <ForcePasswordChangeModal isOpen={forceOpen} onSkip={skip} onChanged={changed} mode="student" />
      <Outlet />
    </div>
  );
}

function StudentSelfPrefetcher() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const rawStudentRef = auth?.user?.studentRef;
  const studentId = auth?.user?.role === 'student' ? (rawStudentRef?._id || rawStudentRef || null) : null;
  const canPrefetchSelfAttendance = auth?.user?.role === 'student';

  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return { from: isoDateOnly(start), to: isoDateOnly(end) };
  }, []);

  // Warm up core student data so tabs feel instant.
  useEffect(() => {
    if (!studentId) {
      if (!canPrefetchSelfAttendance) return;
      queryClient.ensureQueryData({
        queryKey: studentKeys.attendanceSelf({ from, to }),
        queryFn: async () => {
          const res = await getStudentSelfAttendanceWithOptions({ from, to });
          return Array.isArray(res?.data) ? res.data : [];
        },
      }).catch(() => {});
      return;
    }

    queryClient.ensureQueryData({
      queryKey: studentKeys.profile(studentId),
      queryFn: async () => {
        const data = await getStudentProfile(studentId);
        if (!data) throw new Error('Failed to load profile');
        return data;
      },
    }).catch(() => {});

    queryClient.ensureQueryData({
      queryKey: studentKeys.transfers(studentId, { limit: 1 }),
      queryFn: async () => {
        const res = await getStudentTransfers(studentId, { limit: 1 });
        return Array.isArray(res?.data) ? res.data : [];
      },
    }).catch(() => {});

    // Transfers tab loads up to 50; prefetch it so opening Transfers is instant.
    queryClient.ensureQueryData({
      queryKey: studentKeys.transfers(studentId, { limit: 50 }),
      queryFn: async () => {
        const res = await getStudentTransfers(studentId, { limit: 50 });
        return Array.isArray(res?.data) ? res.data : [];
      },
    }).catch(() => {});

    queryClient.ensureQueryData({
      queryKey: studentKeys.attendanceSelf({ from, to }),
      queryFn: async () => {
        const res = await getStudentSelfAttendanceWithOptions({ from, to });
        return Array.isArray(res?.data) ? res.data : [];
      },
    }).catch(() => {});

    queryClient.ensureQueryData({
      queryKey: studentKeys.overallSummary(studentId),
      queryFn: async () => {
        return await getStudentOverallSummary(studentId);
      },
    }).catch(() => {});
  }, [queryClient, studentId, canPrefetchSelfAttendance, from, to]);

  // Warm up timetable after we know the active class (gradeSection).
  useEffect(() => {
    if (!studentId) return;
    let canceled = false;

    (async () => {
      try {
        const historyRows = await queryClient.ensureQueryData({
          queryKey: studentKeys.history(studentId, { page: 1, limit: 1000 }),
          queryFn: async () => {
            const res = await getStudentHistory(studentId, { page: 1, limit: 1000 });
            return Array.isArray(res?.data) ? res.data : [];
          },
        });
        if (canceled) return;

        const rows = Array.isArray(historyRows) ? historyRows : [];
        const active = rows.find(r => String(r?.status || '').toLowerCase() === 'active' && !r?.leftAt);
        const chosen = active || rows[0] || null;
        const academicYearId = chosen?.academicYear?._id || chosen?.academicYear || null;
        const gsId = chosen?.gradeSection?._id || chosen?.gradeSection || null;
        const gradeSectionId = gsId ? String(gsId) : null;
        if (!gradeSectionId) return;

        // Prefetch the most important/heaviest data early (Transcript for active enrollment)
        // so opening Transcript is instant and we don't restart/cancel work on tab navigation.
        if (academicYearId) {
          const sessionSignal = getSessionSignal();
          queryClient.ensureQueryData({
            queryKey: studentKeys.transcriptByEnrollment(studentId, { academicYearId, gradeSectionId }),
            queryFn: async () => {
              const { ok, data, error } = await getStudentTranscript(
                { academicYearId, gradeSectionId, studentId },
                { signal: sessionSignal }
              );
              if (!ok) throw new Error(error || 'Transcript load failed');
              return data;
            },
          }).catch(() => {});
        }

        await queryClient.ensureQueryData({
          queryKey: studentKeys.timetableSlotsByGradeSection(gradeSectionId),
          queryFn: async () => {
            const slotsRes = await getSlotsWithOptions({ gs: String(gradeSectionId) });
            return Array.isArray(slotsRes?.data) ? slotsRes.data : [];
          },
        });

        // Prefetch all transcripts (per enrollment) and the derived level stats used by the dashboard.
        const enrollmentsKey = rows.map(r => String(r?._id || '')).filter(Boolean).join('|');
        if (enrollmentsKey) {
          queryClient.ensureQueryData({
            queryKey: studentKeys.levelStats(studentId, enrollmentsKey),
            queryFn: async () => buildLevelStats({ queryClient, studentId, historyRows: rows }),
          }).catch(() => {});
        }
      } catch {
        // non-blocking
      }
    })();

    return () => { canceled = true; };
  }, [queryClient, studentId]);

  return null;
}

export function StudentSelfHomeCards({ studentIdOverride } = {}) {
  const { auth } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isStudentSelf = auth?.user?.role === 'student' && !studentIdOverride;

  const rawStudentRef = auth?.user?.studentRef;
  const studentRefId = rawStudentRef?._id || rawStudentRef || null;
  const studentId = studentIdOverride || (auth?.user?.role === 'student' ? studentRefId : null);

  const cardsBasePath = useMemo(() => {
    if (studentIdOverride) return `/students/${String(studentIdOverride)}`;
    return '/student-dashboard';
  }, [studentIdOverride]);

  const profileNameQuery = useQuery({
    queryKey: studentKeys.profile(studentId),
    enabled: !!studentId && !isStudentSelf,
    queryFn: async () => {
      const data = await getStudentProfile(studentId);
      if (!data) throw new Error('Failed to load profile');
      return data;
    },
  });

  const name = isStudentSelf
    ? (auth?.user?.fullName || auth?.user?.username || t('students.common.studentFallback'))
    : (profileNameQuery.data?.student?.fullName || t('students.common.studentFallback'));

  const [attendanceHover, setAttendanceHover] = useState(null);

  const [lineHover, setLineHover] = useState(null);
  const [pieHover, setPieHover] = useState(null);

  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return { from: isoDateOnly(start), to: isoDateOnly(end) };
  }, []);

  const historyQuery = useQuery({
    queryKey: studentKeys.history(studentId, { page: 1, limit: 1000 }),
    enabled: !!studentId,
    queryFn: async () => {
      const res = await getStudentHistory(studentId, { page: 1, limit: 1000 });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const historyRows = historyQuery.data || [];
  const chosenEnrollment = useMemo(() => {
    const rows = Array.isArray(historyRows) ? historyRows : [];
    const active = rows.find(r => String(r?.status || '').toLowerCase() === 'active' && !r?.leftAt);
    return active || rows[0] || null;
  }, [historyRows]);

  const activeGradeSectionId = useMemo(() => {
    const chosen = chosenEnrollment;
    const gsId = chosen?.gradeSection?._id || chosen?.gradeSection || null;
    return gsId ? String(gsId) : null;
  }, [chosenEnrollment]);

  const currentLevelLabel = useMemo(() => {
    const chosen = chosenEnrollment;
    const lvl = chosen?.grade?.gradeName || chosen?.gradeSection?.grade?.gradeName || '';
    return String(lvl || '').trim();
  }, [chosenEnrollment]);

  const attendanceQuery = useQuery({
    queryKey: isStudentSelf
      ? studentKeys.attendanceSelf({ from, to })
      : studentKeys.attendanceByStudent(studentId, { from, to }),
    enabled: isStudentSelf ? true : !!studentId,
    queryFn: async () => {
      const res = isStudentSelf
        ? await getStudentSelfAttendanceWithOptions({ from, to })
        : await getStudentAttendanceSelfWithOptions(studentId, { from, to });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const attendanceCounts = useMemo(() => {
    const rows = Array.isArray(attendanceQuery.data) ? attendanceQuery.data : [];
    const counts = { present: 0, absent: 0, late: 0, excused: 0, other: 0 };
    for (const r of rows) {
      const g = statusGroup(r?.status);
      counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }, [attendanceQuery.data]);

  const timetableQuery = useQuery({
    queryKey: studentKeys.timetableSlotsByGradeSection(activeGradeSectionId),
    enabled: !!activeGradeSectionId,
    queryFn: async () => {
      const slotsRes = await getSlotsWithOptions({ gs: String(activeGradeSectionId) });
      return Array.isArray(slotsRes?.data) ? slotsRes.data : [];
    },
  });

  const timetableSlots = timetableQuery.data || [];
  const timetableCountsByDay = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const s of timetableSlots) {
      if (s?.isBreak) continue;
      const d = Number(s?.dayOfWeek);
      if (!Number.isNaN(d) && d >= 0 && d <= 6) counts[d] += 1;
    }
    return counts;
  }, [timetableSlots]);

  const overallSummaryQuery = useQuery({
    queryKey: studentKeys.overallSummary(studentId),
    enabled: !!studentId,
    queryFn: async ({ signal }) => {
      return await getStudentOverallSummary(studentId, { signal });
    },
  });

  const enrollmentsKey = useMemo(() => {
    const rows = Array.isArray(historyRows) ? historyRows : [];
    return rows.map(r => String(r?._id || '')).filter(Boolean).join('|');
  }, [historyRows]);

  const levelsQuery = useQuery({
    queryKey: studentKeys.levelStats(studentId, enrollmentsKey),
    enabled: !!studentId && Array.isArray(historyRows) && historyRows.length > 0,
    queryFn: async () => buildLevelStats({ queryClient, studentId, historyRows }),
  });

  // Reset chart hover when dataset changes.
  useEffect(() => {
    setPieHover(null);
    setLineHover(null);
  }, [levelsQuery.data]);

  const attendanceLoading = attendanceQuery.isLoading;
  const historyLoading = historyQuery.isLoading;
  const timetableLoading = historyLoading || timetableQuery.isLoading;
  const transcriptLoading = overallSummaryQuery.isLoading;
  const levelsLoading = levelsQuery.isLoading;

  const overallSummary = overallSummaryQuery.data ?? null;
  const levelStats = levelsQuery.data ?? [];

  const showWarmupLoading = !!studentId && historyQuery.isLoading && !historyQuery.data;

  const attendanceTotal = Object.values(attendanceCounts).reduce((a, b) => a + Number(b || 0), 0);
  const attendancePresentPct = attendanceTotal > 0 ? Math.round((attendanceCounts.present / attendanceTotal) * 100) : 0;

  const dayLabels = [
    t('common.days.short.sat'),
    t('common.days.short.sun'),
    t('common.days.short.mon'),
    t('common.days.short.tue'),
    t('common.days.short.wed'),
    t('common.days.short.thu'),
    t('common.days.short.fri'),
  ];

  const todaySchedule = useMemo(() => {
    const now = new Date();
    const todayIdx = getTimetableDayIndexFromLocalDate(now);
    const dayNames = [
      t('common.days.long.saturday'),
      t('common.days.long.sunday'),
      t('common.days.long.monday'),
      t('common.days.long.tuesday'),
      t('common.days.long.wednesday'),
      t('common.days.long.thursday'),
      t('common.days.long.friday'),
    ];
    const dateISO = localISODateOnly(now);
    const list = (Array.isArray(timetableSlots) ? timetableSlots : [])
      .filter(s => Number(s?.dayOfWeek) === todayIdx && !s?.isBreak)
      .slice()
      .sort((a, b) => String(a?.startTime || '').localeCompare(String(b?.startTime || '')));
    return {
      todayIdx,
      dayName: dayNames[todayIdx] || '-',
      dateISO,
      slots: list,
    };
  }, [timetableSlots, t]);

  const levelLinePoints = useMemo(() => {
    const arr = Array.isArray(levelStats) ? levelStats : [];
    return arr.map((x) => ({
      label: x.yearName ? `${x.label} • ${x.yearName}` : x.label,
      value: Number(x.average || 0),
    }));
  }, [levelStats]);

  const pieSegments = useMemo(() => {
    const arr = Array.isArray(levelStats) ? levelStats : [];
    const palette = [
      'fill-(--nb-color-brand)',
      'fill-(--nb-color-accent)',
      'fill-(--nb-color-brand)',
      'fill-(--nb-color-accent)',
      'fill-(--nb-color-brand)',
      'fill-(--nb-color-accent)',
    ];
    return arr.map((x, idx) => ({
      label: x.yearName ? `${x.label} • ${x.yearName}` : x.label,
      value: Number(x.total || 0) || Number(x.average || 0),
      className: palette[idx % palette.length],
    }));
  }, [levelStats]);

  return (
    <div className="space-y-4">
      {showWarmupLoading ? (
        <StudentDashboardSkeleton t={t} />
      ) : (
        <>
          <div className="rounded-xl border border-(--nb-color-border) bg-linear-to-r from-(--nb-color-brand-50) to-(--nb-color-accent-50) p-5">
            <div className="text-xl md:text-2xl font-semibold text-(--nb-color-fg)">{t('students.selfDashboard.welcome', { name })}</div>
            <div className="text-sm text-(--nb-color-muted) mt-1">{t('students.selfDashboard.chooseBelow')}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <Card
              to={`${cardsBasePath}/transcript`}
              title={t('nav.transcript')}
              description={t('students.selfDashboard.cards.transcriptDesc')}
              Icon={BarChart2}
              tone="indigo"
            />
            <Card
              to={`${cardsBasePath}/attendance`}
              title={t('nav.attendance')}
              description={t('students.selfDashboard.cards.attendanceDesc')}
              Icon={ClipboardList}
              tone="emerald"
            />
            <Card
              to={`${cardsBasePath}/timetable`}
              title={t('nav.timetable')}
              description={t('students.selfDashboard.cards.timetableDesc')}
              Icon={CalendarDays}
              tone="sky"
            />
            <Card
              to={`${cardsBasePath}/library`}
              title={t('nav.library')}
              description={t('students.selfDashboard.cards.libraryDesc')}
              Icon={BookOpenCheck}
              tone="amber"
            />
            <Card
              to={`${cardsBasePath}/profile`}
              title={t('nav.profile')}
              description={t('students.selfDashboard.cards.profileDesc')}
              Icon={Users}
              tone="sky"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
            <div className="font-semibold">{t('nav.attendance')}</div>
            <div className="text-xs text-white/80 mt-0.5">
              {currentLevelLabel ? `${currentLevelLabel} • ` : ''}{t('students.selfDashboard.attendance.overview')}
            </div>
          </div>
          <div className="p-5 h-full">
            <div className="h-full flex flex-col gap-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-base font-semibold text-(--nb-color-text)">{attendancePresentPct}% {t('students.attendance.status.present')}</div>
                {/* <div className="text-xs text-gray-500">Recorded entries only</div> */}
              </div>

              {/* <div className="text-xs text-gray-600">Present = attended class</div> */}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <SmallStat size="sm" label={t('students.attendance.status.present')} value={attendanceCounts.present} tone="emerald" />
                <SmallStat size="sm" label={t('students.attendance.status.late')} value={attendanceCounts.late} tone="amber" />
                <SmallStat size="sm" label={t('students.attendance.status.excused')} value={attendanceCounts.excused} tone="blue" />
                <SmallStat size="sm" label={t('students.attendance.status.absent')} value={attendanceCounts.absent} tone="red" />
                <SmallStat size="sm" label={t('students.attendance.status.other')} value={attendanceCounts.other} tone="gray" />
              </div>

              <div className="relative pt-10 mt-auto pb-20">
                {attendanceLoading ? (
                  <div className="h-24 w-full rounded bg-(--nb-color-bg)" />
                ) : (
                  <VerticalBarChart
                    height={96}
                    items={[
                      { label: t('students.attendance.status.present'), value: attendanceCounts.present, className: 'bg-(--nb-color-accent)' },
                      { label: t('students.attendance.status.late'), value: attendanceCounts.late, className: 'bg-amber-500' },
                      { label: t('students.attendance.status.excused'), value: attendanceCounts.excused, className: 'bg-(--nb-color-brand)' },
                      { label: t('students.attendance.status.absent'), value: attendanceCounts.absent, className: 'bg-red-500' },
                      { label: t('students.attendance.status.other'), value: attendanceCounts.other, className: 'bg-gray-500' },
                    ]}
                    onHover={(it) => {
                      const value = Number(it?.value || 0);
                      const total = attendanceTotal;
                      const pct = total > 0 ? (value / total) * 100 : 0;
                      setAttendanceHover({ label: it?.label || '', value, pct });
                    }}
                    onLeave={() => setAttendanceHover(null)}
                  />
                )}

                {attendanceHover ? (
                  <div className="absolute -top-9 left-0 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) px-3 py-1 shadow text-xs text-(--nb-color-text) whitespace-nowrap">
                    <span className="font-semibold text-(--nb-color-text)">{attendanceHover.label}:</span>{' '}
                    {attendanceHover.value} ({Number(attendanceHover.pct || 0).toFixed(1)}%)
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
            <div className="font-semibold">{t('students.selfDashboard.todayScheduleTitle')}</div>
            <div className="text-xs text-white/80 mt-0.5">{todaySchedule.dayName} • {todaySchedule.dateISO}</div>
          </div>
          <div className="p-5">
            {historyLoading || timetableLoading ? (
              <div className="space-y-2">
                <div className="h-10 rounded bg-(--nb-color-bg)" />
                <div className="h-10 rounded bg-(--nb-color-bg)" />
                <div className="h-10 rounded bg-(--nb-color-bg)" />
              </div>
            ) : (todaySchedule.slots.length === 0 ? (
              <div className="text-sm text-(--nb-color-muted)">{t('students.timetableTab.noClassesToday')}</div>
            ) : (
              <div className="space-y-2">
                {todaySchedule.slots.map((s) => {
                  const time = `${String(s?.startTime || '').trim()} - ${String(s?.endTime || '').trim()}`.trim();
                  const subject = String(s?.subject?.subjectName || '-').trim() || '-';
                  const teacher = String(s?.teacher?.fullName || '-').trim() || '-';
                  const room = s?.room ? `${t('common.room')} ${s.room}` : '';
                  const meta = [time, room].filter(Boolean).join(' • ');
                  const key = String(s?._id || `${s?.dayOfWeek}_${s?.startTime}_${s?.endTime}_${subject}`);
                  return (
                    <div key={key} className="border border-(--nb-color-border) rounded-lg p-3 bg-(--nb-color-bg-card) shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-(--nb-color-text) truncate">{subject}</div>
                          <div className="text-xs text-(--nb-color-muted) mt-0.5 truncate">{teacher}</div>
                        </div>
                        {meta ? <div className="text-xs text-(--nb-color-muted) whitespace-nowrap">{meta}</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {!timetableLoading && timetableCountsByDay.some(n => Number(n || 0) > 0) ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-(--nb-color-text) mb-2">{t('students.selfDashboard.timetable.classesPerDay')}</div>
                <MiniBars values={timetableCountsByDay} height={64} />
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-(--nb-color-muted)">
                  {dayLabels.map((d) => (
                    <span key={d} className="min-w-0 flex-1 text-center">{d}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-sm overflow-hidden xl:col-span-2">
          <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
            <div className="font-semibold">{t('nav.transcript')}</div>
            <div className="text-xs text-white/80 mt-0.5">{t('students.selfDashboard.transcript.subtitle')}</div>
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-(--nb-color-text)">{t('students.selfDashboard.transcript.avgByLevel')}</div>
                {lineHover ? (
                  <div className="text-xs text-(--nb-color-muted)">
                    <span className="font-semibold text-(--nb-color-text)">{lineHover.label}</span>: {Number(lineHover.value || 0).toFixed(1)}%
                  </div>
                ) : null}
              </div>
              <div className="mt-3">
                {transcriptLoading || levelsLoading ? (
                  <div className="h-36 rounded bg-(--nb-color-bg)" />
                ) : (levelLinePoints.length < 2 ? (
                  <div className="text-sm text-(--nb-color-muted)">{t('students.selfDashboard.transcript.notEnoughData')}</div>
                ) : (
                  <LineChart
                    points={levelLinePoints}
                    onHover={(p) => setLineHover({ label: p.label, value: p.value })}
                    onLeave={() => setLineHover(null)}
                  />
                ))}
              </div>
              {!transcriptLoading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <SmallStat label={t('students.transcriptTab.labels.overall')} value={Math.round(Number(overallSummary?.overallTotal || 0))} tone="gray" />
                  <SmallStat label={t('students.transcriptTab.labels.average')} value={`${Number(overallSummary?.weightedAverage || 0).toFixed(1)}%`} tone="blue" />
                  <SmallStat label={t('students.transcriptTab.labels.rank')} value={overallSummary?.cumulativeRank != null ? `${overallSummary.cumulativeRank}` : '-'} tone="amber" />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) p-4">
              <div className="text-sm font-semibold text-(--nb-color-text)">{t('students.selfDashboard.transcript.levelsDistribution')}</div>
              <div className="text-xs text-(--nb-color-muted) mt-0.5">{t('students.selfDashboard.transcript.levelsDistributionNote')}</div>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative">
                  {levelsLoading ? (
                    <div className="h-28 w-28 rounded-full bg-(--nb-color-bg)" />
                  ) : (
                    <PieChart
                      size={112}
                      segments={pieSegments}
                      onHover={(seg, total) => {
                        const value = Number(seg?.value || 0);
                        const pct = total > 0 ? (value / total) * 100 : 0;
                        setPieHover({ label: seg?.label || '', value, pct });
                      }}
                      onLeave={() => setPieHover(null)}
                    />
                  )}
                  {pieHover ? (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) px-3 py-1 shadow text-xs text-(--nb-color-text) whitespace-nowrap">
                      <span className="font-semibold text-(--nb-color-text)">{pieHover.label}</span>: {pieHover.value} ({Number(pieHover.pct || 0).toFixed(1)}%)
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {(pieSegments || []).slice(0, 6).map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${String(s.className).replace('fill-', 'bg-')}`} />
                        <span className="truncate text-(--nb-color-text)">{s.label}</span>
                      </div>
                      <span className="font-semibold text-(--nb-color-text)">{Number(s.value || 0).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
