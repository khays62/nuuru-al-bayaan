export const timetableKeys = {
  all: ['timetable'],
  slotsRoot: () => [...timetableKeys.all, 'slots'],
  slots: ({ gradeSectionId } = {}) => [...timetableKeys.slotsRoot(), { gradeSectionId: gradeSectionId || '' }],
};
