import axios from './axios';

export async function listExpenses({ from, to } = {}, { signal } = {}) {
  if (from && to) {
    const res = await axios.get('/finance/expenses/range', { params: { from, to, excludePayroll: 1 }, signal });
    return res.data;
  }
  const res = await axios.get('/finance/expenses', { params: { excludePayroll: 1 }, signal });
  return res.data;
}

export async function createExpense(payload, { signal } = {}) {
  const res = await axios.post('/finance/expenses', payload, { signal });
  return res.data;
}

export async function updateExpense(id, payload, { signal } = {}) {
  const res = await axios.put(`/finance/expenses/${id}`, payload, { signal });
  return res.data;
}

export async function deleteExpense(id, { signal } = {}) {
  const res = await axios.delete(`/finance/expenses/${id}`, { signal });
  return res.data;
}
