// Centralized route permission requirements (canonical)

import { MODULE_PERMISSIONS } from './permissionContract.js';

export const permsAny = (module, actions) =>
	Array.isArray(actions) ? actions.map((action) => ({ module, action })) : [];

const actionsFor = (module) => (MODULE_PERMISSIONS[module] || []).filter((a) => a !== 'full');

export const studentsAny = permsAny('students', actionsFor('students'));
export const teachersAny = permsAny('teachers', actionsFor('teachers'));
export const subjectsAny = permsAny('subjects', actionsFor('subjects'));
export const gradesAny = permsAny('grades', actionsFor('grades'));
export const attendanceAny = permsAny('attendance', actionsFor('attendance'));
export const attendanceReportsAny = permsAny('attendanceReports', actionsFor('attendanceReports'));
export const timetableAny = permsAny('timetable', actionsFor('timetable'));
export const examsAny = permsAny('exams', actionsFor('exams'));
export const examsInputOnly = permsAny('exams', ['input']);
export const resultsAny = permsAny('results', actionsFor('results'));
export const promotionsAny = permsAny('promotions', actionsFor('promotions'));
export const cohortsAny = permsAny('cohorts', actionsFor('cohorts'));
export const transfersAny = permsAny('transfers', actionsFor('transfers'));
export const transcriptAny = permsAny('transcript', actionsFor('transcript'));
export const libraryAny = permsAny('library', actionsFor('library'));

// Finance
export const financeDashboardAny = permsAny('financeDashboard', actionsFor('financeDashboard'));
export const financeAccountsAny = permsAny('financeAccounts', actionsFor('financeAccounts'));
export const financeAccountsInstitutionAny = permsAny('financeAccountsInstitution', actionsFor('financeAccountsInstitution'));
export const financeAccountsOverviewAny = permsAny('financeAccountsOverview', actionsFor('financeAccountsOverview'));
export const financeAccountsLedgerAny = permsAny('financeAccountsLedger', actionsFor('financeAccountsLedger'));
export const financeStudentAny = permsAny('financeStudent', actionsFor('financeStudent'));
export const financeStudentReceiptAny = permsAny('financeStudentReceipt', actionsFor('financeStudentReceipt'));
export const financeStudentPreviousBalanceAny = permsAny('financeStudentPreviousBalance', actionsFor('financeStudentPreviousBalance'));
export const financeStudentAmountTypeAny = permsAny('financeStudentAmountType', actionsFor('financeStudentAmountType'));
export const financeStudentFeeTypeAny = permsAny('financeStudentFeeType', actionsFor('financeStudentFeeType'));

// Student Finance page should be accessible if the user has any Student Finance sub-tab permission
// or legacy financeStudent permission.
export const financeStudentFinanceAny = Object.freeze([
	...financeStudentAny,
	...financeStudentReceiptAny,
	...financeStudentPreviousBalanceAny,
	...financeStudentAmountTypeAny,
	...financeStudentFeeTypeAny,
]);

// Accounts page should be accessible if the user has any Accounts tab permission
// or legacy financeAccounts permission.
export const financeAccountsPageAny = Object.freeze([
	...financeAccountsAny,
	...financeAccountsInstitutionAny,
	...financeAccountsOverviewAny,
	...financeAccountsLedgerAny,
]);
export const financePayrollAny = permsAny('financePayroll', actionsFor('financePayroll'));
export const financeExpensesAny = permsAny('financeExpenses', actionsFor('financeExpenses'));
export const financeExpensesLedgerAny = permsAny('financeExpensesLedger', actionsFor('financeExpensesLedger'));
export const financeExpensesCategoriesAny = permsAny('financeExpensesCategories', actionsFor('financeExpensesCategories'));

// Expenses page should be accessible if the user has any Expenses tab permission
// or legacy financeExpenses permission.
export const financeExpensesPageAny = Object.freeze([
	...financeExpensesAny,
	...financeExpensesLedgerAny,
	...financeExpensesCategoriesAny,
]);
