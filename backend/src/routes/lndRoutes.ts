import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { 
  createCategory, 
  listCategories, 
  createTraining, 
  listTrainings,
  getTrainingById,
  updateTrainingStatus,
  joinTraining,
  createTrainingPlan,
  listTrainingPlans, 
  updateTrainingPlanStatus,
  assignEmployees, 
  createSession,
  listTrainingSessions, 
  listSessionAttendance,
  markAttendance, 
  listEvaluations,
  evaluateTraining, 
  getEmployeeSkills,
  getAllSkills,
  updateSkill 
} from '../controllers/lndController';

const router = Router();

router.use(requireAuth);

// Categories
router.post('/categories', requirePermission(['LND_CREATE']), createCategory);
router.get('/categories', requirePermission(['LND_READ']), listCategories);

// Trainings
router.post('/trainings', requirePermission(['LND_CREATE']), createTraining);
router.get('/trainings', requirePermission(['LND_READ']), listTrainings);
router.get('/trainings/:id', requirePermission(['LND_READ']), getTrainingById);
router.patch('/trainings/:id/status', requirePermission(['LND_UPDATE']), updateTrainingStatus);

// Plans
router.post('/plans', requirePermission(['LND_CREATE']), createTrainingPlan);
router.get('/plans', requirePermission(['LND_READ', 'LND_CREATE']), listTrainingPlans);
router.patch('/plans/:id/status', requirePermission(['LND_UPDATE']), updateTrainingPlanStatus);

// Assignments & Self-Enrollment
router.post('/trainings/:id/assignments', requirePermission(['LND_CREATE']), assignEmployees);
router.post('/trainings/:id/join', joinTraining);

// Sessions & Attendance
router.post('/trainings/:id/sessions', requirePermission(['LND_CREATE']), createSession);
router.get('/trainings/:id/sessions', requirePermission(['LND_READ']), listTrainingSessions);
router.get('/sessions/:sessionId/attendance', requirePermission(['LND_READ', 'LND_UPDATE']), listSessionAttendance);
router.post('/sessions/:sessionId/attendance', requirePermission(['LND_UPDATE']), markAttendance);

// Course Evaluations
router.get('/trainings/:id/evaluations', requirePermission(['LND_READ']), listEvaluations);
router.post('/trainings/:id/evaluations', requirePermission(['LND_CREATE']), evaluateTraining);

// Skills
router.get('/skills', requirePermission(['LND_READ', 'LND_UPDATE']), getAllSkills);
router.get('/employees/:employeeId/skills', requirePermission(['LND_READ', 'LND_UPDATE']), getEmployeeSkills);
router.post('/employees/:employeeId/skills', requirePermission(['LND_UPDATE']), updateSkill);

export default router;
