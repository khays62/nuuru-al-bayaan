import Payroll from '../../models/Payroll.js';

/**
 * Print payroll list
 * Query:
 * - month: YYYY-MM (optional)
 * - academicYear: AcademicYear ObjectId (optional)
 * - status: Draft|Approved|Paid (optional, default Paid)
 */
export async function printPayrollList(req, res) {
  try {
    const { month, status, academicYear } = req.query;
    const query = {};
    if (month) query.month = month;
    if (academicYear) query.academicYear = academicYear;
    query.status = status || 'Paid';

    const payrolls = await Payroll.find(query)
      .populate('staff', 'fullName username phone role status employeeType salary')
      .populate('academicYear', 'yearName')
      .populate('account', 'name type')
      .sort({ paymentDate: -1, createdAt: -1 });

    const totals = payrolls.reduce(
      (acc, p) => {
        acc.count += 1;
        acc.basicSalary += Number(p.basicSalary || 0);
        acc.netSalary += Number(p.netSalary || 0);
        return acc;
      },
      { count: 0, basicSalary: 0, netSalary: 0 }
    );

    res.json({ filters: { month: month || null, academicYear: academicYear || null, status: query.status }, totals, payrolls });
  } catch (error) {
    console.error('printPayrollList Error:', error);
    res.status(500).json({ message: error.message });
  }
}
