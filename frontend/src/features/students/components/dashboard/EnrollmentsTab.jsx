import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import EmptyState from '../../../../shared/components/ui/EmptyState.jsx';
import StandardTable from '../../../../shared/components/table/StandardTable.jsx';
import { getStudentHistory } from '../../../../api';
import { useAuth } from '../../../../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { studentKeys } from '../../queryKeys';
import Card from '../../../../shared/components/ui/Card.jsx';
import Alert from '../../../../shared/components/ui/Alert.jsx';
import LoadingState from '../../../../shared/components/ui/LoadingState.jsx';
import { useI18n } from '../../../../i18n/I18nProvider';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

function statusClass(status) {
  const s = (status || '').toLowerCase();
  const map = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
    transferred: 'bg-sky-100 text-sky-700',
    promoted: 'bg-indigo-100 text-indigo-700',
    graduated: 'bg-amber-100 text-amber-800',
    withdrawn: 'bg-rose-100 text-rose-700',
  };
  return map[s] || 'bg-gray-100 text-gray-700';
}

export default function EnrollmentsTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth } = useAuth();
  const { t } = useI18n();

  const studentIdFromAuth = useMemo(() => {
    const ref = auth?.user?.studentRef;
    if (!ref) return null;
    if (typeof ref === 'object' && ref._id) return ref._id;
    return ref;
  }, [auth?.user?.studentRef]);

  const studentId = paramStudentId || (auth?.user?.role === 'student' ? (studentIdFromAuth || null) : null);
  const [sort, setSort] = useState({ key: 'joinedAt', dir: 'desc' });

  const historyQuery = useQuery({
    queryKey: studentKeys.history(studentId, { page: 1, limit: 1000 }),
    enabled: !!studentId,
    queryFn: async () => {
      const res = await getStudentHistory(studentId, { page: 1, limit: 1000 });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const items = useMemo(() => {
    const rows = Array.isArray(historyQuery.data) ? historyQuery.data : [];
    const key = String(sort?.key || 'joinedAt');
    const dir = String(sort?.dir || 'desc');
    const mult = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];
      // Date-ish comparisons
      const ad = av ? new Date(av).getTime() : 0;
      const bd = bv ? new Date(bv).getTime() : 0;
      if (!Number.isNaN(ad) && !Number.isNaN(bd) && (ad !== bd)) return (ad - bd) * mult;
      return String(av || '').localeCompare(String(bv || '')) * mult;
    });
  }, [historyQuery.data, sort]);

  const loading = historyQuery.isLoading;
  const error = historyQuery.isError ? t('students.enrollmentsTab.loadFailed') : null;

  return (
    <Card className="p-4">
      <h2 className="text-lg font-medium mb-2">{t('nav.enrollments')}</h2>
      {loading && (
        <div className="py-6">
          <LoadingState label={t('students.enrollmentsTab.loading')} className="border-0 bg-transparent p-0" />
        </div>
      )}
      {error && <Alert variant="danger" title={error} className="py-3" />}
      {!loading && !error && (
        items.length === 0 ? (
          <EmptyState title={t('students.enrollmentsTab.emptyTitle')} description={t('students.enrollmentsTab.emptyDescription')} />
        ) : (
          <StandardTable
            isLoading={false}
            items={items}
            rows={stableSort(items, getComparator(sort))}
            sortBy={sort.key}
            sortDir={sort.dir}
            onSort={(field) =>
              setSort((s) => {
                const key = String(field || 'joinedAt');
                const nextDir = (s.key === key && s.dir === 'asc') ? 'desc' : 'asc';
                return { key, dir: nextDir };
              })
            }
            columns={[
              { key: 'academicYear', label: t('students.table.columns.academicYear'), field: 'academicYear', sortable: true },
              { key: 'grade', label: t('students.table.columns.grade'), field: 'grade', sortable: true },
              { key: 'section', label: t('students.table.columns.section'), field: 'section', sortable: true },
              { key: 'shift', label: t('students.table.columns.shift'), field: 'shift', sortable: true },
              { key: 'cohort', label: t('students.form.cohort'), field: 'cohort', sortable: true },
              { key: 'status', label: t('students.table.columns.status'), field: 'status', sortable: true },
              { key: 'joinedAt', label: t('students.enrollmentsTab.columns.joined'), field: 'joinedAt', sortable: true },
              { key: 'leftAt', label: t('students.enrollmentsTab.columns.left'), field: 'leftAt', sortable: true },
              { key: 'sequenceInYear', label: t('students.enrollmentsTab.columns.sequence'), field: 'sequenceInYear', sortable: true },
            ].map((c) => ({
              ...c,
              thClassName: 'px-3 py-2 text-left text-sm font-medium text-gray-700',
              tdClassName: 'px-3 py-2 text-sm text-gray-700',
            }))}
            getRowKey={(e) => e._id}
            renderCell={(e, col) => {
              switch (col.key) {
                case 'academicYear':
                  return e.academicYear?.yearName || '-';
                case 'grade':
                  return e.grade?.gradeName || e.gradeSection?.grade?.gradeName || '-';
                case 'section':
                  return e.gradeSection?.section || '-';
                case 'shift':
                  return e.shift?.shiftName || '-';
                case 'cohort':
                  return e.cohort?.name || '-';
                case 'status':
                  return (
                    <span className={`px-2 py-0.5 rounded text-xs ${statusClass(e.status)}`}>
                      {e.status ? t(`students.enrollmentStatus.${String(e.status).toLowerCase()}`) : '-'}
                    </span>
                  );
                case 'joinedAt':
                  return formatDate(e.joinedAt);
                case 'leftAt':
                  return formatDate(e.leftAt);
                case 'sequenceInYear':
                  return e.sequenceInYear ?? '-';
                default:
                  return '';
              }
            }}
            tableProps={{
              theadClassName: 'bg-gray-50',
              headerRowClassName: 'border-b text-gray-700',
              useDefaultHeaderStyles: false,
              baseRowClassName: 'border-b last:border-0',
            }}
          />
        )
      )}
    </Card>
  );
}

function getComparator(sort) {
  const { key, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    let va, vb;
    switch (key) {
      case 'academicYear':
        va = a.academicYear?.yearName || '';
        vb = b.academicYear?.yearName || '';
        break;
      case 'grade':
        va = a.grade?.gradeName || a.gradeSection?.grade?.gradeName || '';
        vb = b.grade?.gradeName || b.gradeSection?.grade?.gradeName || '';
        break;
      case 'section':
        va = a.gradeSection?.section || '';
        vb = b.gradeSection?.section || '';
        break;
      case 'shift':
        va = a.shift?.shiftName || '';
        vb = b.shift?.shiftName || '';
        break;
      case 'cohort':
        va = a.cohort?.name || '';
        vb = b.cohort?.name || '';
        break;
      case 'status':
        va = a.status || '';
        vb = b.status || '';
        break;
      case 'joinedAt':
        va = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        vb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        break;
      case 'leftAt':
        va = a.leftAt ? new Date(a.leftAt).getTime() : 0;
        vb = b.leftAt ? new Date(b.leftAt).getTime() : 0;
        break;
      case 'sequenceInYear':
        va = a.sequenceInYear ?? 0;
        vb = b.sequenceInYear ?? 0;
        break;
      default:
        va = 0; vb = 0;
    }
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  };
}

function stableSort(array, comparator) {
  return array
    .map((el, idx) => [el, idx])
    .sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    })
    .map(pair => pair[0]);
}
