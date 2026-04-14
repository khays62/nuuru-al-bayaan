import React, { useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';

import Modal from '../../../shared/components/ui/Modal.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { useI18n } from '../../../i18n/useI18n';
import { importStudents } from '../api/studentsApi.js';
import { SOMALIA_REGIONS, SOMALIA_DISTRICTS_BY_REGION } from '../../../shared/data/somaliaAdminDivisions.js';
import { STUDENT_IMPORT_TEMPLATE_FIELDS, getTemplateHeaderLabel, getTemplateHeaderLabelVariants } from '../importTemplateConfig.js';
import { resources, supportedLanguages, defaultLanguage } from '../../../i18n/resources.js';

function readTextCell(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v.text != null) return String(v.text);
  if (typeof v === 'object' && v.richText) {
    try {
      return String(v.richText.map((x) => x?.text || '').join(''));
    } catch {
      return '';
    }
  }
  return String(v);
}

function normalizeHeader(s) {
  return String(s || '').trim().toLowerCase();
}

function normalizeLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/-/g, '-')
    .trim();
}

function findRegionId(value) {
  const key = normalizeLookupKey(value);
  if (!key) return '';
  const byId = SOMALIA_REGIONS.find((r) => normalizeLookupKey(r.id) === key);
  if (byId) return byId.id;
  const byLabel = SOMALIA_REGIONS.find((r) => (
    normalizeLookupKey(r.label.en) === key
    || normalizeLookupKey(r.label.so) === key
    || normalizeLookupKey(r.label.ar) === key
  ));
  return byLabel ? byLabel.id : '';
}

function findDistrictId(regionId, value) {
  const key = normalizeLookupKey(value);
  if (!key) return '';
  const rows = Array.isArray(SOMALIA_DISTRICTS_BY_REGION[String(regionId || '')])
    ? SOMALIA_DISTRICTS_BY_REGION[String(regionId || '')]
    : [];
  const byId = rows.find((d) => normalizeLookupKey(d.id) === key);
  if (byId) return byId.id;
  const byLabel = rows.find((d) => (
    normalizeLookupKey(d.label.en) === key
    || normalizeLookupKey(d.label.so) === key
    || normalizeLookupKey(d.label.ar) === key
  ));
  return byLabel ? byLabel.id : '';
}

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

const collectTranslations = (key, fallback) => {
  const out = [];
  supportedLanguages.forEach((lang) => {
    const value = resolveTranslation(lang, key, '');
    if (value) out.push(value);
  });
  if (fallback) out.push(fallback);
  return out;
};

const normalizeToken = (value) => normalizeLookupKey(value);

const buildTokenSet = (values) => {
  const set = new Set();
  (values || []).forEach((v) => {
    const token = normalizeToken(v);
    if (token) set.add(token);
  });
  return set;
};

const YES_TOKENS = buildTokenSet([
  ...collectTranslations('common.yes', 'Yes'),
  'true',
  '1',
  'y',
]);
const NO_TOKENS = buildTokenSet([
  ...collectTranslations('common.no', 'No'),
  'false',
  '0',
  'n',
]);

const MALE_TOKENS = buildTokenSet([
  ...collectTranslations('students.form.male', 'Male'),
  'm',
]);
const FEMALE_TOKENS = buildTokenSet([
  ...collectTranslations('students.form.female', 'Female'),
  'f',
]);

const FATHER_TOKENS = buildTokenSet(collectTranslations('students.form.relationships.father', 'Father'));
const MOTHER_TOKENS = buildTokenSet(collectTranslations('students.form.relationships.mother', 'Mother'));
const GUARDIAN_TOKENS = buildTokenSet(collectTranslations('students.form.relationships.guardian', 'Guardian'));
const OTHER_TOKENS = buildTokenSet(collectTranslations('students.form.relationships.other', 'Other'));

const SOMALI_TOKENS = buildTokenSet(collectTranslations('students.address.nationality.somali', 'Somali'));
const NOT_SOMALI_TOKENS = buildTokenSet([
  ...collectTranslations('students.address.nationality.notSomali', 'Not Somali'),
  'not-somali',
  'notsomali',
]);

function normalizeYesNo(value) {
  const token = normalizeToken(value);
  if (!token) return '';
  if (YES_TOKENS.has(token)) return 'Yes';
  if (NO_TOKENS.has(token)) return 'No';
  return '';
}

function normalizeNationality(value) {
  const token = normalizeToken(value);
  if (!token) return '';
  if (SOMALI_TOKENS.has(token)) return 'Somali';
  if (NOT_SOMALI_TOKENS.has(token)) return 'Not Somali';
  return '';
}

function normalizeGender(value) {
  const token = normalizeToken(value);
  if (!token) return '';
  if (MALE_TOKENS.has(token)) return 'Male';
  if (FEMALE_TOKENS.has(token)) return 'Female';
  return '';
}

