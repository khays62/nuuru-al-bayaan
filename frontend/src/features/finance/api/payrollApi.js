import axios from './axios';

export async function listPayrolls({ month, academicYear } = {}, { signal } = {}) {
  const params = {};
  if (month) params.month = month;
  if (academicYear) params.academicYear = academicYear;
  const res = await axios.get('/finance/payroll', { params, signal });
  return res.data;
}

export async function getPayrollStaffLedger(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/payroll/staff-ledger', { params, signal });
  return res.data;
}

export async function generatePayroll(payload, { signal } = {}) {
  const res = await axios.post('/finance/payroll/generate', payload, { signal });
  return res.data;
}

export async function generateSinglePayroll(payload, { signal } = {}) {
  const res = await axios.post('/finance/payroll/generate-single', payload, { signal });
  return res.data;
}

export async function updatePayrollByParams(payload, { signal } = {}) {
  const res = await axios.post('/finance/payroll/update-by-params', payload, { signal });
  return res.data;
}

export async function updatePayrollStatus(id, payload, { signal } = {}) {
  const res = await axios.put(`/finance/payroll/${id}/status`, payload, { signal });
  return res.data;
}

export async function adjustPayroll(id, payload, { signal } = {}) {
  const res = await axios.put(`/finance/payroll/${id}/adjust`, payload, { signal });
  return res.data;
}

export async function updatePayrollLedger(id, payload, { signal } = {}) {
  const res = await axios.patch(`/finance/payroll/${id}/ledger`, payload, { signal });
  return res.data;
}

export async function deletePayroll(id, { signal } = {}) {
  const res = await axios.delete(`/finance/payroll/${id}`, { signal });
  return res.data;
}

// Workflows
export async function chargePayroll(payload, { signal } = {}) {
  const res = await axios.post('/finance/payroll/charge', payload, { signal });
  return res.data;
}

export async function payrollFullPayment(payload, { signal } = {}) {
  const res = await axios.post('/finance/payroll/full-payment', payload, { signal });
  return res.data;
}

export async function deletePayrollCharges(payload, { signal } = {}) {
  const res = await axios.delete('/finance/payroll/charges', { data: payload, signal });
  return res.data;
}

export async function printPayrollList(params = {}, { signal } = {}) {
  const res = await axios.get('/finance/payroll/print', { params, signal });
  return res.data;
}
