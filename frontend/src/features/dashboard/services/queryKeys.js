export const dashboardKeys = {
  all: ['dashboard'],
  summary: (params = {}) => [...dashboardKeys.all, 'summary', params],
};