function normalizeGuardianRelationship(value) {
  const token = normalizeToken(value);
  if (!token) return '';
  if (FATHER_TOKENS.has(token)) return 'Father';
  if (MOTHER_TOKENS.has(token)) return 'Mother';
  if (GUARDIAN_TOKENS.has(token)) return 'Guardian';
  if (OTHER_TOKENS.has(token)) return 'Other';
  return '';
}

function buildErrorDisplay({ err, labelByField }) {
  const msg = String(err?.message || 'Error');
  const row = Number(err?.row || 0);
  const field = String(err?.field || '').trim();
  const label = field ? (labelByField.get(field) || field) : '';
  const parts = [];
  if (row) parts.push(`Row ${row}`);
  if (label) parts.push(label);
  const context = parts.length ? ` - ${parts.join(' | ')}` : '';
  return `${msg}${context}`;
}

function throwTemplateError(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

async function parseWorkbook(file) {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('Students') || wb.worksheets[0];
  if (!ws) throwTemplateError('students.import.errors.noWorksheetFound', 'No worksheet found');

  const headerRow = ws.getRow(1);
  const colCount = headerRow.cellCount || 0;
  const headers = [];
  for (let c = 1; c <= colCount; c += 1) {
    headers.push(readTextCell(headerRow.getCell(c).value));
  }

  const keyByHeader = new Map();
  STUDENT_IMPORT_TEMPLATE_FIELDS.forEach((h) => {
    const variants = getTemplateHeaderLabelVariants(h);
    variants.forEach((label) => {
      keyByHeader.set(normalizeHeader(label), h.key);
    });
  });
  const indexByKey = new Map();
  headers.forEach((h, idx) => {
    const key = keyByHeader.get(normalizeHeader(h));
    if (key) indexByKey.set(key, idx + 1);
  });

  const missing = STUDENT_IMPORT_TEMPLATE_FIELDS.filter((h) => h.required && !indexByKey.has(h.key));
  if (missing.length) {
    throwTemplateError('students.import.errors.missingColumns', 'Template is missing required columns');
  }

  const rows = [];
  for (let r = 2; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);

    const values = {};
    let hasAny = false;
    STUDENT_IMPORT_TEMPLATE_FIELDS.forEach((h) => {
      const col = indexByKey.get(h.key);
      const raw = col ? readTextCell(row.getCell(col).value) : '';
      const trimmed = String(raw || '').trim();
      if (trimmed) hasAny = true;
      values[h.key] = trimmed;
    });

    if (!hasAny) continue;

    const regionId = findRegionId(values.residenceRegionId);
    const districtId = findDistrictId(regionId, values.residenceDistrictId);

    rows.push({
      excelRow: r,
      fullName: values.fullName,
      motherName: values.motherName,
      gender: normalizeGender(values.gender) || values.gender,
      dob: values.dob,
      birthPlace: values.birthPlace,
      emisNumber: values.emisNumber,
      guardianName: values.guardianName,
      guardianRelationship: normalizeGuardianRelationship(values.guardianRelationship) || values.guardianRelationship,
      guardianPhone1: values.guardianPhone1,
      guardianPhone2: values.guardianPhone2,
      guardianEmail: values.guardianEmail,
      studentPhone: values.studentPhone,
      studentEmail: values.studentEmail,
      admissionDate: values.admissionDate,
      isSomali: normalizeNationality(values.isSomali) || values.isSomali,
      residenceRegionId: regionId || values.residenceRegionId,
      residenceDistrictId: districtId || values.residenceDistrictId,
      residenceNeighborhood: values.residenceNeighborhood,
      transferIsTransfer: normalizeYesNo(values.transferIsTransfer) || values.transferIsTransfer,
      transferPreviousSchoolName: values.transferPreviousSchoolName,
      transferReason: values.transferReason,
      medicalAllergies: normalizeYesNo(values.medicalAllergies) || values.medicalAllergies,
      medicalConditions: normalizeYesNo(values.medicalConditions) || values.medicalConditions,
      bloodGroup: values.bloodGroup,
      disabilityFlags: normalizeYesNo(values.disabilityFlags) || values.disabilityFlags,
      idType: values.idType,
      idNumber: values.idNumber,
      idIssuedBy: values.idIssuedBy,
      idExpiresAt: values.idExpiresAt,
      notes: values.notes,
      studentPhoto: values.studentPhoto,
    });
  }

  const wsMeta = wb.getWorksheet('_meta');
  const meta = {};
  if (wsMeta) {
    for (let r = 1; r <= wsMeta.rowCount; r += 1) {
      const row = wsMeta.getRow(r);
      const k = readTextCell(row.getCell(1).value).trim();
      const v = readTextCell(row.getCell(2).value).trim();
      if (k) meta[k] = v;
    }
  }

  return { meta, rows, headers };
}

