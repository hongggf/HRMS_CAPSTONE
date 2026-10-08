import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';
import { 
  createTrainingCategorySchema, 
  createTrainingSchema, 
  createTrainingPlanSchema,
  assignTrainingSchema,
  createTrainingSessionSchema,
  markAttendanceSchema,
  evaluateTrainingSchema,
  updateEmployeeSkillSchema
} from '../validators/lndValidator';



export const createCategory = async (req: Request, res: Response) => {
  try {
    const data = createTrainingCategorySchema.parse(req.body);
    const userId = (req as any).user!.id;

    const category = await prisma.trainingCategory.create({ data });
    await logAudit('LND_CATEGORY_CREATED', userId, { categoryId: category.id });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.trainingCategory.findMany();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createTraining = async (req: Request, res: Response) => {
  try {
    const data = createTrainingSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const training = await prisma.training.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      }
    });
    await logAudit('LND_TRAINING_CREATED', userId, { trainingId: training.id });
    res.status(201).json(training);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listTrainings = async (req: Request, res: Response) => {
  try {
    const trainings = await prisma.training.findMany({ include: { category: true } });
    res.json(trainings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createTrainingPlan = async (req: Request, res: Response) => {
  try {
    const data = createTrainingPlanSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const plan = await prisma.trainingPlan.create({
      data: {
        ...data,
        plannedDate: data.plannedDate ? new Date(data.plannedDate) : undefined,
      }
    });
    await logAudit('LND_PLAN_CREATED', userId, { planId: plan.id });
    res.status(201).json(plan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const assignEmployees = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeIds } = assignTrainingSchema.parse(req.body);
    const userId = (req as any).user!.id;
    const trainingId = parseInt(id);

    const assignments = await prisma.$transaction(
      employeeIds.map(empId => prisma.trainingAssignment.upsert({
        where: { trainingId_employeeId: { trainingId, employeeId: empId } },
        update: {},
        create: { trainingId, employeeId: empId }
      }))
    );

    await logAudit('LND_TRAINING_ASSIGNED', userId, { trainingId, count: assignments.length });
    for (const empId of employeeIds) {
      const uEmp = await prisma.employee.findUnique({ where: { id: empId } });
      if (uEmp?.userId) await notifyUser(uEmp.userId, 'Training Assigned', `You have been assigned to training ${trainingId}.`, 'INFO', 'Training', String(trainingId));
    }
    res.status(201).json(assignments);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = createTrainingSessionSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const session = await prisma.trainingSession.create({
      data: {
        trainingId: parseInt(id),
        title: data.title,
        date: new Date(data.date),
        location: data.location
      }
    });

    await logAudit('LND_SESSION_CREATED', userId, { sessionId: session.id });
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const data = markAttendanceSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const attendance = await prisma.trainingAttendance.upsert({
      where: { sessionId_employeeId: { sessionId: parseInt(sessionId), employeeId: data.employeeId } },
      update: {
        status: data.status,
        attendedAt: data.status === 'ATTENDED' ? new Date() : undefined
      },
      create: {
        sessionId: parseInt(sessionId),
        employeeId: data.employeeId,
        status: data.status,
        attendedAt: data.status === 'ATTENDED' ? new Date() : undefined
      }
    });

    await logAudit('LND_ATTENDANCE_MARKED', userId, { attendanceId: attendance.id });
    res.json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const evaluateTraining = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = evaluateTrainingSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const evalRec = await prisma.trainingEvaluation.create({
      data: {
        trainingId: parseInt(id),
        ...data
      }
    });

    await logAudit('LND_EVALUATION_SUBMITTED', userId, { evaluationId: evalRec.id });
    res.status(201).json(evalRec);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateSkill = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const data = updateEmployeeSkillSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const skill = await prisma.employeeSkill.upsert({
      where: { employeeId_skillName: { employeeId: parseInt(employeeId), skillName: data.skillName } },
      update: { level: data.level, acquiredAt: new Date() },
      create: { employeeId: parseInt(employeeId), skillName: data.skillName, level: data.level }
    });

    await logAudit('LND_SKILL_UPDATED', userId, { skillId: skill.id });
    res.json(skill);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
