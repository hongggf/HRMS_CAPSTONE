import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { 
  createCategory, 
  listCategories, 
  createTraining, 
  listTrainings, 
  createTrainingPlan, 
  assignEmployees, 
  createSession, 
  markAttendance, 
  evaluateTraining, 
  updateSkill 
} from '../controllers/lndController';

const router = Router();

router.use(requireAuth);

router.post('/categories', requirePermission(['LND_CREATE']), createCategory);
router.get('/categories', requirePermission(['LND_READ']), listCategories);

router.post('/trainings', requirePermission(['LND_CREATE']), createTraining);
router.get('/trainings', requirePermission(['LND_READ']), listTrainings);

router.post('/plans', requirePermission(['LND_CREATE']), createTrainingPlan);

router.post('/trainings/:id/assignments', requirePermission(['LND_CREATE']), assignEmployees);

router.post('/trainings/:id/sessions', requirePermission(['LND_CREATE']), createSession);

router.post('/sessions/:sessionId/attendance', requirePermission(['LND_UPDATE']), markAttendance);

router.post('/trainings/:id/evaluations', requirePermission(['LND_CREATE']), evaluateTraining);

router.post('/employees/:employeeId/skills', requirePermission(['LND_UPDATE']), updateSkill);

export default router;