export default function StudentImportExcelModal({
  isOpen,
  onClose,
  canInput,
  importParams,
  onImported,
}) {
  const { t, lang } = useI18n();

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [validated, setValidated] = useState(null);

  const labelByField = useMemo(() => new Map(
    STUDENT_IMPORT_TEMPLATE_FIELDS.map((h) => [h.key, getTemplateHeaderLabel(h, lang)])
  ), [lang]);

  const resetState = () => {
    setFile(null);
    setBusy(false);
    setValidated(null);
  };

  const close = () => {
    resetState();
    onClose?.();
  };

  const runValidate = async () => {
    if (!canInput) {
      toast.error(t('students.table.permissions.noAdd'));
      return;
    }
    if (!file) {
      toast.error(t('students.import.errors.pickFile'));
      return;
    }
    setBusy(true);
    try {
      const parsed = await parseWorkbook(file);
      const meta = parsed.meta || {};
      const mismatch = [];
      const check = (k, expected) => {
        const got = String(meta[k] || '').trim();
        if (got && expected && got !== expected) mismatch.push(k);
      };
      check('academicYearId', String(importParams.academicYearId || ''));
      check('gradeSectionId', String(importParams.gradeSectionId || ''));
      check('cohortId', String(importParams.cohortId || ''));
      if (mismatch.length) {
        toast.error(t('students.import.errors.mismatch'));
        return;
      }

      const payload = {
        ...importParams,
        dryRun: true,
        rows: parsed.rows,
      };

      const res = await importStudents(payload);
      if (!res.ok) {
        const msg = res?.data?.code
          ? t(res.data.code, res.data.params || {})
          : (res?.data?.message || t('common.error'));
        const errs = Array.isArray(res?.data?.errors) ? res.data.errors : [];
        const decorated = errs.map((e) => ({
          ...e,
          message: e?.code ? t(e.code, e.params || {}) : String(e?.message || ''),
          display: buildErrorDisplay({ err: { ...e, message: e?.code ? t(e.code, e.params || {}) : String(e?.message || '') }, labelByField }),
        }));
        setValidated({ ok: false, message: msg, errors: decorated, summary: null });
        toast.error(msg);
        return;
      }

      const okMsg = res?.data?.code
        ? t(res.data.code, res.data.params || {})
        : (res?.data?.message || t('students.import.toasts.validated'));
      setValidated({ ok: true, message: okMsg, errors: [], summary: res?.data?.summary || null });
      toast.success(t('students.import.toasts.validated'));
    } catch (e) {
      const msg = e?.code ? t(e.code, e.params || {}) : (e?.message || t('common.error'));
      setValidated({ ok: false, message: msg, errors: [], summary: null });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!validated?.ok) {
      toast.error(t('students.import.errors.validateFirst'));
      return;
    }
    if (!file) return;

    setBusy(true);
    try {
      const parsed = await parseWorkbook(file);
      const payload = {
        ...importParams,
        dryRun: false,
        rows: parsed.rows,
      };
      const res = await importStudents(payload);
      if (!res.ok) {
        const msg = res?.data?.code
          ? t(res.data.code, res.data.params || {})
          : (res?.data?.message || t('common.error'));
        toast.error(msg);
        return;
      }
      toast.success(t('students.import.toasts.imported'));
      onImported?.();
      close();
    } finally {
      setBusy(false);
    }
  };

  const errorPreview = useMemo(() => {
    const errs = Array.isArray(validated?.errors) ? validated.errors : [];
    return errs;
  }, [validated?.errors]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={t('students.import.title')}
      panelClassName="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-(--nb-color-muted)">
            {t('students.import.help')}
          </div>

          <div>
            <div className="text-xs font-semibold text-(--nb-color-muted) mb-1">
              {t('students.import.labels.file')}
            </div>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setValidated(null);
              }}
              className="w-full text-sm"
            />
          </div>
        </div>

        {validated ? (
          <div className={`rounded-md border p-3 ${validated.ok ? 'border-(--nb-color-border) bg-(--nb-color-bg)' : 'border-red-300 bg-red-50'}`}>
            <div className="text-sm font-semibold text-(--nb-color-text)">{validated.message}</div>
            {validated.summary ? (
              <div className="text-xs text-(--nb-color-muted) mt-1">
                {t('students.import.summary', validated.summary)}
              </div>
            ) : null}
            {!validated.ok && errorPreview.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-red-700 max-h-40 overflow-auto">
                {errorPreview.map((e, idx) => (
                  <li key={idx}>{e.display || e.message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <ActionButton variant="neutral" onClick={close} disabled={busy}>
            {t('common.actions.cancel')}
          </ActionButton>
          <ActionButton variant="outline" onClick={runValidate} disabled={busy || !file}>
            {t('students.import.actions.validate')}
          </ActionButton>
          <ActionButton variant="brand" onClick={runImport} disabled={busy || !validated?.ok}>
            {t('students.import.actions.import')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}
