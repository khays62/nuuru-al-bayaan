import React from 'react';
import i18n, { initialLanguage, isRtlLanguage } from './i18n';
import { I18nContext } from './I18nContext';

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
