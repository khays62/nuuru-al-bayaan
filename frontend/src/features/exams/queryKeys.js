import { makeQueryKeys, qkStr } from '../../shared/queryKeys/makeQueryKeys';

const exams = makeQueryKeys('exams');

export const examKeys = {
  all: exams.base,

  templateVersions: () => exams.key('templateVersions'),
  templateDetailBase: exams.key('templateDetail'),
  templateDetail: (templateVersion) => exams.key('templateDetail', qkStr(templateVersion || '')),
};
