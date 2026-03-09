import React from 'react';
import i18n, {
  initI18n,
  initialLanguage,
  applyDocumentDirection,
  isRtlLanguage,
  LANGUAGE_STORAGE_KEY,
  setStoredLanguage,
} from './i18n';

import { I18nContext } from './I18nContext';
import { fixMojibake } from '../utils/fixMojibake';

export function I18nProvider({ children }) {
  React.useMemo(() => initI18n(), []);

  const [lang, setLangState] = React.useState(() => String(i18n.language || initialLanguage));

  React.useEffect(() => {
    const handleLanguageChanged = (nextLang) => {
      const resolved = String(nextLang || i18n.language || initialLanguage);
      setLangState(resolved);
      applyDocumentDirection(resolved);
    };

    const handleStorage = (event) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;
      const nextLang = String(event.newValue || initialLanguage);
      if (nextLang && nextLang !== i18n.language) {
        i18n.changeLanguage(nextLang).catch(() => {});
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    window.addEventListener('storage', handleStorage);
    handleLanguageChanged(i18n.language || initialLanguage);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setLang = React.useCallback(async (next) => {
    const l = String(next || 'en');
    setLangState(l);
    setStoredLanguage(l);
    applyDocumentDirection(l);

    try {
      await i18n.changeLanguage(l);
    } catch {
      // ignore (fallback language still works)
    }
  }, []);

  React.useEffect(() => {
    applyDocumentDirection(lang);
  }, [lang]);

  const value = React.useMemo(() => {
    const isRTL = isRtlLanguage(lang);
    return {
      lang,
      isRTL,
      setLang,
      t: (key, options) => fixMojibake(i18n.t(key, options)),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
