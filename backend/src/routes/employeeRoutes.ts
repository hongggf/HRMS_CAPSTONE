import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import multer from 'multer';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  uploadDocument,
  completeOnboarding,
  activateEmployee,
  updateEmployeePosition
} from '../controllers/employeeController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.post('/', requirePermission(['EMPLOYEE_CREATE']), createEmployee);
router.get('/', requirePermission(['EMPLOYEE_READ']), getEmployees);
router.get('/:id', requirePermission(['EMPLOYEE_READ']), getEmployeeById);

router.post('/:id/documents', requirePermission(['DOCUMENT_UPLOAD']), upload.single('file'), uploadDocument);

router.post('/:id/onboarding/complete', requirePermission(['EMPLOYEE_UPDATE']), completeOnboarding);
router.post('/:id/activate', requirePermission(['EMPLOYEE_ACTIVATE']), activateEmployee);
router.put('/:id/position', requirePermission(['EMPLOYEE_UPDATE']), updateEmployeePosition);

export default router;
