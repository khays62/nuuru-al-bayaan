import React, { useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';

import Modal from '../../../shared/components/ui/Modal.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { importExamScores } from '../api/exams.js';

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

function toExcelColLetters(colNumber) {
  let n = Number(colNumber);
  if (!Number.isFinite(n) || n <= 0) return '';
  let s = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildErrorDisplay({ err, index }) {
  const rawMsg = String(err?.message || 'Error');
  const sid = err?.studentId ? String(err.studentId) : '';
  const examId = err?.examId ? String(err.examId) : '';

  const student = sid ? index?.studentsById?.get(sid) : null;
  const col = examId ? index?.colsByExamId?.get(examId) : null;
  const header = examId ? index?.headersByExamId?.get(examId) : '';

  const cell = (student?.excelRow && col?.col)
    ? `${toExcelColLetters(col.col)}${student.excelRow}`
    : '';

  const value = (student && examId && student.values && Object.prototype.hasOwnProperty.call(student.values, examId))
    ? student.values[examId]
    : undefined;

  const studentLabel = student
    ? `${String(student.fullName || '').trim()}${student.studentCode ? ` (${String(student.studentCode).trim()})` : ''}`.trim()
    : '';

  const parts = [];
  if (cell) parts.push(`Cell ${cell}`);
  if (header) parts.push(String(header).trim());
  if (value !== undefined && value !== '' && value !== null) parts.push(`Value: ${String(value)}`);
  if (studentLabel) parts.push(`Student: ${studentLabel}`);
  const context = parts.length ? ` — ${parts.join(' | ')}` : '';
  return `${rawMsg}${context}`;
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

  const wsScores = wb.getWorksheet('Scores') || wb.worksheets[0];
  if (!wsScores) throwTemplateError('exams.management.import.errors.noWorksheetFound', 'No worksheet found');

  const headerRow = wsScores.getRow(1);
  const idsRow = wsScores.getRow(2);

  // Expect a hidden first column for mongo studentId.
  const headers = [];
  const examIds = [];
  const colCount = Math.max(headerRow.cellCount || 0, idsRow.cellCount || 0);

  for (let c = 1; c <= colCount; c += 1) {
    const h = readTextCell(headerRow.getCell(c).value);
    const id = readTextCell(idsRow.getCell(c).value);
    headers.push(h);
    examIds.push(id);
  }

  const idxStudentMongo = headers.findIndex((h) => {
    const n = normalizeHeader(h);
    return n.includes('mongo') && n.includes('id') && (n.includes('student') || n.includes('mongo'));
  });
  const idxStudentCode = headers.findIndex((h) => normalizeHeader(h) === 'student id' || normalizeHeader(h) === 'student code');
  const idxStudentName = headers.findIndex((h) => normalizeHeader(h) === 'student name' || normalizeHeader(h) === 'name');

  if (idxStudentMongo < 0) throwTemplateError('exams.management.import.errors.missingStudentMongoIdCol', 'Template is missing hidden Student Mongo ID column');
  if (idxStudentCode < 0) throwTemplateError('exams.management.import.errors.missingStudentIdCol', 'Template is missing Student ID column');
  if (idxStudentName < 0) throwTemplateError('exams.management.import.errors.missingStudentNameCol', 'Template is missing Student Name column');

  const examColIndexes = [];
  for (let c = 1; c <= colCount; c += 1) {
    const eid = String(examIds[c - 1] || '').trim();
    if (!eid) continue;
    examColIndexes.push({ col: c, examId: eid });
  }
  if (examColIndexes.length === 0) throwTemplateError('exams.management.import.errors.noExamColumns', 'Template has no exam columns');

  const rows = [];
  for (let r = 3; r <= wsScores.rowCount; r += 1) {
    const row = wsScores.getRow(r);
    const studentId = readTextCell(row.getCell(idxStudentMongo + 1).value).trim();
    const studentCode = readTextCell(row.getCell(idxStudentCode + 1).value).trim();
    const fullName = readTextCell(row.getCell(idxStudentName + 1).value).trim();
    if (!studentId && !studentCode && !fullName) continue; // ignore fully empty trailing rows

    const values = {};
    for (const { col, examId } of examColIndexes) {
      const cell = row.getCell(col);
      const v = cell.value;
      if (v == null || v === '') {
        values[examId] = '';
        continue;
      }
      if (typeof v === 'number') {
        values[examId] = v;
      } else {
        const s = readTextCell(v).trim();
        values[examId] = s;
      }
    }

    rows.push({ studentId, studentCode, fullName, values, excelRow: r });
  }

  // Optional meta sheet
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

  return {
    meta,
    headers,
    rows,
    examCols: examColIndexes,
    examIds: examColIndexes.map((x) => x.examId)
  };
}

export default function ExamScoresExcelImportModal({
  isOpen,
  onClose,
  canInput,
  gridParams,
  onImported,
}) {
  const { t } = useI18n();

  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge');
  const [busy, setBusy] = useState(false);
  const [validated, setValidated] = useState(null);

  const modeOptions = useMemo(() => ([
    { value: 'merge', label: t('exams.management.import.modes.merge') },
    { value: 'skip', label: t('exams.management.import.modes.skip') },
    { value: 'overwrite', label: t('exams.management.import.modes.overwrite') },
  ]), [t]);

  const resetState = () => {
    setFile(null);
    setMode('merge');
    setBusy(false);
    setValidated(null);
  };

  const close = () => {
    resetState();
    onClose?.();
  };

  const runValidate = async () => {
    if (!canInput) {
      toast.error(t('exams.management.errors.noPermissionInputScores'));
      return;
    }
    if (!file) {
      toast.error(t('exams.management.import.errors.pickFile'));
      return;
    }
    setBusy(true);
    try {
      const parsed = await parseWorkbook(file);

      const index = {
        colsByExamId: new Map((parsed.examCols || []).map((c) => [String(c.examId), { col: Number(c.col) }])),
        headersByExamId: new Map((parsed.examCols || []).map((c) => [String(c.examId), String(parsed.headers?.[Number(c.col) - 1] || '')])),
        studentsById: new Map((parsed.rows || []).map((r) => [String(r.studentId || ''), {
          excelRow: Number(r.excelRow || 0),
          studentCode: String(r.studentCode || ''),
          fullName: String(r.fullName || ''),
          values: r.values || {},
        }]).filter(([k]) => Boolean(k))),
      };

      // If template meta is present, ensure it matches the current selection (simple guard).
      const meta = parsed.meta || {};
      const mismatch = [];
      const check = (k, expected) => {
        const got = String(meta[k] || '').trim();
        if (got && expected && got !== expected) mismatch.push(k);
      };
      check('academicYearId', String(gridParams.academicYearId || ''));
      check('gradeSectionId', String(gridParams.gradeSectionId || ''));
      check('subjectId', String(gridParams.subjectId || ''));
      check('templateVersion', String(gridParams.templateVersion || ''));
      check('enrollmentStatus', String(gridParams.enrollmentStatus || ''));
      check('cohortId', String(gridParams.cohortId || ''));
      if (mismatch.length) {
        toast.error(t('exams.management.import.errors.mismatch'));
        return;
      }

      const payload = {
        ...gridParams,
        mode,
        dryRun: true,
        rows: parsed.rows,
      };

      const res = await importExamScores(payload);
      if (!res.ok) {
        const msg = res?.data?.code
          ? t(res.data.code, res.data.params || {})
          : (res?.data?.message || t('common.error'));
        const errs = Array.isArray(res?.data?.errors) ? res.data.errors : [];
        const decorated = errs.map((e) => ({
          ...e,
          message: e?.code ? t(e.code, e.params || {}) : String(e?.message || ''),
          display: buildErrorDisplay({
            err: { ...e, message: e?.code ? t(e.code, e.params || {}) : String(e?.message || '') },
            index,
          }),
        }));
        setValidated({ ok: false, message: msg, errors: decorated, summary: null });
        toast.error(msg);
        return;
      }

      const okMsg = res?.data?.code
        ? t(res.data.code, res.data.params || {})
        : (res?.data?.message || t('exams.management.import.toasts.validated'));
      setValidated({ ok: true, message: okMsg, errors: [], summary: res?.data?.summary || null });
      toast.success(t('exams.management.import.toasts.validated'));
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
      toast.error(t('exams.management.import.errors.validateFirst'));
      return;
    }
    if (!file) return;

    setBusy(true);
    try {
      const parsed = await parseWorkbook(file);
      const payload = {
        ...gridParams,
        mode,
        dryRun: false,
        rows: parsed.rows,
      };
      const res = await importExamScores(payload);
      if (!res.ok) {
        const msg = res?.data?.code
          ? t(res.data.code, res.data.params || {})
          : (res?.data?.message || t('common.error'));
        toast.error(msg);
        return;
      }
      toast.success(t('exams.management.import.toasts.imported'));
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
      title={t('exams.management.import.title')}
      panelClassName="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-(--nb-color-muted)">
            {t('exams.management.import.help')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <div className="text-xs font-semibold text-(--nb-color-muted) mb-1">
                {t('exams.management.import.labels.mode')}
              </div>
              <DropdownSelect value={mode} onChange={setMode} options={modeOptions} />
            </div>

            <div>
              <div className="text-xs font-semibold text-(--nb-color-muted) mb-1">
                {t('exams.management.import.labels.file')}
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
        </div>

        {validated ? (
          <div className={`rounded-md border p-3 ${validated.ok ? 'border-(--nb-color-border) bg-(--nb-color-bg)' : 'border-red-300 bg-red-50'}`}>
            <div className="text-sm font-semibold text-(--nb-color-text)">{validated.message}</div>
            {validated.summary ? (
              <div className="text-xs text-(--nb-color-muted) mt-1">
                {t('exams.management.import.summary', {
                  students: validated.summary.students,
                  columns: validated.summary.columns,
                  upserts: validated.summary.upserts,
                  deletes: validated.summary.deletes,
                })}
              </div>
            ) : null}
            {errorPreview.length ? (
              <div className="mt-2">
                <div className="text-xs font-semibold text-red-700">{t('common.labels.errors')}</div>
                <ul className="text-xs mt-1 space-y-1 max-h-44 overflow-auto pr-1">
                  {errorPreview.map((e, idx) => (
                    <li key={idx} className="text-red-700">
                      {String(e?.display || e?.message || 'Error')}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <ActionButton variant="brand" onClick={close} disabled={busy}>
            {t('common.actions.cancel')}
          </ActionButton>
          <ActionButton variant="brand" onClick={runValidate} disabled={busy || !file}>
            {busy ? t('common.loading') : t('exams.management.import.actions.validate')}
          </ActionButton>
          <ActionButton variant="brand" onClick={runImport} disabled={busy || !validated?.ok}>
            {busy ? t('common.saving') : t('exams.management.import.actions.import')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}
