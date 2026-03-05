import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Card from '../../../../shared/components/ui/Card.jsx';
import StandardTable from '../../../../shared/components/table/StandardTable.jsx';

import PrintHeader from '../../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../../shared/components/print/PrintFooter.jsx';

import { useAuth } from '../../../../auth/AuthContext';
import { useI18n } from '../../../../i18n/useI18n';

import { studentKeys } from '../../queryKeys';
import { getStudentFinanceMonthHistory } from '../../api/studentFinance';

function fmtMoney(n) {
  const v = Number(n || 0);
  try {
    return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `$${v.toFixed(2)}`;
  }
}

function classLabel(c) {
  if (!c) return '-';
  if (typeof c === 'string') return c;
  const section = c?.section;
  if (section) return String(section);
  return '-';
}

function ayLabel(y) {
  if (!y) return '-';
  if (typeof y === 'string') return y;
  return String(y?.yearName || '-');
}

export default function FinanceTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth } = useAuth();
  const { t } = useI18n();

  const rawStudentRef = auth?.user?.studentRef;
  const studentRefId = rawStudentRef?._id || rawStudentRef || null;
  const studentId = paramStudentId || (auth?.user?.role === 'student' ? studentRefId : null);

  const historyQuery = useQuery({
    queryKey: studentKeys.financeMonthHistory(studentId, { academicYearId: '' }),
    enabled: !!studentId,
    queryFn: async ({ signal }) => {
      return await getStudentFinanceMonthHistory(studentId, {}, { signal });
    },
    staleTime: 30_000,
  });

  const rows = Array.isArray(historyQuery.data?.rows) ? historyQuery.data.rows : [];

  const totals = useMemo(() => {
    let billed = 0;
    let paid = 0;
    let discount = 0;
    let balance = 0;
    for (const r of rows) {
      billed += Number(r?.amount || 0);
      paid += Number(r?.paid || 0);
      discount += Number(r?.discount || 0);
      balance += Number(r?.balance || 0);
    }
    return {
      billed,
      paid,
      discount,
      balance,
    };
  }, [rows]);

  const kpiBalanceClass = useMemo(() => {
    const balance = Number(totals.balance || 0);
    const billed = Number(totals.billed || 0);
    if (billed === 0) return 'text-(--nb-color-muted)';
    if (balance <= 0) return 'text-green-600';
    return 'text-red-600';
  }, [totals.balance, totals.billed]);

  const historyRows = useMemo(() => {
    return rows.map((r, idx) => {
      const billed = Number(r?.amount || 0);
      const paid = Number(r?.paid || 0);
      const discount = Number(r?.discount || 0);
      const balance = Number(r?.balance || 0);

      // In the modal table, Dr (Fees) is the gross fee. Here we only have month-bucketed totals,
      // so we approximate gross as amount + discount (discounts reduce the amount charged).
      const gross = billed + discount;

      return {
        id: r?.id || `${r?.month || ''}_${ayLabel(r?.academicYear)}_${classLabel(r?.class)}`,
        no: idx + 1,
        month: r?.month || '-',
        description: String(r?.description || r?.amountType || '-'),
        dr: gross,
        cr: paid,
        balance,
        raw: r,
      };
    });
  }, [rows]);

  const historyColumns = useMemo(() => ([
    { key: 'no', label: t('finance.studentFinance.paymentModal.columns.no', { defaultValue: 'No' }) },
    { key: 'month', label: t('finance.studentFinance.paymentModal.columns.month', { defaultValue: 'Month' }) },
    { key: 'description', label: t('finance.studentFinance.paymentModal.columns.description', { defaultValue: 'Description' }) },
    { key: 'dr', label: t('finance.studentFinance.paymentModal.columns.drFees', { defaultValue: 'Dr (Fees)' }), align: 'right' },
    { key: 'cr', label: t('finance.studentFinance.paymentModal.columns.crPaid', { defaultValue: 'Cr (Paid)' }), align: 'right' },
    { key: 'balance', label: t('finance.studentFinance.paymentModal.columns.balance', { defaultValue: 'Balance' }), align: 'right' },
  ]), [t]);

  return (
    <Card className="p-4 with-print-header with-print-footer">
      <PrintHeader />

      <div className="mb-4">
        <div className="border-l-4 border-(--nb-color-brand) bg-(--nb-color-brand-50) rounded px-3 py-2">
          <h2 className="text-lg font-semibold text-(--nb-color-fg)">{t('nav.finance')}</h2>
          <div className="text-xs text-(--nb-color-muted) mt-0.5">
            {t('finance.viewer.subtitle', { defaultValue: 'Monthly fees, payments, and outstanding balance' })}
          </div>
        </div>
      </div>

      {!historyQuery.isLoading && !historyQuery.isError ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) p-3">
            <div className="text-xs text-(--nb-color-muted)">{t('finance.viewer.stats.totalBilled', { defaultValue: 'Total billed' })}</div>
            <div className="text-base font-semibold text-(--nb-color-text) tabular-nums">{fmtMoney(totals.billed)}</div>
          </div>
          <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) p-3">
            <div className="text-xs text-(--nb-color-muted)">{t('finance.viewer.stats.totalPaid', { defaultValue: 'Total paid' })}</div>
            <div className="text-base font-semibold text-green-600 tabular-nums">{fmtMoney(totals.paid)}</div>
          </div>
          <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) p-3">
            <div className="text-xs text-(--nb-color-muted)">{t('finance.viewer.stats.totalDiscount', { defaultValue: 'Total discount' })}</div>
            <div className="text-base font-semibold text-(--nb-color-text) tabular-nums">{fmtMoney(totals.discount)}</div>
          </div>
          <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) p-3">
            <div className="text-xs text-(--nb-color-muted)">{t('finance.viewer.stats.outstanding', { defaultValue: 'Outstanding balance' })}</div>
            <div className={`text-base font-semibold tabular-nums ${kpiBalanceClass}`}>{fmtMoney(totals.balance)}</div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto border border-(--nb-color-border) rounded-xl">
        <StandardTable
          isLoading={historyQuery.isLoading}
          error={historyQuery.error}
          items={historyRows}
          rows={historyRows}
          columns={historyColumns}
          storageKey="studentFinance:history"
          emptyTitle={t('finance.viewer.empty', { defaultValue: 'No finance history yet.' })}
          tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
          renderCell={(row, col) => {
            switch (col.key) {
              case 'no':
                return <span className="text-xs font-mono text-(--nb-color-muted)">{String(row.no).padStart(2, '0')}</span>;
              case 'month':
                return (
                  <span className="bg-(--nb-color-bg) text-(--nb-color-fg) px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                    {row.month}
                  </span>
                );
              case 'description':
                return <span className="text-sm font-bold text-(--nb-color-fg)">{row.description}</span>;
              case 'dr':
                return <span className="font-mono">{fmtMoney(row.dr)}</span>;
              case 'cr':
                return <span className="font-mono text-green-600">{fmtMoney(row.cr)}</span>;
              case 'balance': {
                const bal = Number(row.balance || 0);
                const cls = bal <= 0 ? 'text-green-600' : 'text-red-600';
                return <span className={`font-mono ${cls}`}>{fmtMoney(bal)}</span>;
              }
              default:
                return row?.[col.key] ?? '';
            }
          }}
        />
      </div>

      <PrintFooter />
    </Card>
  );
}
