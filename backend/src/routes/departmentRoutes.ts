import { Router } from 'express';
import { createDepartment, getDepartment, listDepartments, updateDepartment, deleteDepartment } from '../controllers/departmentController';
import { validate } from '../middlewares/validate';
import { createDepartmentSchema, updateDepartmentSchema, departmentIdParamSchema, listDepartmentsSchema } from '../validators/departmentValidators';
import { requireAuth, requireRole, requirePermission } from '../middlewares/auth';

const router = Router();

router.post('/', requireAuth, requirePermission(['DEPARTMENT_CREATE']), validate(createDepartmentSchema), createDepartment as any);
router.get('/', requireAuth, requirePermission(['DEPARTMENT_READ']), validate(listDepartmentsSchema), listDepartments as any);
router.get('/:id', requireAuth, requirePermission(['DEPARTMENT_READ']), validate(departmentIdParamSchema), getDepartment as any);
router.put('/:id', requireAuth, requirePermission(['DEPARTMENT_UPDATE']), validate(updateDepartmentSchema), updateDepartment as any);
router.delete('/:id', requireAuth, requireRole(['HEAD_OF_HR']), validate(departmentIdParamSchema), deleteDepartment as any);

export default router;
