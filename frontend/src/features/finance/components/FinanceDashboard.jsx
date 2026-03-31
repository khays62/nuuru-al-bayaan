import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../../../shared/components/ui/Card';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Activity, PieChart as PieIcon } from 'lucide-react';
import financeService from '../api/finance';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import { useI18n } from '../../../i18n/useI18n';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

import { financeDashboardKeys } from '../queryKeys';

const SkeletonBlock = ({ className = '' }) => (
    <div className={`animate-pulse rounded-lg bg-(--nb-color-border) ${className}`} />
);

const useMeasuredBox = () => {
    const ref = React.useRef(null);
    const [size, setSize] = React.useState({ width: 0, height: 0 });

    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const update = () => {
            const rect = el.getBoundingClientRect();
            setSize({ width: Math.max(0, Math.floor(rect.width)), height: Math.max(0, Math.floor(rect.height)) });
        };

        update();
        const ro = new ResizeObserver(() => update());
        ro.observe(el);

        return () => {
            ro.disconnect();
        };
    }, []);

    return { ref, size };
};

const ChartSlot = ({ heightClass, children }) => {
    const { ref, size } = useMeasuredBox();
    const ready = size.width > 0 && size.height > 0;
    return (
        <div ref={ref} className={`${heightClass} w-full min-w-0`}>
            {ready ? children(size) : <SkeletonBlock className="h-full w-full" />}
        </div>
    );
};

const FinanceDashboardSkeleton = () => (
    <div className="space-y-4">
        <div className="rounded-xl border border-(--nb-color-border) border-b-4 border-b-(--nb-color-accent) bg-(--nb-color-bg-card) p-5 shadow-md">
            <SkeletonBlock className="h-6 w-56" />
            <SkeletonBlock className="h-4 w-80 mt-2" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-2xl shadow-md overflow-hidden border-b-4 border-b-(--nb-color-accent)">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <SkeletonBlock className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg" />
                            <SkeletonBlock className="h-5 w-16 rounded-full" />
                        </div>
                        <SkeletonBlock className="h-4 w-28" />
                        <SkeletonBlock className="h-7 w-24 mt-2" />
                        <SkeletonBlock className="h-3 w-32 mt-2" />
                    </div>
                </Card>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl shadow-md overflow-hidden">
                <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-(--nb-color-brand)">
                    <SkeletonBlock className="h-4 w-40 bg-white/25" />
                    <SkeletonBlock className="h-3 w-56 mt-2 bg-white/20" />
                </div>
                <div className="p-5">
                    <SkeletonBlock className="h-80 w-full" />
                </div>
            </Card>

            <div className="grid grid-rows-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="rounded-2xl shadow-md overflow-hidden">
                        <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-(--nb-color-brand)">
                            <SkeletonBlock className="h-4 w-44 bg-white/25" />
                            <SkeletonBlock className="h-3 w-60 mt-2 bg-white/20" />
                        </div>
                        <div className="p-5">
                            <SkeletonBlock className="h-48 w-full" />
                        </div>
                    </Card>
                ))}
            </div>
        </div>

        <Card className="rounded-2xl shadow-md overflow-hidden">
            <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-(--nb-color-brand)">
                <SkeletonBlock className="h-4 w-40 bg-white/25" />
                <SkeletonBlock className="h-3 w-56 mt-2 bg-white/20" />
            </div>
            <div className="p-5 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <SkeletonBlock className="h-3 w-28" />
                        <SkeletonBlock className="h-3 flex-1" />
                        <SkeletonBlock className="h-3 w-20" />
                    </div>
                ))}
            </div>
        </Card>
    </div>
);

