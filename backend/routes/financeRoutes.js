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
  createAccount,
  getAccounts,
  updateAccount,
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

const router = express.Router();

// --- CONFIGURATION (Admin) ---
router.post('/config/categories', protect, authorizeRoles('admin'), createCategory);
router.get('/config/categories', protect, authorizeRoles('admin', 'staff'), getCategories);
router.put('/config/categories/:id', protect, authorizeRoles('admin'), updateCategory);
router.delete('/config/categories/:id', protect, authorizeRoles('admin'), deleteCategory);

router.post('/config/fee-types', protect, authorizeRoles('admin'), createFeeType);
router.get('/config/fee-types', protect, authorizeRoles('admin', 'staff'), getFeeTypes);
router.put('/config/fee-types/:id', protect, authorizeRoles('admin'), updateFeeType);
router.delete('/config/fee-types/:id', protect, authorizeRoles('admin'), deleteFeeType);

// --- ACCOUNTS (General Ledger) ---
router.post('/accounts', protect, authorizeRoles('admin', 'staff'), createAccount);
router.get('/accounts', protect, authorizeRoles('admin', 'staff'), getAccounts);
router.put('/accounts/:id', protect, authorizeRoles('admin', 'staff'), updateAccount);
router.post('/accounts/transfer', protect, authorizeRoles('admin', 'staff'), transferFunds);
router.post('/accounts/income', protect, authorizeRoles('admin', 'staff'), recordIncome);

// --- FOUNDATION (Donations) ---
router.post('/foundation/donors', protect, authorizeRoles('admin'), createDonor);
router.get('/foundation/donors', protect, authorizeRoles('admin', 'staff'), getDonors);
router.post('/foundation/donations', protect, authorizeRoles('admin'), createDonation);
router.get('/foundation/donations', protect, authorizeRoles('admin', 'staff'), getDonations);

// Dashboard Stats
router.get('/stats', protect, authorizeRoles('admin'), getFinanceStats);

// Finance Audit Logs (Student Finance Edit)
router.get('/audit', protect, authorizeRoles('admin', 'staff'), getAuditLogs);

// Maintenance (Admin)
router.post('/maintenance/backfill-billing-month', protect, authorizeRoles('admin'), backfillInvoiceBillingMonth);

// Fee Management
router.get('/invoices', protect, authorizeRoles('admin', 'staff'), getInvoices);
router.post('/invoices', protect, authorizeRoles('admin'), createInvoice);
router.post('/invoices/bulk', protect, authorizeRoles('admin'), createBulkInvoice);
router.put('/invoices/:id', protect, authorizeRoles('admin'), updateInvoice);
router.delete('/invoices/:id', protect, authorizeRoles('admin'), deleteInvoice);
router.post('/payments', protect, authorizeRoles('admin', 'staff'), recordPayment);
router.put('/payments/:transactionId', protect, authorizeRoles('admin', 'staff'), editPaymentTransaction);
router.get('/defaulters', protect, authorizeRoles('admin'), getDefaulters);
router.get('/clearance/:studentId', protect, authorizeRoles('admin', 'staff'), checkClearance);

// Student Finance - Receipt workflows
router.get('/receipt/students', protect, authorizeRoles('admin', 'staff'), listReceiptStudents);
router.get('/receipt/ledger', protect, authorizeRoles('admin', 'staff'), getStudentReceiptLedger);
router.post('/receipt/payment-group/revert', protect, authorizeRoles('admin'), revertPaymentGroup);

// Student Finance - Students summary (Receipt tab search)
router.get('/students/summary', protect, authorizeRoles('admin', 'staff'), getFinanceStudentsSummary);

// Student Finance - Previous Balance summary (Previous Balance tab)
router.get('/previous-balance/summary', protect, authorizeRoles('admin', 'staff'), getPreviousBalanceSummary);

// Student Finance - Show/Pay/History
router.get('/receipt/show', protect, authorizeRoles('admin', 'staff'), listChargedMonthSummary);
router.post('/receipt/pay', protect, authorizeRoles('admin', 'staff'), payChargedMonth);
router.post('/receipt/pay-selected-months', protect, authorizeRoles('admin', 'staff'), paySelectedMonths);
router.get('/receipt/history', protect, authorizeRoles('admin', 'staff'), getStudentMonthHistory);
router.post('/receipt/discount', protect, authorizeRoles('admin'), discountChargedMonth);
router.post('/receipt/payment-group/edit', protect, authorizeRoles('admin'), editPaymentGroup);

