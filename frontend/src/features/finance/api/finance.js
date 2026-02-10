import axios from './axios'; // Assuming a configured axios instance exists

const financeService = {
    // Users (for display helpers)
    getUserById: async (id) => {
        const response = await axios.get(`/users/${id}`);
        return response.data;
    },

    // Configuration
    getFinanceCategories: async (type, options = {}) => {
        const response = await axios.get('/finance/config/categories', { params: type ? { type } : {} });
        const data = response.data;
        if (String(type || '').toLowerCase() !== 'fee') return data;
        if (options?.includePreviousBalance) return data;

        const list = Array.isArray(data) ? data : (data?.data || []);
        const filtered = list.filter((c) => String(c?.name || '').trim().toLowerCase() !== 'previous balance');
        return Array.isArray(data) ? filtered : { ...data, data: filtered };
    },
    createFinanceCategory: async (data) => {
        const response = await axios.post('/finance/config/categories', data);
        return response.data;
    },
    updateFinanceCategory: async (id, data) => {
        const response = await axios.put(`/finance/config/categories/${id}`, data);
        return response.data;
    },
    deleteFinanceCategory: async (id) => {
        const response = await axios.delete(`/finance/config/categories/${id}`);
        return response.data;
    },

    // Fee Types (Personal / Free)
    getFeeTypes: async (params) => {
        const response = await axios.get('/finance/config/fee-types', { params });
        return response.data;
    },
    createFeeType: async (data) => {
        const response = await axios.post('/finance/config/fee-types', data);
        return response.data;
    },
    updateFeeType: async (id, data) => {
        const response = await axios.put(`/finance/config/fee-types/${id}`, data);
        return response.data;
    },
    deleteFeeType: async (id) => {
        const response = await axios.delete(`/finance/config/fee-types/${id}`);
        return response.data;
    },
    getAcademicYears: async () => {
        const response = await axios.get('/lookups/academic-years');
        return response.data;
    },
    getGradeSections: async (params) => {
        const response = await axios.get('/grades/sections', { params });
        return response.data;
    },

    // Dashboard
    getStats: async () => {
        const response = await axios.get('/finance/stats');
        return response.data;
    },

    // Accounts
    getAccounts: async (options = {}) => {
        const includeInactive = options?.includeInactive ? 'true' : 'false';
        const response = await axios.get(`/finance/accounts?includeInactive=${includeInactive}`);
        return response.data;
    },
    createAccount: async (data) => {
        const response = await axios.post('/finance/accounts', data);
        return response.data;
    },
    updateAccount: async (id, data) => {
        const response = await axios.put(`/finance/accounts/${id}`, data);
        return response.data;
    },
    transferFunds: async (data) => {
        const response = await axios.post('/finance/accounts/transfer', data);
        return response.data;
    },

    // Invoices
    getInvoices: async (params) => {
        const response = await axios.get('/finance/invoices', { params });
        return response.data;
    },
    createInvoice: async (data) => {
        const response = await axios.post('/finance/invoices', data);
        return response.data;
    },
    createBulkInvoice: async (data) => {
        const response = await axios.post('/finance/invoices/bulk', data);
        return response.data;
    },
    chargeStudentFees: async (data) => {
        const response = await axios.post('/finance/fees/charge', data);
        return response.data;
    },
    applyMonthlyDiscount: async (data) => {
        const response = await axios.post('/finance/fees/discount', data);
        return response.data;
    },
    applyBulkDiscount: async (data) => {
        const response = await axios.post('/finance/fees/bulk-discount', data);
        return response.data;
    },
    recordCorrection: async (data) => {
        const response = await axios.post('/finance/fees/correction', data);
        return response.data;
    },
    updateCharge: async (data) => {
        const response = await axios.post('/finance/fees/update', data);
        return response.data;
    },
    applyOverallDiscount: async (data) => {
        const response = await axios.post('/finance/fees/overall-discount', data);
        return response.data;
    },
    deleteMonthlyCharges: async (data) => {
        const response = await axios.delete('/finance/fees/charges', { data });
        return response.data;
    },
    deleteBulkInvoices: async (data) => {
        const response = await axios.delete('/finance/fees/charges', { data });
        return response.data;
    },
    updateInvoice: async (id, data) => {
        const response = await axios.put(`/finance/invoices/${id}`, data);
        return response.data;
    },
    deleteInvoice: async (id) => {
        const response = await axios.delete(`/finance/invoices/${id}`);
        return response.data;
    },
    recordIncome: async (data) => {
        const response = await axios.post('/finance/accounts/income', data);
        return response.data;
    },
    recordPayment: async (data) => {
        const response = await axios.post('/finance/payments', data);
        return response.data;
    },
    getDefaulters: async (params) => {
        const response = await axios.get('/finance/defaulters', { params });
        return response.data;
    },
    checkClearance: async (studentId) => {
        const response = await axios.get(`/finance/clearance/${studentId}`);
        return response.data;
    },

    // Printing
    printMonthlyInvoices: async (params) => {
        const response = await axios.get('/finance/print/monthly-invoices', { params });
        return response.data;
    },
    printDailyInvoices: async (params) => {
        const response = await axios.get('/finance/print/daily-invoices', { params });
        return response.data;
    },
    printPasscards: async (params) => {
        const response = await axios.get('/finance/print/passcards', { params });
        return response.data;
    },

    // Finance Appointments
    createAppointment: async (data) => {
        const response = await axios.post('/finance/appointments', data);
        return response.data;
    },
    listAppointments: async (params) => {
        const response = await axios.get('/finance/appointments', { params });
        return response.data;
    },
    getTodayAppointments: async () => {
        const response = await axios.get('/finance/appointments/today');
        return response.data;
    },
    getMissedAppointments: async () => {
        const response = await axios.get('/finance/appointments/missed');
        return response.data;
    },
    getCompletedAppointments: async () => {
        const response = await axios.get('/finance/appointments/completed');
        return response.data;
    },
    updateAppointment: async (id, data) => {
        const response = await axios.patch(`/finance/appointments/${id}`, data);
        return response.data;
    },
    cancelAppointment: async (id) => {
        const response = await axios.post(`/finance/appointments/${id}/cancel`);
        return response.data;
    },
    rescheduleAppointment: async (id, data) => {
        const response = await axios.post(`/finance/appointments/${id}/reschedule`, data);
        return response.data;
    },
    startAppointmentPayment: async (id, data) => {
        const response = await axios.post(`/finance/appointments/${id}/start-payment`, data);
        return response.data;
    },
    getAppointmentSlip: async (id) => {
        const response = await axios.get(`/finance/appointments/${id}/print`);
        return response.data;
    },

    // Payroll
    getPayrolls: async (params) => {
        const response = await axios.get('/finance/payroll', { params });
        return response.data;
    },
    generatePayroll: async (data) => {
        const response = await axios.post('/finance/payroll/generate', data);
        return response.data;
    },
    generateSinglePayroll: async (data) => {
        const response = await axios.post('/finance/payroll/generate-single', data);
        return response.data;
    },
    updatePayrollStatus: async (id, data) => {
        const response = await axios.put(`/finance/payroll/${id}/status`, data);
        return response.data;
    },
    adjustPayroll: async (id, data) => {
        const response = await axios.put(`/finance/payroll/${id}/adjust`, data);
        return response.data;
    },
    deletePayroll: async (id) => {
        const response = await axios.delete(`/finance/payroll/${id}`);
        return response.data;
    },

    // Payroll Workflows (Charge/Full Payment/Delete Charges)
    chargePayroll: async (data) => {
        const response = await axios.post('/finance/payroll/charge', data);
        return response.data;
    },
    payrollFullPayment: async (data) => {
        const response = await axios.post('/finance/payroll/full-payment', data);
        return response.data;
    },
    deletePayrollCharges: async (data) => {
        const response = await axios.delete('/finance/payroll/charges', { data });
        return response.data;
    },

    // Payroll Printing + Ledger
    printPayrollList: async (params) => {
        const response = await axios.get('/finance/payroll/print', { params });
        return response.data;
    },
    getPayrollStaffLedger: async (params) => {
        const response = await axios.get('/finance/payroll/staff-ledger', { params });
        return response.data;
    },
    updatePayrollByParams: async (data) => {
        const response = await axios.post('/finance/payroll/update-by-params', data);
        return response.data;
    },
    updatePayrollLedger: async (id, data) => {
        const response = await axios.patch(`/finance/payroll/${id}/ledger`, data);
        return response.data;
    },

    payrollCharge: async (data) => {
        const response = await axios.post('/finance/payroll/charge', data);
        return response.data;
    },

    // Expenses
    getExpenses: async () => {
        const response = await axios.get('/finance/expenses');
        return response.data;
    },
    getExpenseChargesByDate: async (params) => {
        const response = await axios.get('/finance/expenses/range', { params });
        return response.data;
    },
    getExpenseBudgetReport: async (params) => {
        const response = await axios.get('/finance/expenses/budget/report', { params });
        return response.data;
    },
    createExpense: async (data) => {
        const response = await axios.post('/finance/expenses', data);
        return response.data;
    },
    updateExpense: async (id, data) => {
        const response = await axios.put(`/finance/expenses/${id}`, data);
        return response.data;
    },
    deleteExpense: async (id) => {
        const response = await axios.delete(`/finance/expenses/${id}`);
        return response.data;
    },
    fetchAuditLogs: async (params) => {
        const response = await axios.get('/finance/audit', { params });
        return response.data;
    },

    // Student Finance - Show/Pay/History (Receipt redesign)
    getChargedMonthSummary: async (params) => {
        const response = await axios.get('/finance/receipt/show', { params });
        return response.data;
    },
    payChargedMonth: async (data) => {
        const response = await axios.post('/finance/receipt/pay', data);
        return response.data;
    },
    paySelectedMonths: async (data) => {
        const response = await axios.post('/finance/receipt/pay-selected-months', data);
        return response.data;
    },
    getStudentMonthHistory: async (params) => {
        const response = await axios.get('/finance/receipt/history', { params });
        return response.data;
    },
    discountChargedMonth: async (payload) => {
        const response = await axios.post('/finance/receipt/discount', payload);
        return response.data;
    },
    editPaymentGroup: async (payload) => {
        const response = await axios.post('/finance/receipt/payment-group/edit', payload);
        return response.data;
    },
    revertPaymentGroup: async (payload) => {
        const response = await axios.post('/finance/receipt/payment-group/revert', payload);
        return response.data;
    },
    printPaymentGroup: async (paymentGroupId, params) => {
        const response = await axios.get(`/finance/print/payment-group/${paymentGroupId}`, { params });
        return response.data;
    },
    getStudentSummary: async (params) => {
        const response = await axios.get('/finance/students/summary', { params });
        return response.data;
    },
    getPreviousBalanceSummary: async (params) => {
        const response = await axios.get('/finance/previous-balance/summary', { params });
        return response.data;
    }
};

export default financeService;
