import express from 'express';

import {
  getFinanceStats,
  createInvoice,
  createBulkInvoice,
  recordPayment,
  getInvoices,
  createExpense,
  getExpenses,
  generatePayroll,
  generateSinglePayroll,
  updatePayrollStatus,
  adjustPayroll,
  getPayrolls,
  getPayrollStaffLedger,
  updatePayrollByParams,
  updatePayrollLedger,
  checkClearance,
  getDefaulters,
  updateInvoice,
  deleteInvoice,
  deletePayroll,
} from '../controllers/financeControl/financeController.js';

import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createFeeType,
  getFeeTypes,
  updateFeeType,
  deleteFeeType,
  canDeleteFeeType,
  createAccount,
  getAccounts,
  updateAccount,
  deleteAccount,
  transferFunds,
  recordIncome,
} from '../controllers/financeControl/financeConfigController.js';

import {
  createDonor,
  getDonors,
  createDonation,
  getDonations,
} from '../controllers/financeControl/foundationController.js';

import {
  printMonthlyInvoices,
  printDailyInvoices,
  getReceiptPrintPayload,
  getPaymentGroupReceiptPayload,
  getPassCardsByClass,
} from '../controllers/financeControl/financePrintingController.js';

import {
  listReceiptStudents,
  getStudentReceiptLedger,
  getFinanceStudentsSummary,
  getPreviousBalanceSummary,
} from '../controllers/financeControl/studentReceiptController.js';

import {
  listChargedMonthSummary,
  payChargedMonth,
  paySelectedMonths,
  getStudentMonthHistory,
  discountChargedMonth,
  editPaymentGroup,
  revertPaymentGroup,
} from '../controllers/financeControl/studentFinanceShowController.js';

import {
  chargeStudentFees,
  applyMonthlyDiscount,
  deleteMonthlyCharges,
  applyBulkDiscount,
  recordCorrection,
  updateChargeAmount,
  applyOverallDiscount,
} from '../controllers/financeControl/studentChargeController.js';

import { editPaymentTransaction } from '../controllers/financeControl/paymentEditController.js';

import {
  chargePayroll,
  payrollFullPayment,
  deletePayrollCharges,
  deletePaidPayrolls,
} from '../controllers/financeControl/payrollWorkflowController.js';

import { printPayrollList } from '../controllers/financeControl/payrollPrintingController.js';

import {
  getExpenseLedger,
  getExpenseChargesByDate,
  updateExpenseCharge,
  deleteExpenseCharge,
} from '../controllers/financeControl/expenseWorkflowController.js';

import {
  getExpenseBudgetReport,
  getOverBudgetExpenses,
} from '../controllers/financeControl/expenseBudgetController.js';

import {
  createAppointment,
  listAppointments,
  getTodayAppointments,
  getMissedAppointments,
  getCompletedAppointments,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  startAppointmentPayment,
  getAppointmentSlip,
} from '../controllers/financeControl/financeAppointmentController.js';

import { getAuditLogs } from '../controllers/financeControl/auditController.js';
import { backfillInvoiceBillingMonth } from '../controllers/financeControl/financeMaintenanceController.js';

import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

// --- CONFIGURATION (Admin) ---
router.post('/config/categories', protect, authorizeRoles('admin', 'staff'), checkPermission('financeConfig', 'add'), createCategory);
router.get('/config/categories', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeConfig'), getCategories);
router.put('/config/categories/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeConfig', 'edit'), updateCategory);
router.delete('/config/categories/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeConfig', 'delete'), deleteCategory);

router.post('/config/fee-types', protect, authorizeRoles('admin', 'staff'), checkPermission('financeConfig', 'add'), createFeeType);
router.get('/config/fee-types', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeConfig'), getFeeTypes);
router.put('/config/fee-types/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeConfig', 'edit'), updateFeeType);
router.get('/config/fee-types/:id/can-delete', protect, authorizeRoles('admin', 'staff'), checkPermission('financeConfig', 'view'), canDeleteFeeType);
router.delete('/config/fee-types/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeConfig', 'delete'), deleteFeeType);

