export const cohortsKeys = {
  all: ['cohorts'],

  listBase: () => [...cohortsKeys.all, 'list'],
  list: (params = {}) => [...cohortsKeys.listBase(), params],

  timelineBase: () => [...cohortsKeys.all, 'timeline'],
  timeline: (cohortId) => [...cohortsKeys.timelineBase(), String(cohortId || '')],
};
