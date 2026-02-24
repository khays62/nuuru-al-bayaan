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
import { checkAnyPermission, checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';

import mongoose from 'mongoose';
import FinanceCategory from '../models/FinanceCategory.js';

const router = express.Router();

const isPreviousBalanceCategoryName = (name) => {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return false;
  if (n === 'previous balance') return true;
  return n.includes('previous') && n.includes('balance');
};

// Some endpoints (fees/charge, fees/update, etc.) are shared by Receipt and Previous Balance tabs.
// We decide which permission to enforce based on the target category.
const checkStudentFeesByCategory = (action) => {
  const act = String(action || '');

  return async (req, res, next) => {
    if (!req?.user) return next(); // auth handled by protect
    if (String(req.user.role || '').toLowerCase() === 'admin') return next();

    // Try to resolve categoryId from request body.
    const rawCategoryId = req?.body?.categoryId || req?.body?.category || req?.body?.categoryRef;
    const categoryId = rawCategoryId ? String(rawCategoryId) : '';

    // If we can't resolve categoryId, default to Receipt permissions (most common).
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return checkPermission('financeStudentReceipt', act)(req, res, next);
    }

    try {
      const cat = await FinanceCategory.findById(categoryId).select('name type').lean();
      const isPrev = cat?.type === 'fee' && isPreviousBalanceCategoryName(cat?.name);
      const module = isPrev ? 'financeStudentPreviousBalance' : 'financeStudentReceipt';
      return checkPermission(module, act)(req, res, next);
    } catch (err) {
      // Fail closed: if we can't inspect the category, require Receipt permission.
      return checkPermission('financeStudentReceipt', act)(req, res, next);
    }
  };
};

const isExpenseCategoryType = (type) => {
  const t = String(type || '').trim().toLowerCase();
  return t === 'expense' || t === 'expenses';
};

// Finance categories are shared between Student Finance and Expenses.
// Enforce the correct module based on category type.
const checkCategoryByQueryType = (action) => {
  const act = String(action || '');
  return async (req, res, next) => {
    if (!req?.user) return next();
    if (String(req.user.role || '').toLowerCase() === 'admin') return next();

    const type = req?.query?.type;
    if (isExpenseCategoryType(type)) {
      if (act === 'view') {
        return checkAnyPermission([
          { module: 'financeExpensesLedger', action: 'view' },
          { module: 'financeExpensesCategories', action: 'view' },
          { module: 'financeConfig', action: 'view' },
        ])(req, res, next);
      }
      return checkPermission('financeExpensesCategories', act)(req, res, next);
    }

    // Non-expense: fall back to existing financeConfig / Student Finance tab rules.
    if (act === 'add') {
      return checkAnyPermission([
        { module: 'financeConfig', action: 'add' },
        { module: 'financeStudentAmountType', action: 'add' },
      ])(req, res, next);
    }
    if (act === 'view') {
      return checkAnyPermission([
        { module: 'financeConfig', action: 'view' },
        // Modal roles may need read-only lookup categories (e.g., payment methods)
        // to complete permitted workflows.
        { module: 'financeStudentReceiptModal', action: 'view' },
        { module: 'financeStudentReceiptModal', action: 'input' },
        { module: 'financeStudentReceiptModal', action: 'save' },
        { module: 'financeStudentPreviousBalanceModal', action: 'view' },
        { module: 'financeStudentPreviousBalanceModal', action: 'input' },
        { module: 'financeStudentPreviousBalanceModal', action: 'save' },
        // Receipt users must be able to read fee configuration data (amount types)
        // required by charging, without necessarily having the Amount Type tab.
        { module: 'financeStudentReceipt', action: 'view' },
        { module: 'financeStudentReceipt', action: 'add' },
        { module: 'financeStudentReceipt', action: 'edit' },
        { module: 'financeStudentReceipt', action: 'delete' },
        { module: 'financeStudentPreviousBalance', action: 'view' },
        { module: 'financeStudentAmountType', action: 'view' },
      ])(req, res, next);
    }
    if (act === 'edit') {
      return checkAnyPermission([
        { module: 'financeConfig', action: 'edit' },
        { module: 'financeStudentAmountType', action: 'edit' },
      ])(req, res, next);
    }
    if (act === 'delete') {
      return checkAnyPermission([
        { module: 'financeConfig', action: 'delete' },
        { module: 'financeStudentAmountType', action: 'delete' },
      ])(req, res, next);
    }

    return checkPermission('financeConfig', act)(req, res, next);
  };
};

