import { ZodError } from 'zod';

const isProd = () => process.env.NODE_ENV === 'production';

export const validate = (schemas = {}) => {
  const { body, query, params } = schemas;

  const replaceObjectInPlace = (target, source) => {
    if (!target || typeof target !== 'object') return;
    const sourceKeys = source && typeof source === 'object' ? Object.keys(source) : [];

    for (const key of Object.keys(target)) {
      if (!sourceKeys.includes(key)) {
        delete target[key];
      }
    }

    if (source && typeof source === 'object') {
      for (const [key, value] of Object.entries(source)) {
        target[key] = value;
      }
    }
  };

  return (req, res, next) => {
    try {
      req.validated = req.validated || {};

      if (body) {
        const parsedBody = body.parse(req.body);
        req.body = parsedBody;
        req.validated.body = parsedBody;
      }

      if (query) {
        const parsedQuery = query.parse(req.query);
        replaceObjectInPlace(req.query, parsedQuery);
        req.validated.query = parsedQuery;
      }

      if (params) {
        const parsedParams = params.parse(req.params);
        replaceObjectInPlace(req.params, parsedParams);
        req.validated.params = parsedParams;
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const payload = {
          success: false,
          message: 'Validation error',
        };
        if (!isProd()) {
          payload.issues = err.issues;
        }
        return res.status(400).json(payload);
      }
      return next(err);
    }
  };
};
