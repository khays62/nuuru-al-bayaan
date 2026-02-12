import axios from './axios';

export async function listAccounts({ includeInactive } = {}, { signal } = {}) {
  const include = includeInactive ? 'true' : 'false';
  const res = await axios.get(`/finance/accounts?includeInactive=${include}`, { signal });
  return res.data;
}

export async function createAccount(payload, { signal } = {}) {
  const res = await axios.post('/finance/accounts', payload, { signal });
  return res.data;
}

export async function updateAccount(id, payload, { signal } = {}) {
  const res = await axios.put(`/finance/accounts/${id}`, payload, { signal });
  return res.data;
}

export async function deleteAccount(id, { signal } = {}) {
  const res = await axios.delete(`/finance/accounts/${id}`, { signal });
  return res.data;
}

export async function transferFunds(payload, { signal } = {}) {
  const res = await axios.post('/finance/accounts/transfer', payload, { signal });
  return res.data;
}

export async function recordIncome(payload, { signal } = {}) {
  const res = await axios.post('/finance/accounts/income', payload, { signal });
  return res.data;
}