const checkCategoryByBodyType = (action) => {
  const act = String(action || '');
  return async (req, res, next) => {
    if (!req?.user) return next();
    if (String(req.user.role || '').toLowerCase() === 'admin') return next();

    const type = req?.body?.type;
    if (isExpenseCategoryType(type)) {
      return checkPermission('financeExpensesCategories', act)(req, res, next);
    }

    return checkCategoryByQueryType(act)(req, res, next);
  };
};

const checkCategoryById = (action) => {
  const act = String(action || '');
  return async (req, res, next) => {
    if (!req?.user) return next();
    if (String(req.user.role || '').toLowerCase() === 'admin') return next();

    const id = req?.params?.id ? String(req.params.id) : '';
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: req.t('finance.invalidCategoryId', null, 'Invalid category id'),
      });
    }

    try {
      const cat = await FinanceCategory.findById(id).select('type').lean();
      const type = cat?.type;
      if (isExpenseCategoryType(type)) {
        return checkPermission('financeExpensesCategories', act)(req, res, next);
      }
      // Fee/other types fall back to financeConfig / Student Finance rules.
      return checkCategoryByQueryType(act)(req, res, next);
    } catch {
      // Fail closed: require financeConfig path.
      return checkCategoryByQueryType(act)(req, res, next);
    }
  };
};

// --- CONFIGURATION (Admin) ---
router.post(
  '/config/categories',
  protect,
  authorizeRoles('admin', 'staff'),
  checkCategoryByBodyType('add'),
  createCategory
);
router.get(
  '/config/categories',
  protect,
  authorizeRoles('admin', 'staff'),
  checkCategoryByQueryType('view'),
  getCategories
);
router.put(
  '/config/categories/:id',
  protect,
  authorizeRoles('admin', 'staff'),
  checkCategoryById('edit'),
  updateCategory
);
router.delete(
  '/config/categories/:id',
  protect,
  authorizeRoles('admin', 'staff'),
  checkCategoryById('delete'),
  deleteCategory
);

router.post(
  '/config/fee-types',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    { module: 'financeConfig', action: 'add' },
    { module: 'financeStudentFeeType', action: 'add' },
  ]),
  createFeeType
);
router.get(
  '/config/fee-types',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    { module: 'financeConfig', action: 'view' },
    // Receipt users need fee types for charging, even if they can't manage Fee Types.
    { module: 'financeStudentReceipt', action: 'view' },
    { module: 'financeStudentReceipt', action: 'add' },
    { module: 'financeStudentReceipt', action: 'edit' },
    { module: 'financeStudentAmountType', action: 'view' },
    { module: 'financeStudentFeeType', action: 'view' },
  ]),
  getFeeTypes
);
router.put(
  '/config/fee-types/:id',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    { module: 'financeConfig', action: 'edit' },
    { module: 'financeStudentFeeType', action: 'edit' },
  ]),
  updateFeeType
);
router.get(
  '/config/fee-types/:id/can-delete',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    { module: 'financeConfig', action: 'view' },
    { module: 'financeStudentFeeType', action: 'view' },
  ]),
  canDeleteFeeType
);
router.delete(
  '/config/fee-types/:id',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    { module: 'financeConfig', action: 'delete' },
    { module: 'financeStudentFeeType', action: 'delete' },
  ]),
  deleteFeeType
);

