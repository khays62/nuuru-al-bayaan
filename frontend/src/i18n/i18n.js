import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources, defaultLanguage, supportedLanguages } from './resources';

export const LANGUAGE_STORAGE_KEY = 'app:lang';

function readStoredLanguage() {
  try {
    const v = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!v) return null;
    return String(v);
  } catch {
    return null;
  }
}

function detectInitialLanguage() {
  const stored = readStoredLanguage();
  if (stored && supportedLanguages.includes(stored)) return stored;

  try {
    const nav = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';
    const base = String(nav || '').split('-')[0];
    if (supportedLanguages.includes(base)) return base;
  } catch {
    // ignore
  }

  return defaultLanguage;
}

export const initialLanguage = detectInitialLanguage();

export function isRtlLanguage(lang) {
  return String(lang || '').toLowerCase() === 'ar';
}

export function applyDocumentDirection(lang) {
  try {
    const docEl = document?.documentElement;
    if (!docEl) return;

    const l = String(lang || defaultLanguage);
    docEl.setAttribute('lang', l);
    docEl.setAttribute('dir', isRtlLanguage(l) ? 'rtl' : 'ltr');
  } catch {
    // ignore
  }
}

export function setStoredLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, String(lang));
  } catch {
    // ignore
  }
}

export function initI18n() {
  if (i18n.isInitialized) return i18n;

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: defaultLanguage,
      supportedLngs: supportedLanguages,
      interpolation: {
        escapeValue: false,
      },
      returnEmptyString: false,
    });

  applyDocumentDirection(i18n.language);

  return i18n;
}

export default i18n;
