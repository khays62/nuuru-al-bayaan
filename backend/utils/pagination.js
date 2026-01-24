// backend/utils/pagination.js
// Small helper to keep pagination parsing DRY across controllers.

function toInt(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : NaN;
}

export function parsePagination(query = {}, options = {}) {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    minPage = 1,
    minLimit = 1,
    maxLimit = 100,
  } = options || {};

  const rawPage = toInt(query?.page);
  const rawLimit = toInt(query?.limit);

  const pageNum = Math.max(Number.isFinite(rawPage) ? rawPage : defaultPage, minPage);
  const limitNum = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : defaultLimit, minLimit),
    maxLimit
  );

  const skip = (pageNum - 1) * limitNum;

  return { pageNum, limitNum, skip };
}

export function parseLimit(query = {}, options = {}) {
  const { defaultLimit = 10, minLimit = 1, maxLimit = 100 } = options || {};
  const rawLimit = toInt(query?.limit);
  const limitNum = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : defaultLimit, minLimit),
    maxLimit
  );
  return { limitNum };
}
