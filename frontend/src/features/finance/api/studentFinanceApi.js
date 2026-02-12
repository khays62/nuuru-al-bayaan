import axios from './axios';

// Student Finance summaries (tables)
export async function getFinanceStudentsSummary(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/students/summary', { params, signal });
  return res.data;
}

export async function getPreviousBalanceSummary(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/previous-balance/summary', { params, signal });
  return res.data;
}

// Invoices (used by student finance workflows)
export async function getInvoices(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/invoices', { params, signal });
  return res.data;
}

// Receipt workflows
export async function listReceiptStudents(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/receipt/students', { params, signal });
  return res.data;
}

export async function getStudentReceiptLedger(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/receipt/ledger', { params, signal });
  return res.data;
}

export async function listChargedMonthSummary(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/receipt/show', { params, signal });
  return res.data;
}

export async function payChargedMonth(payload, { signal } = {}) {
  const res = await axios.post('/finance/receipt/pay', payload, { signal });
  return res.data;
}

export async function paySelectedMonths(payload, { signal } = {}) {
  const res = await axios.post('/finance/receipt/pay-selected-months', payload, { signal });
  return res.data;
}

export async function getStudentMonthHistory(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/receipt/history', { params, signal });
  return res.data;
}

export async function discountChargedMonth(payload, { signal } = {}) {
  const res = await axios.post('/finance/receipt/discount', payload, { signal });
  return res.data;
}

export async function editPaymentGroup(payload, { signal } = {}) {
  const res = await axios.post('/finance/receipt/payment-group/edit', payload, { signal });
  return res.data;
}

export async function revertPaymentGroup(payload, { signal } = {}) {
  const res = await axios.post('/finance/receipt/payment-group/revert', payload, { signal });
  return res.data;
}

// Charge / update / delete
export async function chargeStudentFees(payload, { signal } = {}) {
  const res = await axios.post('/finance/fees/charge', payload, { signal });
  return res.data;
}

export async function applyMonthlyDiscount(payload, { signal } = {}) {
  const res = await axios.post('/finance/fees/discount', payload, { signal });
  return res.data;
}

export async function applyBulkDiscount(payload, { signal } = {}) {
  const res = await axios.post('/finance/fees/bulk-discount', payload, { signal });
  return res.data;
}

export async function recordCorrection(payload, { signal } = {}) {
  const res = await axios.post('/finance/fees/correction', payload, { signal });
  return res.data;
}

export async function updateChargeAmount(payload, { signal } = {}) {
  const res = await axios.post('/finance/fees/update', payload, { signal });
  return res.data;
}

export async function applyOverallDiscount(payload, { signal } = {}) {
  const res = await axios.post('/finance/fees/overall-discount', payload, { signal });
  return res.data;
}

export async function deleteMonthlyCharges(payload, { signal } = {}) {
  const res = await axios.delete('/finance/fees/charges', { data: payload, signal });
  return res.data;
}

// Printing
export async function printMonthlyInvoices(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/print/monthly-invoices', { params, signal });
  return res.data;
}

export async function printDailyInvoices(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/print/daily-invoices', { params, signal });
  return res.data;
}

export async function getReceiptPrintPayload(transactionId, params = {}, { signal } = {}) {
  const res = await axios.get(`/finance/print/receipt/${transactionId}`, { params, signal });
  return res.data;
}

export async function getPaymentGroupReceiptPayload(paymentGroupId, params = {}, { signal } = {}) {
  const res = await axios.get(`/finance/print/payment-group/${paymentGroupId}`, { params, signal });
  return res.data;
}

export async function getPassCardsByClass(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/print/passcards', { params, signal });
  return res.data;
}
