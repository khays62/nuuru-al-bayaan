import { describe, expect, test } from '@jest/globals';

import { getAllowedAiToolNamesForUser } from '../services/aiDbTools.js';

describe('AI tools allowlist', () => {
  test('admin includes finance + payroll tools', () => {
    const admin = { _id: '507f1f77bcf86cd799439011', role: 'admin' };
    const allowed = getAllowedAiToolNamesForUser(admin);

    expect(allowed).toContain('academic_years_list');
    expect(allowed).toContain('grade_sections_list');
    expect(allowed).toContain('subjects_list');

    expect(allowed).toContain('finance_fee_transactions_summary');
    expect(allowed).toContain('finance_accounts_balances');
    expect(allowed).toContain('finance_foundation_donations_summary');

    // Payroll is admin-only
    expect(allowed).toContain('finance_payroll_month_summary');
    expect(allowed).toContain('finance_payroll_staff_search');
    expect(allowed).toContain('finance_payroll_staff_ledger');

    // Library
    expect(allowed).toContain('library_resources_list');
    expect(allowed).toContain('library_resource_get_text');
  });

  test('staff only gets finance tools when permitted (no payroll)', () => {
    const staffNoFinance = { _id: '507f1f77bcf86cd799439012', role: 'staff', permissions: {} };
    const allowedNoFinance = getAllowedAiToolNamesForUser(staffNoFinance);

    expect(allowedNoFinance).toContain('academic_years_list');
    expect(allowedNoFinance).not.toContain('finance_fee_transactions_summary');
    expect(allowedNoFinance).not.toContain('finance_accounts_balances');
    expect(allowedNoFinance).not.toContain('finance_foundation_donations_summary');
    expect(allowedNoFinance).not.toContain('finance_payroll_month_summary');

    // Library is available for all roles
    expect(allowedNoFinance).toContain('library_resources_list');
    expect(allowedNoFinance).toContain('library_resource_get_text');

    const staffWithFinance = {
      _id: '507f1f77bcf86cd799439013',
      role: 'staff',
      permissions: {
        financeStudentReceipt: { view: true },
        financeAccountsOverview: { view: true },
        financeFoundation: { view: true },
      },
    };

    const allowedWithFinance = getAllowedAiToolNamesForUser(staffWithFinance);
    expect(allowedWithFinance).toContain('finance_fee_transactions_summary');
    expect(allowedWithFinance).toContain('finance_accounts_balances');
    expect(allowedWithFinance).toContain('finance_foundation_donations_summary');
    expect(allowedWithFinance).toContain('library_resources_list');
    expect(allowedWithFinance).toContain('library_resource_get_text');

    // Payroll remains admin-only
    expect(allowedWithFinance).not.toContain('finance_payroll_month_summary');
    expect(allowedWithFinance).not.toContain('finance_payroll_staff_search');
    expect(allowedWithFinance).not.toContain('finance_payroll_staff_ledger');

    const staffWithPayroll = {
      _id: '507f1f77bcf86cd799439016',
      role: 'staff',
      permissions: {
        financePayroll: { view: true },
      },
    };
    const allowedWithPayroll = getAllowedAiToolNamesForUser(staffWithPayroll);
    expect(allowedWithPayroll).toContain('finance_payroll_month_summary');
    expect(allowedWithPayroll).toContain('finance_payroll_staff_search');
    expect(allowedWithPayroll).toContain('finance_payroll_staff_ledger');
    expect(allowedWithPayroll).toContain('library_resources_list');
    expect(allowedWithPayroll).toContain('library_resource_get_text');
  });

  test('teacher/student do not get finance/payroll tools', () => {
    const teacher = { _id: '507f1f77bcf86cd799439014', role: 'teacher' };
    const student = { _id: '507f1f77bcf86cd799439015', role: 'student' };

    const teacherAllowed = getAllowedAiToolNamesForUser(teacher);
    const studentAllowed = getAllowedAiToolNamesForUser(student);

    for (const allowed of [teacherAllowed, studentAllowed]) {
      expect(allowed).toContain('academic_years_list');
      expect(allowed).not.toContain('finance_fee_transactions_summary');
      expect(allowed).not.toContain('finance_accounts_balances');
      expect(allowed).not.toContain('finance_payroll_month_summary');
    }

    // Student should have self fee invoices tool
    expect(studentAllowed).toContain('student_fee_invoices_self_summary');
    expect(teacherAllowed).not.toContain('student_fee_invoices_self_summary');

    // Library
    expect(studentAllowed).toContain('library_resources_list');
    expect(teacherAllowed).toContain('library_resources_list');

    expect(studentAllowed).toContain('library_resource_get_text');
    expect(teacherAllowed).toContain('library_resource_get_text');
  });
});