// --- ACCOUNTS (General Ledger) ---
router.post('/accounts', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccountsInstitution', 'add'), createAccount);
router.get(
  '/accounts',
  protect,
  authorizeRoles('admin', 'staff'),
  // Accounts are also required as read-only lookup data for finance workflows
  // (Student Finance payments + Payroll ledger saving), even if the staff member
  // cannot manage Accounts.
  checkAnyPermission([
    // Normal Accounts access
    { module: 'financeAccountsInstitution', action: 'view' },
    { module: 'financeAccountsInstitution', action: 'add' },
    { module: 'financeAccountsInstitution', action: 'edit' },
    { module: 'financeAccountsInstitution', action: 'delete' },
    { module: 'financeAccountsInstitution', action: 'transfer' },
    { module: 'financeAccountsInstitution', action: 'income' },
    { module: 'financeAccountsInstitution', action: 'download' },

    // Student Finance payment modal permissions
    { module: 'financeStudentReceiptModal', action: 'view' },
    { module: 'financeStudentReceiptModal', action: 'input' },
    { module: 'financeStudentReceiptModal', action: 'save' },
    { module: 'financeStudentPreviousBalanceModal', action: 'view' },
    { module: 'financeStudentPreviousBalanceModal', action: 'input' },
    { module: 'financeStudentPreviousBalanceModal', action: 'save' },

    // Payroll employee info modal permissions
    { module: 'financePayrollEmployeeInfo', action: 'view' },
    { module: 'financePayrollEmployeeInfo', action: 'input' },
    { module: 'financePayrollEmployeeInfo', action: 'save' },
  ]),
  getAccounts
);
router.put('/accounts/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccountsInstitution', 'edit'), updateAccount);
router.delete('/accounts/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccountsInstitution', 'delete'), deleteAccount);
router.post('/accounts/transfer', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccountsInstitution', 'transfer'), transferFunds);
router.post('/accounts/income', protect, authorizeRoles('admin', 'staff'), checkPermission('financeAccountsInstitution', 'income'), recordIncome);

// --- FOUNDATION (Donations) ---
router.post('/foundation/donors', protect, authorizeRoles('admin', 'staff'), checkPermission('financeFoundation', 'add'), createDonor);
router.get('/foundation/donors', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeFoundation'), getDonors);
router.post('/foundation/donations', protect, authorizeRoles('admin', 'staff'), checkPermission('financeFoundation', 'add'), createDonation);
router.get('/foundation/donations', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeFoundation'), getDonations);

// Dashboard Stats
router.get('/stats', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeDashboard'), getFinanceStats);

// Finance Audit Logs (Student Finance Edit)
router.get('/audit', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeAccountsLedger'), getAuditLogs);

// Maintenance (Admin)
router.post('/maintenance/backfill-billing-month', protect, authorizeRoles('admin', 'staff'), checkPermission('financeMaintenance', 'run'), backfillInvoiceBillingMonth);

// Fee Management
router.get(
  '/invoices',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    // Legacy Receipt tab access
    { module: 'financeStudentReceipt', action: 'view' },
    { module: 'financeStudentReceipt', action: 'add' },
    { module: 'financeStudentReceipt', action: 'edit' },
    { module: 'financeStudentReceipt', action: 'delete' },
    { module: 'financeStudentReceipt', action: 'download' },

    // Modal-level access
    { module: 'financeStudentReceiptModal', action: 'view' },
    { module: 'financeStudentPreviousBalanceModal', action: 'view' },
  ]),
  getInvoices
);
router.post('/invoices', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'add'), createInvoice);
router.post('/invoices/bulk', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'add'), createBulkInvoice);
router.put('/invoices/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'edit'), updateInvoice);
router.delete('/invoices/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'delete'), deleteInvoice);
router.post(
  '/payments',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    // New modal permissions
    { module: 'financeStudentReceiptModal', action: 'save' },
    { module: 'financeStudentPreviousBalanceModal', action: 'save' },
    // Backward-compatible legacy
    { module: 'financeStudentReceipt', action: 'add' },
    { module: 'financeStudentReceipt', action: 'edit' },
  ]),
  recordPayment
);
router.put('/payments/:transactionId', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'edit'), editPaymentTransaction);
router.get('/defaulters', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'view'), getDefaulters);
router.get('/clearance/:studentId', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'view'), checkClearance);

// Student Finance - Receipt workflows
router.get('/receipt/students', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudentReceipt'), listReceiptStudents);
router.get('/receipt/ledger', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudentReceipt'), getStudentReceiptLedger);
router.post(
  '/receipt/payment-group/revert',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    // New modal permissions
    { module: 'financeStudentReceiptModal', action: 'revert' },
    { module: 'financeStudentPreviousBalanceModal', action: 'revert' },
    // Backward-compatible legacy
    { module: 'financeStudentReceipt', action: 'edit' },
  ]),
  revertPaymentGroup
);

// Student Finance - Students summary (shared by Receipt + Previous Balance tabs)
router.get(
  '/students/summary',
  protect,
  authorizeRoles('admin', 'staff'),
  // Allow either tab to load the shared student list.
  checkAnyPermission([
    { module: 'financeStudentReceipt', action: 'view' },
    { module: 'financeStudentReceipt', action: 'add' },
    { module: 'financeStudentReceipt', action: 'edit' },
    { module: 'financeStudentReceipt', action: 'delete' },
    { module: 'financeStudentReceipt', action: 'download' },

    { module: 'financeStudentPreviousBalance', action: 'view' },
    { module: 'financeStudentPreviousBalance', action: 'add' },
    { module: 'financeStudentPreviousBalance', action: 'edit' },
    { module: 'financeStudentPreviousBalance', action: 'delete' },
  ]),
  getFinanceStudentsSummary
);

