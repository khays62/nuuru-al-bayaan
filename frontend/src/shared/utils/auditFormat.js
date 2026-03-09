function toStartCase(input) {
  const s = String(input || '').trim();
  if (!s) return '';

  const spaced = s
    .replace(/[_-]+/g, ' ')
    .replace(/\./g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  return spaced
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length ? `${w[0].toUpperCase()}${w.slice(1)}` : w))
    .join(' ');
}

function tryGetPath(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.startsWith('/')) return s;
  try {
    const u = new URL(s);
    return `${u.pathname}${u.search || ''}`;
  } catch {
    return s;
  }
}

function extractBodyKeys(desc) {
  const m = String(desc || '').match(/\bbodyKeys=([^\s)]+)/i);
  if (!m?.[1]) return [];
  return m[1]
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

function summarizeKeys(keys) {
  const list = Array.isArray(keys) ? keys : [];
  if (list.length <= 4) return list.join(', ');
  return `${list.slice(0, 3).join(', ')}… +${list.length - 3}`;
}

export function prettifyAuditAction(action, { t } = {}) {
  const s = String(action || '').trim();
  if (!s) return '';

  if (typeof t === 'function') {
    const translated = t(`audit.actions.${s}`, { defaultValue: '' });
    if (translated) return translated;
  }

  const parts = s.split('.').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return toStartCase(parts[0]);

  const modulePart = toStartCase(parts[0]);
  const verbPart = toStartCase(parts.slice(1).join(' '));
  return `${modulePart} • ${verbPart}`;
}

export function formatAuditDescription(row, { t } = {}) {
  const raw = String(row?.description || '').trim();
  if (!raw) return '';

  // Auto-generated HTTP audit string: "METHOD /api/... bodyKeys=a,b (12ms)"
  const m = raw.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/i);
  if (m?.[1] && m?.[2]) {
    const method = String(m[1]).toUpperCase();
    const path = tryGetPath(m[2]);

    const keys = extractBodyKeys(raw);
    const fieldsLabel = typeof t === 'function'
      ? t('common.audit.fields', { defaultValue: 'fields' })
      : 'fields';
    const keyPart = keys.length ? ` (${fieldsLabel}: ${summarizeKeys(keys)})` : '';

    return `${method} ${path}${keyPart}`;
  }

  // Otherwise: keep as-is but avoid extremely long cells.
  if (raw.length > 140) return `${raw.slice(0, 137)}…`;
  return raw;
}

export function formatIpDisplay(ip, { t } = {}) {
  const s = String(ip || '').trim();
  if (!s) return '';

  const localhostLabel = typeof t === 'function'
    ? t('common.audit.localhost', { defaultValue: 'Localhost' })
    : 'Localhost';

  if (s === '::1') return `::1 (${localhostLabel})`;
  if (s === '127.0.0.1') return `127.0.0.1 (${localhostLabel})`;

  if (s.startsWith('::ffff:')) {
    const mapped = s.slice('::ffff:'.length);
    if (mapped === '127.0.0.1') return `${s} (${localhostLabel})`;
    return mapped;
  }

  return s;
}

export function formatDeviceDisplay(userAgent, { t } = {}) {
  const ua = String(userAgent || '').trim();
  if (!ua) return '';

  const os = detectOs(ua, { t });
  const browser = detectBrowser(ua, { t });
  const isMobile = /\bMobile\b|Android|iPhone|iPad|iPod/i.test(ua);

  const mobileLabel = typeof t === 'function'
    ? t('common.audit.mobile', { defaultValue: 'Mobile' })
    : 'Mobile';

  const parts = [os, browser].filter(Boolean);
  const out = parts.join(' • ');
  return isMobile && out ? `${out} (${mobileLabel})` : out;
}

function detectOs(ua, { t } = {}) {
  if (/Windows NT 10\.0/i.test(ua)) return 'Windows 10';
  if (/Windows NT 6\.3/i.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6\.2/i.test(ua)) return 'Windows 8';
  if (/Windows NT 6\.1/i.test(ua)) return 'Windows 7';
  if (/Mac OS X/i.test(ua) && /iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Linux/i.test(ua)) return 'Linux';
  return typeof t === 'function'
    ? t('common.audit.unknownOs', { defaultValue: 'Unknown OS' })
    : 'Unknown OS';
}

function detectBrowser(ua, { t } = {}) {
  // Order matters: Edge UA contains Chrome tokens
  const edge = ua.match(/\bEdg\/(\d+)/i);
  if (edge?.[1]) return `Edge ${edge[1]}`;

  const opera = ua.match(/\bOPR\/(\d+)/i);
  if (opera?.[1]) return `Opera ${opera[1]}`;

  const firefox = ua.match(/\bFirefox\/(\d+)/i);
  if (firefox?.[1]) return `Firefox ${firefox[1]}`;

  const chrome = ua.match(/\bChrome\/(\d+)/i);
  if (chrome?.[1]) return `Chrome ${chrome[1]}`;

  const safariVersion = ua.match(/\bVersion\/(\d+)/i);
  if (safariVersion?.[1] && /Safari\//i.test(ua)) return `Safari ${safariVersion[1]}`;

  return typeof t === 'function'
    ? t('common.audit.unknownBrowser', { defaultValue: 'Unknown browser' })
    : 'Unknown browser';
}
