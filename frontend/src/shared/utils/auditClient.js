import { apiUrl } from '../api/http.js';

const EVENT_TTL_MS = 2_500;
const recentAuditEvents = new Map();

const getCookie = (name) => {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  for (const raw of String(document.cookie || '').split(';')) {
    const part = raw.trim();
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return '';
};

const normalizeFileLabel = (value) => String(value || '').trim().slice(0, 200);

const inferFormat = (value, fallback = '') => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return String(fallback || '').trim().toLowerCase();
  if (text.endsWith('.pdf') || text.includes('pdf')) return 'pdf';
  if (text.endsWith('.xlsx') || text.endsWith('.xls') || text.includes('excel')) return 'excel';
  if (text.endsWith('.csv') || text.includes('csv')) return 'csv';
  if (text.endsWith('.png') || text.includes('png')) return 'png';
  if (text.endsWith('.jpg') || text.endsWith('.jpeg') || text.includes('jpeg')) return 'image';
  if (text === 'print') return 'print';
  return text.split('.').pop() || String(fallback || '').trim().toLowerCase();
};

const shouldSend = (payload) => {
  const key = [payload.action, payload.path, payload.format || '', payload.label || ''].join('|');
  const now = Date.now();
  const last = Number(recentAuditEvents.get(key) || 0);
  if (now - last < EVENT_TTL_MS) return false;
  recentAuditEvents.set(key, now);
  if (recentAuditEvents.size > 2000) {
    for (const [eventKey, ts] of recentAuditEvents) {
      if (now - Number(ts || 0) > EVENT_TTL_MS) recentAuditEvents.delete(eventKey);
    }
  }
  return true;
};

export const trackAuditClientEvent = ({ action, format = '', label = '', path } = {}) => {
  if (typeof window === 'undefined') return;
  const eventPath = String(path || window.location?.pathname || '/').slice(0, 200);
  const payload = {
    action: String(action || '').trim(),
    path: eventPath,
    format: String(format || '').trim().slice(0, 32),
    label: normalizeFileLabel(label),
  };

  if (!payload.action || !payload.path || !shouldSend(payload)) return;

  const headers = { 'Content-Type': 'application/json' };
  const csrf = getCookie('csrf_token');
  if (csrf) headers['X-CSRF-Token'] = csrf;

  try {
    fetch(apiUrl('/audit/client-event'), {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers,
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // ignore
  }
};

export const installGlobalAuditClientTracking = () => {
  if (typeof window === 'undefined') return;
  if (window.__nbAuditClientInstalled) return;
  window.__nbAuditClientInstalled = true;

  const originalPrint = typeof window.print === 'function' ? window.print.bind(window) : null;
  if (originalPrint) {
    window.print = (...args) => {
      trackAuditClientEvent({ action: 'client.print', format: 'print', label: document?.title || 'print' });
      return originalPrint(...args);
    };
  }

  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function patchedAuditAnchorClick(...args) {
    try {
      const download = normalizeFileLabel(this.getAttribute('download') || '');
      const href = String(this.getAttribute('href') || '').trim();
      const isDownloadLike = Boolean(download) || href.startsWith('blob:') || href.startsWith('data:');
      if (isDownloadLike) {
        const label = download || href.split('/').pop() || 'download';
        trackAuditClientEvent({
          action: 'client.download',
          format: inferFormat(download || href, 'download'),
          label,
        });
      }
    } catch {
      // ignore
    }
    return originalAnchorClick.apply(this, args);
  };
};