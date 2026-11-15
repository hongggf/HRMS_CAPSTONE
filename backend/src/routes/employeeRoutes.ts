import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import multer from 'multer';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  getMyEmployeeProfile,
  getEmployeeDashboardSummary,
  provisionAccount,
  uploadDocument,
  completeOnboarding,
  activateEmployee,
  updateEmployeePosition,
  getGeneratedEmployeeId,
} from '../controllers/employeeController';
import { getMyPayslips } from '../controllers/payrollController';
import { getMyLearning, submitEmployeeEvaluation } from '../controllers/lndController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

// Self-service endpoints for authenticated employee (identity resolved strictly from token)
router.get('/me', getMyEmployeeProfile);
router.get('/me/dashboard', getEmployeeDashboardSummary);
router.get('/me/payslips', getMyPayslips);
router.get('/me/learning', getMyLearning);
router.post('/me/trainings/:id/evaluation', submitEmployeeEvaluation);

router.post('/', requirePermission(['EMPLOYEE_CREATE']), createEmployee);
router.get('/', requirePermission(['EMPLOYEE_READ']), getEmployees);
router.get('/generate-id', requirePermission(['EMPLOYEE_READ']), getGeneratedEmployeeId);

// Account Provisioning & Invitation
router.post('/:id/invite', requirePermission(['EMPLOYEE_ACTIVATE']), provisionAccount);
router.post('/:id/provision-account', requirePermission(['EMPLOYEE_ACTIVATE']), provisionAccount);

router.get('/:id', requirePermission(['EMPLOYEE_READ']), getEmployeeById);

router.post('/:id/documents', requirePermission(['DOCUMENT_UPLOAD']), upload.single('file'), uploadDocument);

router.post('/:id/onboarding/complete', requirePermission(['EMPLOYEE_UPDATE']), completeOnboarding);
router.post('/:id/activate', requirePermission(['EMPLOYEE_ACTIVATE']), activateEmployee);
router.put('/:id/position', requirePermission(['EMPLOYEE_UPDATE']), updateEmployeePosition);

export default router;
