import { resources, supportedLanguages, defaultLanguage } from '../../i18n/resources.js';

const getNestedValue = (obj, keyPath) => {
  if (!obj || !keyPath) return undefined;
  return String(keyPath)
    .split('.')
    .reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
};

const resolveTranslation = (lang, key, fallback) => {
  const l = String(lang || defaultLanguage);
  const dict = resources?.[l]?.translation || {};
  const value = getNestedValue(dict, key);
  if (value != null && value !== '') return value;
  const fallbackDict = resources?.[defaultLanguage]?.translation || {};
  const fallbackValue = getNestedValue(fallbackDict, key);
  if (fallbackValue != null && fallbackValue !== '') return fallbackValue;
  return fallback || '';
};

const buildHint = (field, lang) => {
  if (!field?.hint) return '';
  if (field.hint === 'yesNo') {
    const yes = resolveTranslation(lang, 'common.yes', 'Yes');
    const no = resolveTranslation(lang, 'common.no', 'No');
    return `${yes}/${no}`;
  }
  if (field.hint === 'idOrName') {
    return resolveTranslation(lang, 'students.import.hints.idOrName', 'ID or Name');
  }
  if (field.hint === 'nationality') {
    const somali = resolveTranslation(lang, 'students.address.nationality.somali', 'Somali');
    const notSomali = resolveTranslation(lang, 'students.address.nationality.notSomali', 'Not Somali');
    return `${somali}/${notSomali}`;
  }
  return '';
};

const buildHeaderLabel = (field, lang, { includeHint = true, includeOptional = true } = {}) => {
  const base = resolveTranslation(lang, field.labelKey, field.fallbackLabel || field.fallback || '');
  const hint = includeHint ? buildHint(field, lang) : '';
  const optional = includeOptional && !field.required
    ? resolveTranslation(lang, 'common.optional', 'Optional')
    : '';

  let label = base;
  if (hint) label = `${label} (${hint})`;
  if (optional) label = `${label} (${optional})`;
  return label;
};

export const STUDENT_IMPORT_TEMPLATE_FIELDS = [
  // Personal
  { key: 'fullName', labelKey: 'students.form.fullName', fallbackLabel: 'Full Name', required: true },
  { key: 'motherName', labelKey: 'students.form.motherName', fallbackLabel: 'Mother Name', required: true },
  { key: 'gender', labelKey: 'students.form.gender', fallbackLabel: 'Gender', required: true },
  { key: 'dob', labelKey: 'students.form.dob', fallbackLabel: 'Date of Birth', required: true },
  { key: 'birthPlace', labelKey: 'students.form.birthPlace', fallbackLabel: 'Birth Place', required: true },
  { key: 'emisNumber', labelKey: 'students.form.emisNumber', fallbackLabel: 'EMIS Number', required: false },
  { key: 'admissionDate', labelKey: 'students.form.admissionDate', fallbackLabel: 'Admission Date', required: true },

  // Contacts
  { key: 'guardianName', labelKey: 'students.form.guardianName', fallbackLabel: 'Guardian Name', required: true },
  { key: 'guardianRelationship', labelKey: 'students.form.guardianRelationship', fallbackLabel: 'Guardian Relationship', required: true },
  { key: 'guardianPhone1', labelKey: 'students.form.guardianPhone1', fallbackLabel: 'Guardian Phone (Primary)', required: true },
  { key: 'guardianPhone2', labelKey: 'students.form.guardianPhone2', fallbackLabel: 'Guardian Phone (Secondary)', required: false },
  { key: 'guardianEmail', labelKey: 'students.form.guardianEmail', fallbackLabel: 'Guardian Email', required: false },
  { key: 'studentPhone', labelKey: 'students.form.studentPhone', fallbackLabel: 'Student Phone', required: false },
  { key: 'studentEmail', labelKey: 'students.form.studentEmail', fallbackLabel: 'Student Email', required: false },

  // Residence
  { key: 'isSomali', labelKey: 'students.address.nationality.label', fallbackLabel: 'Nationality', required: false, hint: 'nationality' },
  { key: 'residenceRegionId', labelKey: 'students.import.fields.residenceRegion', fallbackLabel: 'Residence Region', required: true, hint: 'idOrName' },
  { key: 'residenceDistrictId', labelKey: 'students.import.fields.residenceDistrict', fallbackLabel: 'Residence District', required: true, hint: 'idOrName' },
  { key: 'residenceNeighborhood', labelKey: 'students.import.fields.residenceNeighborhood', fallbackLabel: 'Residence Neighborhood', required: true },

  // Transfer
  { key: 'transferIsTransfer', labelKey: 'students.form.transfer.isTransfer', fallbackLabel: 'Transfer Student', required: false, hint: 'yesNo' },
  { key: 'transferPreviousSchoolName', labelKey: 'students.form.transfer.previousSchoolName', fallbackLabel: 'Previous School Name', required: false },
  { key: 'transferReason', labelKey: 'students.form.transfer.transferReason', fallbackLabel: 'Transfer Reason', required: false },

  // Medical
  { key: 'medicalAllergies', labelKey: 'students.form.medical.allergies', fallbackLabel: 'Allergies', required: false, hint: 'yesNo' },
  { key: 'medicalConditions', labelKey: 'students.form.medical.medicalConditions', fallbackLabel: 'Medical Conditions', required: false, hint: 'yesNo' },
  { key: 'disabilityFlags', labelKey: 'students.form.medical.disabilityFlags', fallbackLabel: 'Disability Flags', required: false, hint: 'yesNo' },
  { key: 'bloodGroup', labelKey: 'students.form.medical.bloodGroup', fallbackLabel: 'Blood Group', required: false },

  // ID Document
  { key: 'idType', labelKey: 'students.form.idDocument.idType', fallbackLabel: 'ID Type', required: false },
  { key: 'idNumber', labelKey: 'students.form.idDocument.idNumber', fallbackLabel: 'ID Number', required: false },
  { key: 'idIssuedBy', labelKey: 'students.form.idDocument.issuedBy', fallbackLabel: 'Issued By', required: false },
  { key: 'idExpiresAt', labelKey: 'students.form.idDocument.expiresAt', fallbackLabel: 'ID Expires At', required: false },

  // Notes
  { key: 'notes', labelKey: 'students.form.notes', fallbackLabel: 'Notes', required: false },

  // Student Photo (optional)
  { key: 'studentPhoto', labelKey: 'students.import.fields.studentPhotoUrl', fallbackLabel: 'Student Photo URL', required: false },
];

export const getTemplateHeaderLabel = (field, lang = defaultLanguage) => (
  buildHeaderLabel(field, lang, { includeHint: true, includeOptional: true })
);

export const getTemplateHeaderLabelVariants = (field) => {
  const labels = new Set();
  supportedLanguages.forEach((lang) => {
    labels.add(buildHeaderLabel(field, lang, { includeHint: false, includeOptional: false }));
    labels.add(buildHeaderLabel(field, lang, { includeHint: true, includeOptional: false }));
    if (!field.required) {
      labels.add(buildHeaderLabel(field, lang, { includeHint: false, includeOptional: true }));
      labels.add(buildHeaderLabel(field, lang, { includeHint: true, includeOptional: true }));
    }
  });
  return Array.from(labels).filter(Boolean);
};
