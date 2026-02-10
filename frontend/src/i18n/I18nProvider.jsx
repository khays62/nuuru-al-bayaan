/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import i18n, {
  initI18n,
  initialLanguage,
  applyDocumentDirection,
  isRtlLanguage,
  setStoredLanguage,
} from './i18n';

const I18nContext = React.createContext(null);

export function I18nProvider({ children }) {
  // Ensure i18n is initialized exactly once.
  React.useMemo(() => initI18n(), []);

  const [lang, setLangState] = React.useState(() => String(i18n.language || initialLanguage));

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
    // Keep document direction in sync even if i18n updates elsewhere.
    applyDocumentDirection(lang);
  }, [lang]);

  const value = React.useMemo(() => {
    const isRTL = isRtlLanguage(lang);
    return {
      lang,
      isRTL,
      setLang,
      t: (key, options) => i18n.t(key, options),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    return {
      lang: String(i18n.language || initialLanguage),
      isRTL: isRtlLanguage(i18n.language || initialLanguage),
      setLang: () => {},
      t: (key, options) => i18n.t(key, options),
    };
  }
  return ctx;
}