// Student Finance - Previous Balance summary (Previous Balance tab)
router.get('/previous-balance/summary', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudentPreviousBalance'), getPreviousBalanceSummary);

// Student Finance - Show/Pay/History
router.get('/receipt/show', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeStudentReceipt'), listChargedMonthSummary);
router.post(
  '/receipt/pay',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    { module: 'financeStudentReceiptModal', action: 'save' },
    { module: 'financeStudentPreviousBalanceModal', action: 'save' },
    // Backward-compatible legacy
    { module: 'financeStudentReceipt', action: 'add' },
  ]),
  payChargedMonth
);
router.post(
  '/receipt/pay-selected-months',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    { module: 'financeStudentReceiptModal', action: 'save' },
    { module: 'financeStudentPreviousBalanceModal', action: 'save' },
    // Backward-compatible legacy
    { module: 'financeStudentReceipt', action: 'add' },
  ]),
  paySelectedMonths
);
router.get(
  '/receipt/history',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    // Legacy Receipt access
    { module: 'financeStudentReceipt', action: 'view' },
    { module: 'financeStudentReceipt', action: 'add' },
    { module: 'financeStudentReceipt', action: 'edit' },
    { module: 'financeStudentReceipt', action: 'delete' },
    { module: 'financeStudentReceipt', action: 'download' },

    // Modal-level access
    { module: 'financeStudentReceiptModal', action: 'view' },
    { module: 'financeStudentPreviousBalanceModal', action: 'view' },
  ]),
  getStudentMonthHistory
);
router.post('/receipt/discount', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'edit'), discountChargedMonth);
router.post('/receipt/payment-group/edit', protect, authorizeRoles('admin', 'staff'), checkPermission('financeStudentReceipt', 'edit'), editPaymentGroup);

// Student Finance - Charge / Update / Delete
router.post('/fees/charge', protect, authorizeRoles('admin', 'staff'), checkStudentFeesByCategory('add'), chargeStudentFees);
router.post('/fees/discount', protect, authorizeRoles('admin', 'staff'), checkStudentFeesByCategory('edit'), applyMonthlyDiscount);
router.post('/fees/bulk-discount', protect, authorizeRoles('admin', 'staff'), checkStudentFeesByCategory('edit'), applyBulkDiscount);
router.post('/fees/correction', protect, authorizeRoles('admin', 'staff'), checkStudentFeesByCategory('edit'), recordCorrection);
router.post('/fees/update', protect, authorizeRoles('admin', 'staff'), checkStudentFeesByCategory('edit'), updateChargeAmount);
router.post('/fees/overall-discount', protect, authorizeRoles('admin', 'staff'), checkStudentFeesByCategory('edit'), applyOverallDiscount);
router.delete('/fees/charges', protect, authorizeRoles('admin', 'staff'), checkStudentFeesByCategory('delete'), deleteMonthlyCharges);

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
router.get('/expenses', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpensesLedger'), getExpenses);
router.post('/expenses', protect, authorizeRoles('admin', 'staff'), checkPermission('financeExpensesLedger', 'add'), createExpense);
router.get('/expenses/ledger', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpensesLedger'), getExpenseLedger);
router.get('/expenses/range', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpensesLedger'), getExpenseChargesByDate);
router.put('/expenses/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeExpensesLedger', 'edit'), updateExpenseCharge);
router.delete('/expenses/:id', protect, authorizeRoles('admin', 'staff'), checkPermission('financeExpensesLedger', 'delete'), deleteExpenseCharge);
router.get('/expenses/budget/report', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpensesLedger'), getExpenseBudgetReport);
router.get('/expenses/budget/over', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financeExpensesLedger'), getOverBudgetExpenses);

// Payroll Management
router.get('/payroll', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financePayroll'), getPayrolls);
router.get('/payroll/staff-ledger', protect, authorizeRoles('admin', 'staff'), checkModuleAnyPermission('financePayroll'), getPayrollStaffLedger);
router.post('/payroll/generate', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'add'), generatePayroll);
router.post('/payroll/generate-single', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'add'), generateSinglePayroll);
router.post('/payroll/update-by-params', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'edit'), updatePayrollByParams);
router.put('/payroll/:id/status', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'edit'), updatePayrollStatus);
router.put('/payroll/:id/adjust', protect, authorizeRoles('admin', 'staff'), checkPermission('financePayroll', 'edit'), adjustPayroll);
router.patch(
  '/payroll/:id/ledger',
  protect,
  authorizeRoles('admin', 'staff'),
  checkAnyPermission([
    // New modal save permission
    { module: 'financePayrollEmployeeInfo', action: 'save' },
    // Backward-compatible legacy
    { module: 'financePayroll', action: 'edit' },
  ]),
  updatePayrollLedger
);

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
