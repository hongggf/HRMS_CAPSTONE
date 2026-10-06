import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { 
  createPayrollPeriod, 
  calculatePayroll, 
  submitPayroll, 
  approvePayroll, 
  rejectPayroll, 
  lockPayroll, 
  getPayrollPeriods, 
  getPayrollByPeriod,
  createAdjustment,
  getAllPayrolls
} from '../controllers/payrollController';

const router = Router();
router.use(requireAuth);

router.get('/periods', requirePermission(['PAYROLL_READ']), getPayrollPeriods);
router.get('/', requirePermission(['PAYROLL_READ']), getAllPayrolls);
router.post('/periods', requirePermission(['PAYROLL_CREATE']), createPayrollPeriod);
router.get('/:id', requirePermission(['PAYROLL_READ']), getPayrollByPeriod);

router.post('/:id/calculate', requirePermission(['PAYROLL_CREATE']), calculatePayroll);
router.post('/:id/submit', requirePermission(['PAYROLL_CREATE']), submitPayroll);
router.post('/:id/approve', requirePermission(['PAYROLL_APPROVE']), approvePayroll);
router.post('/:id/reject', requirePermission(['PAYROLL_APPROVE']), rejectPayroll);
router.post('/:id/lock', requirePermission(['PAYROLL_LOCK']), lockPayroll);

router.post('/:payrollId/adjustments', requirePermission(['PAYROLL_CREATE']), createAdjustment);

export default router;
