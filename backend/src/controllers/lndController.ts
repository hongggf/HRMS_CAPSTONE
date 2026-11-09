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
  updateEmployeeSkillSchema,
  updateTrainingStatusSchema,
  updateTrainingPlanStatusSchema,
} from '../validators/lndValidator';

// Categories
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
    const categories = await prisma.trainingCategory.findMany({
      include: {
        _count: {
          select: { trainings: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Trainings
export const createTraining = async (req: Request, res: Response) => {
  try {
    const data = createTrainingSchema.parse(req.body);
    const userId = (req as any).user!.id;

    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
      return res.status(400).json({ error: 'End date must be on or after start date' });
    }

    const training = await prisma.training.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        category: true,
        department: true,
      },
    });
    await logAudit('LND_TRAINING_CREATED', userId, { trainingId: training.id, departmentId: training.departmentId });
    res.status(201).json(training);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listTrainings = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;
    const where: any = {};
    if (departmentId !== undefined && departmentId !== '') {
      const parsedId = parseInt(departmentId as string, 10);
      if (!isNaN(parsedId)) {
        where.OR = [
          { departmentId: parsedId },
          { departmentId: null }
        ];
      }
    }

    const trainings = await prisma.training.findMany({
      where,
      include: {
        category: true,
        department: true,
        _count: {
          select: {
            assignments: true,
            sessions: true,
            evaluations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(trainings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTrainingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const training = await prisma.training.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        category: true,
        department: true,
        plans: true,
        sessions: {
          include: {
            attendances: {
              include: {
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeId: true,
                    department: true,
                  },
                },
              },
            },
          },
          orderBy: { date: 'asc' },
        },
        assignments: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
                department: true,
                position: true,
              },
            },
          },
        },
        evaluations: {
          include: {
            evaluator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!training) return res.status(404).json({ error: 'Training course not found' });
    res.json(training);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTrainingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = updateTrainingStatusSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const existing = await prisma.training.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing) return res.status(404).json({ error: 'Training not found' });

    const training = await prisma.training.update({
      where: { id: parseInt(id, 10) },
      data: { status },
      include: {
        category: true,
        department: true,
        _count: {
          select: {
            assignments: true,
            sessions: true,
            evaluations: true,
          },
        },
      },
    });

    await logAudit('LND_TRAINING_STATUS_UPDATED', userId, { trainingId: training.id, status });
    res.json(training);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const joinTraining = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const trainingId = parseInt(id, 10);

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: { department: true }
    });

    if (!employee) {
      return res.status(400).json({ error: 'No employee record linked to your user account' });
    }

    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: {
        department: true,
        sessions: true,
        _count: { select: { assignments: true } }
      }
    });

    if (!training) {
      return res.status(404).json({ error: 'Training course not found' });
    }

    if (training.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot join a cancelled course' });
    }

    if (training.capacity && training._count.assignments >= training.capacity) {
      return res.status(400).json({ error: 'This course has reached its maximum seat capacity' });
    }

    const assignment = await prisma.trainingAssignment.upsert({
      where: {
        trainingId_employeeId: {
          trainingId,
          employeeId: employee.id
        }
      },
      update: {},
      create: {
        trainingId,
        employeeId: employee.id
      }
    });

    // Auto-register to any existing sessions for this course
    for (const session of training.sessions) {
      await prisma.trainingAttendance.upsert({
        where: {
          sessionId_employeeId: {
            sessionId: session.id,
            employeeId: employee.id
          }
        },
        update: {},
        create: {
          sessionId: session.id,
          employeeId: employee.id,
          status: 'REGISTERED'
        }
      });
    }

    await logAudit('LND_TRAINING_JOINED', userId, {
      trainingId,
      employeeId: employee.id,
      courseTitle: training.title
    });

    res.status(200).json({
      message: `Successfully joined ${training.title}`,
      assignment
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Training Plans
export const createTrainingPlan = async (req: Request, res: Response) => {
  try {
    const data = createTrainingPlanSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const plan = await prisma.trainingPlan.create({
      data: {
        ...data,
        plannedDate: data.plannedDate ? new Date(data.plannedDate) : undefined,
      },
      include: {
        training: {
          include: { category: true, department: true },
        },
      },
    });
    await logAudit('LND_PLAN_CREATED', userId, { planId: plan.id });
    res.status(201).json(plan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listTrainingPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.trainingPlan.findMany({
      include: {
        training: {
          include: { category: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTrainingPlanStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = updateTrainingPlanStatusSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const existing = await prisma.trainingPlan.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing) return res.status(404).json({ error: 'Training plan not found' });

    const plan = await prisma.trainingPlan.update({
      where: { id: parseInt(id, 10) },
      data: { status },
      include: {
        training: {
          include: { category: true, department: true },
        },
      },
    });

    await logAudit('LND_PLAN_STATUS_UPDATED', userId, { planId: plan.id, status });
    res.json(plan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Assignments
export const assignEmployees = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeIds } = assignTrainingSchema.parse(req.body);
    const userId = (req as any).user!.id;
    const trainingId = parseInt(id, 10);

    const assignments = await prisma.$transaction(
      employeeIds.map((empId) =>
        prisma.trainingAssignment.upsert({
          where: { trainingId_employeeId: { trainingId, employeeId: empId } },
          update: {},
          create: { trainingId, employeeId: empId },
        })
      )
    );

    await logAudit('LND_TRAINING_ASSIGNED', userId, { trainingId, count: assignments.length });
    for (const empId of employeeIds) {
      const uEmp = await prisma.employee.findUnique({ where: { id: empId } });
      if (uEmp?.userId) {
        await notifyUser(
          uEmp.userId,
          'Training Assigned',
          `You have been assigned to training ${trainingId}.`,
          'INFO',
          'Training',
          String(trainingId),
        );
      }
    }
    res.status(201).json(assignments);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Sessions & Attendance
export const createSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = createTrainingSessionSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const session = await prisma.trainingSession.create({
      data: {
        trainingId: parseInt(id, 10),
        title: data.title,
        date: new Date(data.date),
        location: data.location,
      },
      include: {
        attendances: true,
      },
    });

    await logAudit('LND_SESSION_CREATED', userId, { sessionId: session.id });
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listTrainingSessions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessions = await prisma.trainingSession.findMany({
      where: { trainingId: parseInt(id, 10) },
      include: {
        attendances: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const listSessionAttendance = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const sId = parseInt(sessionId, 10);
    const session = await prisma.trainingSession.findUnique({
      where: { id: sId },
      include: {
        training: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Auto-synchronize enrolled employees so they appear in the attendance roster:
    if (session.training?.assignments && session.training.assignments.length > 0) {
      await prisma.$transaction(
        session.training.assignments.map((a) =>
          prisma.trainingAttendance.upsert({
            where: {
              sessionId_employeeId: {
                sessionId: sId,
                employeeId: a.employeeId,
              },
            },
            update: {},
            create: {
              sessionId: sId,
              employeeId: a.employeeId,
              status: 'REGISTERED',
            },
          })
        )
      );
    }

    const attendances = await prisma.trainingAttendance.findMany({
      where: { sessionId: sId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
          },
        },
      },
      orderBy: { employee: { firstName: 'asc' } },
    });
    res.json(attendances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const data = markAttendanceSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const attendance = await prisma.trainingAttendance.upsert({
      where: { sessionId_employeeId: { sessionId: parseInt(sessionId, 10), employeeId: data.employeeId } },
      update: {
        status: data.status,
        attendedAt: data.status === 'ATTENDED' ? new Date() : null,
      },
      create: {
        sessionId: parseInt(sessionId, 10),
        employeeId: data.employeeId,
        status: data.status,
        attendedAt: data.status === 'ATTENDED' ? new Date() : undefined,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    await logAudit('LND_ATTENDANCE_MARKED', userId, { attendanceId: attendance.id });
    res.json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Course Evaluations
export const listEvaluations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const evaluations = await prisma.trainingEvaluation.findMany({
      where: { trainingId: parseInt(id, 10) },
      include: {
        evaluator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(evaluations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const evaluateTraining = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = evaluateTrainingSchema.parse(req.body);
    const userId = (req as any).user!.id;

    // Prevent accidental duplicate evaluation
    const existing = await prisma.trainingEvaluation.findFirst({
      where: {
        trainingId: parseInt(id, 10),
        evaluatorId: data.evaluatorId,
      },
    });
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted an evaluation for this training course' });
    }

    const evalRec = await prisma.trainingEvaluation.create({
      data: {
        trainingId: parseInt(id, 10),
        ...data,
      },
      include: {
        evaluator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    await logAudit('LND_EVALUATION_SUBMITTED', userId, { evaluationId: evalRec.id });
    res.status(201).json(evalRec);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Employee Skills Matrix
export const getEmployeeSkills = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const skills = await prisma.employeeSkill.findMany({
      where: { employeeId: parseInt(employeeId, 10) },
      orderBy: { acquiredAt: 'desc' },
    });
    res.json(skills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllSkills = async (req: Request, res: Response) => {
  try {
    const skills = await prisma.employeeSkill.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: { acquiredAt: 'desc' },
    });
    res.json(skills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSkill = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const data = updateEmployeeSkillSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const skill = await prisma.employeeSkill.upsert({
      where: { employeeId_skillName: { employeeId: parseInt(employeeId, 10), skillName: data.skillName } },
      update: { level: data.level, acquiredAt: new Date() },
      create: { employeeId: parseInt(employeeId, 10), skillName: data.skillName, level: data.level },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    await logAudit('LND_SKILL_UPDATED', userId, { skillId: skill.id });
    res.json(skill);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
