import React, { useEffect, useState } from 'react';
import Card from '../../../shared/components/ui/Card';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Activity, PieChart as PieIcon } from 'lucide-react';
import financeService from '../api/finance';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const StatWidget = ({ title, value, subtext, icon: Icon, trend }) => (
    <Card className="" noPadding>
        <div className="p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
                    {Icon ? React.createElement(Icon, { size: 20 }) : null}
                </div>
                {trend && (
                    <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend > 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
                <p className="text-xs text-slate-400 mt-1">{subtext}</p>
            </div>
        </div>
    </Card>
);

export default function FinanceDashboard() {
    const [stats, setStats] = useState({
        revenue: 0,
        expenses: 0,
        pendingFees: 0,
        monthlyStats: [],
        feeStatusDistribution: [],
        expenseDistribution: [],
        recentTransactions: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await financeService.getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load finance stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

    if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatWidget
                    title="Total Revenue"
                    value={formatCurrency(stats.revenue)}
                    subtext="Collected fees this year"
                    icon={DollarSign}
                    trend={12.5}
                />
                <StatWidget
                    title="Total Expenses"
                    value={formatCurrency(stats.expenses)}
                    subtext="Operational costs"
                    icon={TrendingDown}
                    trend={-2.4}
                />
                <StatWidget
                    title="Net Income"
                    value={formatCurrency(stats.revenue - stats.expenses)}
                    subtext="Revenue - Expenses"
                    icon={Wallet}
                    trend={15.3}
                />
                <StatWidget
                    title="Pending Fees"
                    value={formatCurrency(stats.pendingFees)}
                    subtext="Unpaid invoices"
                    icon={CreditCard}
                    trend={-5.0}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expense Area Chart */}
                <Card title="Income vs Expenses (6 Months)">
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={stats.monthlyStats}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#FFF', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" name="Expenses" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="grid grid-rows-2 gap-6">
                    {/* Fee Status Pie Chart */}
                    <Card title="Fee Collection Status">
                        <div className="flex items-center justify-center">
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <PieChart>
                                        <Pie
                                            data={stats.feeStatusDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.feeStatusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </Card>

                    {/* Expense Breakdown Bar Chart */}
                    <Card title="Expenses by Category">
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={stats.expenseDistribution} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Recent Transactions */}
            <Card title="Recent Transactions">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="py-3 px-4 text-sm font-semibold text-slate-500">Student</th>
                                <th className="py-3 px-4 text-sm font-semibold text-slate-500">Amount</th>
                                <th className="py-3 px-4 text-sm font-semibold text-slate-500">Method</th>
                                <th className="py-3 px-4 text-sm font-semibold text-slate-500">Date</th>
                                <th className="py-3 px-4 text-sm font-semibold text-slate-500">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentTransactions.map((tx) => (
                                <tr key={tx._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                                        {tx.student?.firstName} {tx.student?.lastName}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                                        {formatCurrency(tx.amount)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{tx.method}</td>
                                    <td className="py-3 px-4 text-sm text-slate-600">
                                        {new Date(tx.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            Completed
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {stats.recentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-sm text-slate-500">
                                        No recent transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
