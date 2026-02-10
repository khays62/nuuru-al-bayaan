import en from './en.js';
import ar from './ar.js';
import so from './so.js';
import { translateMessage as translateMessageImpl } from './messageMap.js';

const LOCALES = { en, ar, so };

function parseAcceptLanguageHeader(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [tag, ...rest] = part.split(';').map((s) => s.trim());
      const qPart = rest.find((s) => s.startsWith('q='));
      const q = qPart ? Number(qPart.slice(2)) : 1;
      return { tag: String(tag || '').toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag);
}

export function resolveLocale(req) {
  const header = req?.headers?.['accept-language'];
  const tags = parseAcceptLanguageHeader(header);

  for (const tag of tags) {
    if (tag === 'ar' || tag.startsWith('ar-')) return 'ar';
    if (tag === 'so' || tag.startsWith('so-')) return 'so';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }

  return 'en';
}

function getPath(obj, key) {
  const parts = String(key || '').split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function interpolate(template, vars) {
  const str = String(template);
  if (!vars || typeof vars !== 'object') return str;
  return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => {
    const v = vars[name];
    return v == null ? '' : String(v);
  });
}

export function t(req, key, vars = null, fallback = '') {
  const locale = req?.locale || resolveLocale(req);
  const dict = LOCALES[locale] || LOCALES.en;
  const dictEn = LOCALES.en;

  const v = getPath(dict, key);
  const vEn = getPath(dictEn, key);
  const template = typeof v === 'string' ? v : (typeof vEn === 'string' ? vEn : fallback);
  return interpolate(template, vars);
}

export function translateMessage(req, message) {
  const locale = req?.locale || resolveLocale(req);
  return translateMessageImpl(locale, message);
}
