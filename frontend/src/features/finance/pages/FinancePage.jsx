import React, { useState, useMemo } from 'react';
import { Banknote, ReceiptText, Wallet, Briefcase, LayoutDashboard } from 'lucide-react';

import { useI18n } from '../../../i18n/useI18n';

import FinanceDashboard from '../components/FinanceDashboard.jsx';
import AccountManagement from '../components/AccountManagement.jsx';
import StudentFees from '../components/StudentFees.jsx';
import PayrollManagement from '../components/PayrollManagement.jsx';
import ExpenseManagement from '../components/ExpenseManagement.jsx';
import { useFinanceRealtimeInvalidation } from '../useFinanceRealtimeInvalidation';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { t } = useI18n();

  // Realtime â†’ Events â†’ Invalidate Queries â†’ UI updated (Finance)
  useFinanceRealtimeInvalidation();

  const tabs = useMemo(() => ([
    {
      id: 'dashboard',
      label: t('finance.page.tabs.dashboard', { defaultValue: 'Dashboard' }),
      icon: LayoutDashboard,
      component: <FinanceDashboard />,
    },
    {
      id: 'accounts',
      label: t('finance.page.tabs.accounts', { defaultValue: 'Accounts' }),
      icon: Banknote,
      component: <AccountManagement />,
    },
    {
      id: 'student-finance',
      label: t('finance.page.tabs.studentFinance', { defaultValue: 'Student Finance' }),
      icon: ReceiptText,
      component: <StudentFees />,
    },
    {
      id: 'payroll',
      label: t('finance.page.tabs.payroll', { defaultValue: 'Payroll' }),
      icon: Wallet,
      component: <PayrollManagement />,
    },
    {
      id: 'expenses',
      label: t('finance.page.tabs.expenses', { defaultValue: 'Expenses' }),
      icon: Briefcase,
      component: <ExpenseManagement />,
    },
  ]), [t]);

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || <FinanceDashboard />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t('finance.page.title', { defaultValue: 'Finance Management' })}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('finance.page.subtitle', { defaultValue: 'Manage accounts, fees, payroll, and expenses.' })}
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 overflow-x-auto pb-px" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group flex items-center gap-2 py-3 px-5 border-b-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap
                  ${isActive 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {ActiveComponent}
      </div>
    </div>
  );
}
