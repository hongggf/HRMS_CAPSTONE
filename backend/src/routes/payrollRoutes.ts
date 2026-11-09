import { Router } from 'express';
import { requireAuth, requirePermission, requireRole } from '../middlewares/auth';
import { 
  createPayrollPeriod, 
  calculatePayroll, 
  submitPayroll, 
  approvePayroll, 
  rejectPayroll, 
  lockPayroll, 
  getPayrollPeriods, 
  getPayrollPeriodById,
  getPayrollByPeriod,
  getPayslip,
  getMyPayslips,
  getEmployeePayslips,
  createAdjustment,
  getAllPayrolls
} from '../controllers/payrollController';

const router = Router();
router.use(requireAuth);

router.get('/periods', requirePermission(['PAYROLL_READ']), getPayrollPeriods);
router.get('/periods/:id', requirePermission(['PAYROLL_READ']), getPayrollPeriodById);
router.post('/periods', requirePermission(['PAYROLL_CREATE']), createPayrollPeriod);

// Self-service and individual payslip endpoints
router.get('/payslips/my', getMyPayslips);
router.get('/payslips/:id', getPayslip);
router.get('/employees/:employeeId/payslips', getEmployeePayslips);

router.get('/', requirePermission(['PAYROLL_READ']), getAllPayrolls);
router.get('/:id', requirePermission(['PAYROLL_READ']), getPayrollByPeriod);

// Calculation & Lifecycle workflow endpoints (supporting both /periods/:id and /:id paths)
router.post('/periods/:id/calculate', requirePermission(['PAYROLL_CREATE']), calculatePayroll);
router.post('/:id/calculate', requirePermission(['PAYROLL_CREATE']), calculatePayroll);

router.post('/periods/:id/submit', requirePermission(['PAYROLL_CREATE']), submitPayroll);
router.post('/:id/submit', requirePermission(['PAYROLL_CREATE']), submitPayroll);

router.post('/periods/:id/approve', requireRole(['HEAD_OF_HR']), approvePayroll);
router.post('/:id/approve', requireRole(['HEAD_OF_HR']), approvePayroll);

router.post('/periods/:id/reject', requireRole(['HEAD_OF_HR']), rejectPayroll);
router.post('/:id/reject', requireRole(['HEAD_OF_HR']), rejectPayroll);

router.post('/periods/:id/lock', requirePermission(['PAYROLL_LOCK']), lockPayroll);
router.post('/:id/lock', requirePermission(['PAYROLL_LOCK']), lockPayroll);

router.post('/:payrollId/adjustments', requirePermission(['PAYROLL_CREATE']), createAdjustment);

export default router;