const SectionCard = ({ title, subtitle, children, right }) => (
    <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-(--nb-color-brand) flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <div className="text-base font-semibold">{title}</div>
                {subtitle ? <div className="text-sm text-white/80 mt-1">{subtitle}</div> : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
        </div>
        <div className="p-5">{children}</div>
    </Card>
);

const StatWidget = ({ title, value, subtext, icon: Icon, trend }) => (
    <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border-b-4 border-b-(--nb-color-accent)" noPadding>
        <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 rounded-lg bg-(--nb-color-accent-50) text-(--nb-color-brand-ui) border border-(--nb-color-accent-100)">
                    {Icon ? React.createElement(Icon, { className: 'w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]' }) : null}
                </div>
                {typeof trend === 'number' ? (
                    <span
                        className={
                            `flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ` +
                            (trend > 0
                                ? 'bg-(--nb-color-accent-50) text-(--nb-color-brand-ui) border-(--nb-color-accent-100)'
                                : 'bg-(--nb-color-brand-50) text-(--nb-color-brand-ui) border-(--nb-color-brand-100)')
                        }
                    >
                        {trend > 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                        {Math.abs(trend)}%
                    </span>
                ) : null}
            </div>
            <div>
                <p className="text-xs sm:text-sm font-medium text-(--nb-color-muted)">{title}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-(--nb-color-text) mt-1">{value}</h3>
                <p className="text-[11px] sm:text-xs text-(--nb-color-muted) mt-1">{subtext}</p>
            </div>
        </div>
    </Card>
);

export default function FinanceDashboard() {
    const { t, lang } = useI18n();
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const emptyStats = {
        revenue: 0,
        expenses: 0,
        pendingFees: 0,
        monthlyStats: [],
        feeStatusDistribution: [],
        expenseDistribution: [],
        recentTransactions: []
    };

    const statsQuery = useQuery({
        queryKey: financeDashboardKeys.stats(),
        queryFn: async () => {
            const data = await financeService.getStats();
            return data || emptyStats;
        },
        staleTime: 30_000,
    });

    const stats = statsQuery.data || emptyStats;

    const formatCurrency = (amount) => {
        const locale = lang === 'ar' ? 'ar' : (lang === 'so' ? 'so' : 'en-US');
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(amount);
    };

    const tFeeStatus = (name) => {
        const raw = String(name || '').trim();
        const key = raw.toLowerCase();
        if (!key) return raw;
        const mapped = {
            paid: t('finance.dashboard.feeStatus.paid', { defaultValue: 'Paid' }),
            partial: t('finance.dashboard.feeStatus.partial', { defaultValue: 'Partial' }),
            unpaid: t('finance.dashboard.feeStatus.unpaid', { defaultValue: 'Unpaid' }),
            cancelled: t('finance.dashboard.feeStatus.cancelled', { defaultValue: 'Cancelled' }),
        };
        return mapped[key] || raw;
    };

    const COLORS = [
        'var(--nb-color-accent)',
        'var(--nb-color-brand)',
        'var(--nb-color-accent-300)',
        'var(--nb-color-brand-200)',
    ];

    if (statsQuery.isLoading) return <div dir={dir}><FinanceDashboardSkeleton /></div>;

    if (statsQuery.isError) {
        return (
            <div dir={dir}>
                <Alert
                    variant="error"
                    title={t('finance.dashboard.errors.loadFailedTitle', { defaultValue: 'Failed to load dashboard' })}
                    description={t('finance.dashboard.errors.loadFailedDesc', { defaultValue: 'Please refresh the page or try again in a moment.' })}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4" dir={dir}>
            <div className="rounded-xl border border-(--nb-color-border) border-b-4 border-b-(--nb-color-accent) bg-linear-to-r from-(--nb-color-bg-card) to-(--nb-color-accent-50) p-5 shadow-md">
                <div className="text-xl md:text-2xl font-semibold text-(--nb-color-text)">{t('finance.dashboard.header.title', { defaultValue: 'Finance Dashboard' })}</div>
                <div className="text-sm text-(--nb-color-muted) mt-1">{t('finance.dashboard.header.subtitle', { defaultValue: 'Overview of revenue, expenses, and fee status.' })}</div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatWidget
                    title={t('finance.dashboard.cards.totalRevenue', { defaultValue: 'Total Revenue' })}
                    value={formatCurrency(stats.revenue)}
                    subtext={t('finance.dashboard.cardsSubtext.collectedFeesThisYear', { defaultValue: 'Collected fees this year' })}
                    icon={DollarSign}
                    trend={12.5}
                />
                <StatWidget
                    title={t('finance.dashboard.cards.totalExpenses', { defaultValue: 'Total Expenses' })}
                    value={formatCurrency(stats.expenses)}
                    subtext={t('finance.dashboard.cardsSubtext.operationalCosts', { defaultValue: 'Operational costs' })}
                    icon={TrendingDown}
                    trend={-2.4}
                />
                <StatWidget
                    title={t('finance.dashboard.cards.netIncome', { defaultValue: 'Net Income' })}
                    value={formatCurrency(stats.revenue - stats.expenses)}
                    subtext={t('finance.dashboard.cardsSubtext.revenueMinusExpenses', { defaultValue: 'Revenue - Expenses' })}
                    icon={Wallet}
                    trend={15.3}
                />
                <StatWidget
                    title={t('finance.dashboard.cards.pendingFees', { defaultValue: 'Pending Fees' })}
                    value={formatCurrency(stats.pendingFees)}
                    subtext={t('finance.dashboard.cardsSubtext.unpaidInvoices', { defaultValue: 'Unpaid invoices' })}
                    icon={CreditCard}
                    trend={-5.0}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expense Area Chart */}
                <SectionCard
                    title={t('finance.dashboard.charts.incomeVsExpenses.title', { defaultValue: 'Income vs Expenses' })}
                    subtitle={t('finance.dashboard.charts.incomeVsExpenses.subtitle', { defaultValue: 'Monthly trend for the last 6 months' })}
                >
                    <ChartSlot heightClass="h-80">
                        {({ width, height }) => (
                            <AreaChart width={width} height={height} data={stats.monthlyStats}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--nb-color-accent)" stopOpacity={0.14} />
                                            <stop offset="95%" stopColor="var(--nb-color-accent)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--nb-color-brand)" stopOpacity={0.14} />
                                            <stop offset="95%" stopColor="var(--nb-color-brand)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nb-color-border)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--nb-color-muted)', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--nb-color-muted)', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--nb-color-bg-card)', borderRadius: '8px', border: 'none', boxShadow: 'var(--nb-shadow-sm)' }}
                                        labelStyle={{ fontWeight: 'bold', color: 'var(--nb-color-fg)' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="income" name={t('finance.dashboard.legends.income', { defaultValue: 'Income' })} stroke="var(--nb-color-accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                    <Area type="monotone" dataKey="expense" name={t('finance.dashboard.legends.expenses', { defaultValue: 'Expenses' })} stroke="var(--nb-color-brand)" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        )}
                    </ChartSlot>
                </SectionCard>

                <div className="grid grid-rows-2 gap-6">
                    {/* Fee Status Pie Chart */}
                    <SectionCard
                        title={t('finance.dashboard.charts.feeCollectionStatus.title', { defaultValue: 'Fee Collection Status' })}
                        subtitle={t('finance.dashboard.charts.feeCollectionStatus.subtitle', { defaultValue: 'Paid vs pending invoice distribution' })}
                    >
                        <ChartSlot heightClass="h-48">
                            {({ width, height }) => (
                                <PieChart width={width} height={height}>
                                            <Pie
                                                data={(stats.feeStatusDistribution || []).map((e) => ({
                                                    ...e,
                                                    name: tFeeStatus(e?.name),
                                                }))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                fill="var(--nb-color-accent)"
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {(stats.feeStatusDistribution || []).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--nb-color-bg-card)', borderRadius: '8px', border: 'none', boxShadow: 'var(--nb-shadow-sm)' }}
                                                labelStyle={{ fontWeight: 'bold', color: 'var(--nb-color-fg)' }}
                                            />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" />
                                </PieChart>
                            )}
                        </ChartSlot>
                    </SectionCard>

                    {/* Expense Breakdown Bar Chart */}
                    <SectionCard
                        title={t('finance.dashboard.charts.expensesByCategory.title', { defaultValue: 'Expenses by Category' })}
                        subtitle={t('finance.dashboard.charts.expensesByCategory.subtitle', { defaultValue: 'Top expense categories (current period)' })}
                    >
                        <ChartSlot heightClass="h-48">
                            {({ width, height }) => (
                                <BarChart width={width} height={height} data={stats.expenseDistribution} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--nb-color-border)" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'var(--nb-color-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" fill="var(--nb-color-brand)" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            )}
                        </ChartSlot>
                    </SectionCard>
                </div>
            </div>

            {/* Recent Transactions */}
            <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-(--nb-color-brand)">
                    <div className="text-base font-semibold">{t('finance.dashboard.recent.title', { defaultValue: 'Recent Transactions' })}</div>
                    <div className="text-sm text-white/80 mt-1">{t('finance.dashboard.recent.subtitle', { defaultValue: 'Latest recorded fee payments and activity' })}</div>
                </div>
                <div className="p-5">
                    <StandardTable
                        isLoading={false}
                        items={stats.recentTransactions}
                        rows={stats.recentTransactions}
                        columns={[
                            { key: 'student', label: t('finance.dashboard.recent.columns.student', { defaultValue: 'Student' }) },
                            { key: 'amount', label: t('finance.dashboard.recent.columns.amount', { defaultValue: 'Amount' }) },
                            { key: 'method', label: t('finance.dashboard.recent.columns.method', { defaultValue: 'Method' }) },
                            { key: 'date', label: t('finance.dashboard.recent.columns.date', { defaultValue: 'Date' }) },
                            { key: 'status', label: t('finance.dashboard.recent.columns.status', { defaultValue: 'Status' }) },
                        ]}
                        storageKey="finance:dashboard:recent-transactions"
                        getRowKey={(row) => row?._id}
                        emptyTitle={t('finance.dashboard.recent.empty', { defaultValue: 'No recent transactions found.' })}
                        tableProps={{
                            shellClassName: 'ring-0 shadow-none rounded-none',
                        }}
                        renderCell={(row, col) => {
                            switch (col.key) {
                                case 'student':
                                    return `${row?.student?.firstName || ''} ${row?.student?.lastName || ''}`.trim() || '-';
                                case 'amount':
                                    return formatCurrency(row?.amount || 0);
                                case 'method':
                                    return row?.method || '-';
                                case 'date':
                                    return row?.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-';
                                case 'status':
                                    return (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-(--nb-color-accent-50) text-(--nb-color-brand-ui) border border-(--nb-color-accent-100)">
                                            {t('finance.dashboard.recent.status.completed', { defaultValue: 'Completed' })}
                                        </span>
                                    );
                                default:
                                    return '-';
                            }
                        }}
                    />
                </div>
            </Card>
        </div>
    );
}