// --- ACCOUNTS (General Ledger) ---
router.post('/accounts', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccounts', 'add'), createAccount);
router.get('/accounts', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeAccounts'), getAccounts);
router.put('/accounts/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccounts', 'edit'), updateAccount);
router.delete('/accounts/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccounts', 'delete'), deleteAccount);
router.post('/accounts/transfer', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccounts', 'transfer'), transferFunds);
router.post('/accounts/income', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccounts', 'income'), recordIncome);

// --- FOUNDATION (Donations) ---
router.post('/foundation/donors', protect, authorizeRoles('admin', 'staff'), checkPermission('financeFoundation', 'add'), createDonor);
router.get('/foundation/donors', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeFoundation'), getDonors);
router.post('/foundation/donations', protect, authorizeRoles('admin', 'staff'), checkPermission('financeFoundation', 'add'), createDonation);
router.get('/foundation/donations', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeFoundation'), getDonations);

// Dashboard Stats
router.get('/stats', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeDashboard'), getFinanceStats);

// Finance Audit Logs (Student Finance Edit)
router.get('/audit', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeAudit'), getAuditLogs);

// Maintenance (Admin)
router.post('/maintenance/backfill-billing-month', protect, authorizeRoles('admin', 'staff'), checkPermission('financeMaintenance', 'run'), backfillInvoiceBillingMonth);

// Fee Management
router.get('/invoices', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudent'), getInvoices);
router.post('/invoices', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'add'), createInvoice);
router.post('/invoices/bulk', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'add'), createBulkInvoice);
router.put('/invoices/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), updateInvoice);
router.delete('/invoices/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'delete'), deleteInvoice);
router.post('/payments', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'add'), recordPayment);
router.put('/payments/:transactionId', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), editPaymentTransaction);
router.get('/defaulters', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'view'), getDefaulters);
router.get('/clearance/:studentId', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'view'), checkClearance);

// Student Finance - Receipt workflows
router.get('/receipt/students', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudent'), listReceiptStudents);
router.get('/receipt/ledger', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudent'), getStudentReceiptLedger);
router.post('/receipt/payment-group/revert', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), revertPaymentGroup);

// Student Finance - Students summary (Receipt tab search)
router.get('/students/summary', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudent'), getFinanceStudentsSummary);

// Student Finance - Previous Balance summary (Previous Balance tab)
router.get('/previous-balance/summary', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudent'), getPreviousBalanceSummary);

// Student Finance - Show/Pay/History
router.get('/receipt/show', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudent'), listChargedMonthSummary);
router.post('/receipt/pay', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'add'), payChargedMonth);
router.post('/receipt/pay-selected-months', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'add'), paySelectedMonths);
router.get('/receipt/history', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudent'), getStudentMonthHistory);
router.post('/receipt/discount', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), discountChargedMonth);
router.post('/receipt/payment-group/edit', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), editPaymentGroup);

// Student Finance - Charge / Update / Delete
router.post('/fees/charge', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'add'), chargeStudentFees);
router.post('/fees/discount', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), applyMonthlyDiscount);
router.post('/fees/bulk-discount', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), applyBulkDiscount);
router.post('/fees/correction', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), recordCorrection);
router.post('/fees/update', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), updateChargeAmount);
router.post('/fees/overall-discount', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'edit'), applyOverallDiscount);
router.delete('/fees/charges', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudent', 'delete'), deleteMonthlyCharges);

// Printing
router.get('/print/monthly-invoices', protect, authorizeRoles('admin', 'staff'), checkPermission('financePrint', 'print'), printMonthlyInvoices);
router.get('/print/daily-invoices', protect, authorizeRoles('admin', 'staff'), checkPermission('financePrint', 'print'), printDailyInvoices);
router.get('/print/receipt/:transactionId', protect, authorizeRoles('admin', 'staff'), checkPermission('financePrint', 'print'), getReceiptPrintPayload);
router.get('/print/payment-group/:paymentGroupId', protect, authorizeRoles('admin', 'staff'), checkPermission('financePrint', 'print'), getPaymentGroupReceiptPayload);
router.get('/print/passcards', protect, authorizeRoles('admin', 'staff'), checkPermission('financePrint', 'print'), getPassCardsByClass);

// Finance Appointments
router.post('/appointments', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAppointments', 'add'), createAppointment);
router.get('/appointments', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeAppointments'), listAppointments);
router.get('/appointments/today', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeAppointments'), getTodayAppointments);
router.get('/appointments/missed', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeAppointments'), getMissedAppointments);
router.get('/appointments/completed', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeAppointments'), getCompletedAppointments);
router.patch('/appointments/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAppointments', 'edit'), updateAppointment);
router.post('/appointments/:id/cancel', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAppointments', 'edit'), cancelAppointment);
router.post('/appointments/:id/reschedule', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAppointments', 'edit'), rescheduleAppointment);
router.post('/appointments/:id/start-payment', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAppointments', 'edit'), startAppointmentPayment);
router.get('/appointments/:id/print', protect, authorizeRoles('admin', 'staff'), checkPermission('financePrint', 'print'), getAppointmentSlip);

// Expense Management
router.get('/expenses', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpenses'), getExpenses);
router.post('/expenses', protect, authorizeRoles('admin', 'staff'), checkPermission('financeExpenses', 'add'), createExpense);
router.get('/expenses/ledger', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpenses'), getExpenseLedger);
router.get('/expenses/range', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpenses'), getExpenseChargesByDate);
router.put('/expenses/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeExpenses', 'edit'), updateExpenseCharge);
router.delete('/expenses/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeExpenses', 'delete'), deleteExpenseCharge);
router.get('/expenses/budget/report', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpenses'), getExpenseBudgetReport);
router.get('/expenses/budget/over', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpenses'), getOverBudgetExpenses);

// Payroll Management
router.get('/payroll', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financePayroll'), getPayrolls);
router.get('/payroll/staff-ledger', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financePayroll'), getPayrollStaffLedger);
router.post('/payroll/generate', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'add'), generatePayroll);
router.post('/payroll/generate-single', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'add'), generateSinglePayroll);
router.post('/payroll/update-by-params', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'edit'), updatePayrollByParams);
router.put('/payroll/:id/status', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'edit'), updatePayrollStatus);
router.put('/payroll/:id/adjust', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'edit'), adjustPayroll);
router.patch('/payroll/:id/ledger', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'edit'), updatePayrollLedger);

// Payroll Workflows
router.post('/payroll/charge', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'add'), chargePayroll);
router.post('/payroll/full-payment', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'add'), payrollFullPayment);
router.delete('/payroll/charges', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'delete'), deletePayrollCharges);
router.delete('/payroll/paid', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'delete'), deletePaidPayrolls);

// IMPORTANT: keep this AFTER /payroll/charges and /payroll/paid so Express doesn't treat them as :id
router.delete('/payroll/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'delete'), deletePayroll);

// Payroll Printing
router.get('/payroll/print', protect, authorizeRoles('admin', 'staff'), checkPermission('financePrint', 'print'), printPayrollList);

export default router;
