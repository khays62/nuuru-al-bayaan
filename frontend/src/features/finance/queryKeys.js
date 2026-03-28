import { makeQueryKeys, qkStr } from '../../shared/queryKeys/makeQueryKeys';

const financeExpenses = makeQueryKeys('financeExpenses');
const financeAccounts = makeQueryKeys('financeAccounts');
const financeCategories = makeQueryKeys('financeCategories');
const financeFeeTypes = makeQueryKeys('financeFeeTypes');
const financePayroll = makeQueryKeys('financePayroll');
const financeStudentFinance = makeQueryKeys('financeStudentFinance');
const financeDashboard = makeQueryKeys('financeDashboard');

export const expenseKeys = {
  base: financeExpenses.base,
  listBase: financeExpenses.key('list'),
  list: ({ from, to } = {}) => financeExpenses.key('list', qkStr(from || ''), qkStr(to || '')),
};

export const accountKeys = {
  base: financeAccounts.base,
  listBase: financeAccounts.key('list'),
  list: ({ includeInactive } = {}) => financeAccounts.key('list', qkStr(includeInactive ? '1' : '0')),
};

export const accountTypeKeys = {
  base: financeAccounts.key('types'),
  listBase: financeAccounts.key('types', 'list'),
  list: ({ includeInactive } = {}) => financeAccounts.key('types', 'list', qkStr(includeInactive ? '1' : '0')),
};

export const categoryKeys = {
  base: financeCategories.base,
  listBase: financeCategories.key('list'),
  list: ({ type, includePreviousBalance, includeInactive } = {}) =>
    financeCategories.key(
      'list',
      qkStr(type || ''),
      qkStr(includePreviousBalance ? '1' : '0'),
      qkStr(includeInactive ? '1' : '0')
    ),
};

export const feeTypeKeys = {
  base: financeFeeTypes.base,
  listBase: financeFeeTypes.key('list'),
  list: ({ includeInactive } = {}) => financeFeeTypes.key('list', qkStr(includeInactive ? '1' : '0')),
};

export const payrollKeys = {
  base: financePayroll.base,
  listBase: financePayroll.key('list'),
  list: ({ month, academicYear } = {}) => financePayroll.key('list', qkStr(month || ''), qkStr(academicYear || '')),
  staffLedgerBase: financePayroll.key('staffLedger'),
  staffLedger: ({ month, academicYear, staffId } = {}) =>
    financePayroll.key('staffLedger', qkStr(month || ''), qkStr(academicYear || ''), qkStr(staffId || '')),
};

export const studentFinanceKeys = {
  base: financeStudentFinance.base,
  studentsSummaryBase: financeStudentFinance.key('studentsSummary'),
  studentsSummary: ({ search, classId, type } = {}) =>
    financeStudentFinance.key('studentsSummary', qkStr(search || ''), qkStr(classId || ''), qkStr(type || '')),

  previousBalanceSummaryBase: financeStudentFinance.key('previousBalanceSummary'),
  previousBalanceSummary: ({ search, classId, month } = {}) =>
    financeStudentFinance.key('previousBalanceSummary', qkStr(search || ''), qkStr(classId || ''), qkStr(month || '')),

  invoicesBase: financeStudentFinance.key('invoices'),
  invoices: ({ studentId, classId, search, limit, id } = {}) =>
    financeStudentFinance.key(
      'invoices',
      qkStr(studentId || ''),
      qkStr(classId || ''),
      qkStr(search || ''),
      qkStr(limit || ''),
      qkStr(id || '')
    ),

  monthHistoryBase: financeStudentFinance.key('monthHistory'),
  monthHistory: ({ studentId } = {}) => financeStudentFinance.key('monthHistory', qkStr(studentId || '')),
};

export const financeDashboardKeys = {
  base: financeDashboard.base,
  statsBase: financeDashboard.key('stats'),
  stats: () => financeDashboard.key('stats'),
};