// Student Finance - Charge / Update / Delete
router.post('/fees/charge', protect, authorizeRoles('admin', 'staff'), chargeStudentFees);
router.post('/fees/discount', protect, authorizeRoles('admin'), applyMonthlyDiscount);
router.post('/fees/bulk-discount', protect, authorizeRoles('admin'), applyBulkDiscount);
router.post('/fees/correction', protect, authorizeRoles('admin'), recordCorrection);
router.post('/fees/update', protect, authorizeRoles('admin'), updateChargeAmount);
router.post('/fees/overall-discount', protect, authorizeRoles('admin'), applyOverallDiscount);
router.delete('/fees/charges', protect, authorizeRoles('admin'), deleteMonthlyCharges);

// Printing
router.get('/print/monthly-invoices', protect, authorizeRoles('admin', 'staff'), printMonthlyInvoices);
router.get('/print/daily-invoices', protect, authorizeRoles('admin', 'staff'), printDailyInvoices);
router.get('/print/receipt/:transactionId', protect, authorizeRoles('admin', 'staff'), getReceiptPrintPayload);
router.get('/print/payment-group/:paymentGroupId', protect, authorizeRoles('admin', 'staff'), getPaymentGroupReceiptPayload);
router.get('/print/passcards', protect, authorizeRoles('admin', 'staff'), getPassCardsByClass);

// Finance Appointments
router.post('/appointments', protect, authorizeRoles('admin', 'staff'), createAppointment);
router.get('/appointments', protect, authorizeRoles('admin', 'staff'), listAppointments);
router.get('/appointments/today', protect, authorizeRoles('admin', 'staff'), getTodayAppointments);
router.get('/appointments/missed', protect, authorizeRoles('admin', 'staff'), getMissedAppointments);
router.get('/appointments/completed', protect, authorizeRoles('admin', 'staff'), getCompletedAppointments);
router.patch('/appointments/:id', protect, authorizeRoles('admin', 'staff'), updateAppointment);
router.post('/appointments/:id/cancel', protect, authorizeRoles('admin', 'staff'), cancelAppointment);
router.post('/appointments/:id/reschedule', protect, authorizeRoles('admin', 'staff'), rescheduleAppointment);
router.post('/appointments/:id/start-payment', protect, authorizeRoles('admin', 'staff'), startAppointmentPayment);
router.get('/appointments/:id/print', protect, authorizeRoles('admin', 'staff'), getAppointmentSlip);

// Expense Management
router.get('/expenses', protect, authorizeRoles('admin'), getExpenses);
router.post('/expenses', protect, authorizeRoles('admin'), createExpense);
router.get('/expenses/ledger', protect, authorizeRoles('admin', 'staff'), getExpenseLedger);
router.get('/expenses/range', protect, authorizeRoles('admin', 'staff'), getExpenseChargesByDate);
router.put('/expenses/:id', protect, authorizeRoles('admin', 'staff'), updateExpenseCharge);
router.delete('/expenses/:id', protect, authorizeRoles('admin'), deleteExpenseCharge);
router.get('/expenses/budget/report', protect, authorizeRoles('admin', 'staff'), getExpenseBudgetReport);
router.get('/expenses/budget/over', protect, authorizeRoles('admin', 'staff'), getOverBudgetExpenses);

// Payroll Management
router.get('/payroll', protect, authorizeRoles('admin'), getPayrolls);
router.get('/payroll/staff-ledger', protect, authorizeRoles('admin'), getPayrollStaffLedger);
router.post('/payroll/generate', protect, authorizeRoles('admin'), generatePayroll);
router.post('/payroll/generate-single', protect, authorizeRoles('admin'), generateSinglePayroll);
router.post('/payroll/update-by-params', protect, authorizeRoles('admin'), updatePayrollByParams);
router.put('/payroll/:id/status', protect, authorizeRoles('admin'), updatePayrollStatus);
router.put('/payroll/:id/adjust', protect, authorizeRoles('admin'), adjustPayroll);
router.patch('/payroll/:id/ledger', protect, authorizeRoles('admin'), updatePayrollLedger);

// Payroll Workflows
router.post('/payroll/charge', protect, authorizeRoles('admin'), chargePayroll);
router.post('/payroll/full-payment', protect, authorizeRoles('admin'), payrollFullPayment);
router.delete('/payroll/charges', protect, authorizeRoles('admin'), deletePayrollCharges);

// IMPORTANT: keep this AFTER /payroll/charges so Express doesn't treat "charges" as :id
router.delete('/payroll/:id', protect, authorizeRoles('admin'), deletePayroll);

// Payroll Printing
router.get('/payroll/print', protect, authorizeRoles('admin'), printPayrollList);

export default router;
