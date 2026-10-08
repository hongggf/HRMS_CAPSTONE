import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  getDashboardMetrics,
  getRecruitmentReports,
  getEmployeeReports,
  getAttendanceReports,
  getPayrollReports,
  getPerformanceReports,
  getTrainingReports
} from '../controllers/reportController';

const router = Router();

router.use(requireAuth);

// We can restrict all reports to HEAD_OF_HR for simplicity or use specific roles.
// The prompt specifies "HEAD_OF_HR DASHBOARD", so at least that one is HEAD_OF_HR only.
router.get('/dashboard', requireRole(['HEAD_OF_HR']), getDashboardMetrics);

router.get('/recruitment', requireRole(['HEAD_OF_HR', 'HR_RECRUITMENT']), getRecruitmentReports);
router.get('/employees', requireRole(['HEAD_OF_HR', 'HR_ADMIN']), getEmployeeReports);
router.get('/attendance', requireRole(['HEAD_OF_HR', 'HR_ATTENDANCE']), getAttendanceReports);
router.get('/payroll', requireRole(['HEAD_OF_HR', 'HR_PAYROLL']), getPayrollReports);
router.get('/performance', requireRole(['HEAD_OF_HR', 'HR_PERFORMANCE']), getPerformanceReports);
router.get('/training', requireRole(['HEAD_OF_HR', 'HR_LND']), getTrainingReports);

export default router;
