import { resolveLocale, t } from '../i18n/index.js';

export function i18nMiddleware() {
  return (req, res, next) => {
    req.locale = resolveLocale(req);
    req.t = (key, vars = null, fallback = '') => t(req, key, vars, fallback);
    return next();
  };
}
