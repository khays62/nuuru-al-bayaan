import { http } from '../http';

export const getSlots = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `timetable/slots?${qs}` : 'timetable/slots';
  return http.fetchJson(path);
};

export const createSlot = (payload) =>
  http.fetchJson('timetable/slots', { method: 'POST', body: JSON.stringify(payload) });

export const createSlotsBulk = (payload) =>
  http.fetchJson('timetable/slots/bulk', { method: 'POST', body: JSON.stringify(payload) });

export const updateSlot = (id, payload) =>
  http.fetchJson(`timetable/slots/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const swapSlots = (payload) =>
  http.fetchJson('timetable/slots/swap', { method: 'POST', body: JSON.stringify(payload) });

export const deleteSlot = (id) =>
  http.fetchJson(`timetable/slots/${id}`, { method: 'DELETE' });
