import { Request, Response } from 'express';
import { EmployeeStatus, OnboardingStatus, ApplicationStatus, PayrollPeriodStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createEmployeeSchema, updateEmployeeSchema } from '../validators/employeeValidator';
import { storageService } from '../services/storageService';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';
import { provisionEmployeeAccount } from '../services/accountProvisioningService';



export const generateUniqueEmployeeId = async (tx?: any): Promise<string> => {
  const client = tx || prisma;
  const employees = await client.employee.findMany({
    select: { employeeId: true }
  });

  let maxNumber = 0;
  for (const emp of employees) {
    const match = emp.employeeId.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  let nextNumber = Math.max(maxNumber + 1, 1);
  let candidate = `EMP-${String(nextNumber).padStart(4, '0')}`;
  const existingSet = new Set(employees.map((e: { employeeId: string }) => e.employeeId));
  while (existingSet.has(candidate)) {
    nextNumber++;
    candidate = `EMP-${String(nextNumber).padStart(4, '0')}`;
  }
  return candidate;
};

export const getGeneratedEmployeeId = async (req: Request, res: Response) => {
  try {
    const employeeId = await generateUniqueEmployeeId();
    res.json({ success: true, data: { employeeId } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const userId = (req as any).user!.id;

    // IMPORTANT BUSINESS RULE: Only a candidate approved by HEAD_OF_HR may become an employee.
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true }
    });

    if (
      !application ||
      (application.status !== ApplicationStatus.APPROVED &&
        application.status !== ApplicationStatus.HIRED)
    ) {
      return res.status(400).json({ error: 'Only a candidate approved by HEAD_OF_HR can become an employee.' });
    }

    // Auto-generate employee ID with unique number if not supplied
    let employeeId = data.employeeId?.trim();
    if (!employeeId) {
      employeeId = await generateUniqueEmployeeId();
    } else {
      // Check unique employeeId
      const existingEmp = await prisma.employee.findUnique({ where: { employeeId } });
      if (existingEmp) {
        return res.status(400).json({ error: 'Employee ID must be unique.' });
      }
    }

    // Create Employee in transaction
    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          departmentId: data.departmentId,
          positionId: data.positionId,
          managerId: data.managerId,
          employmentType: data.employmentType || 'FULL_TIME',
          hireDate: data.hireDate,
          status: EmployeeStatus.PENDING_ONBOARDING,
          onboardingStatus: OnboardingStatus.PENDING_ONBOARDING,
        }
      });

      // Position history
      await tx.employeePositionHistory.create({
        data: {
          employeeId: emp.id,
          positionId: emp.positionId,
          departmentId: emp.departmentId,
          startDate: new Date(),
          changedById: userId,
          notes: 'Initial assignment upon hire'
        }
      });

      let salaryToUse = data.baseSalary;
      if (!salaryToUse && data.positionId) {
        const pos = await tx.position.findUnique({ where: { id: data.positionId } });
        if (pos?.salaryMin && pos.salaryMin > 0) {
          salaryToUse = pos.salaryMin;
        }
      }

      if (salaryToUse) {
        await tx.employeeSalaryHistory.create({
          data: {
            employeeId: emp.id,
            baseSalary: salaryToUse,
            effectiveDate: new Date(),
            changeReason: data.baseSalary ? 'Initial Salary' : 'Initial Position Minimum Salary',
            changedById: userId
          }
        });

        await tx.employeeCompensation.upsert({
          where: { employeeId: emp.id },
          create: {
            employeeId: emp.id,
            basicSalary: salaryToUse,
            currency: 'USD',
            effectiveDate: new Date(),
            status: 'ACTIVE'
          },
          update: {
            basicSalary: salaryToUse,
            status: 'ACTIVE'
          }
        });
      }

      await tx.application.update({
        where: { id: data.applicationId },
        data: { status: ApplicationStatus.HIRED }
      });

      return emp;
    });

    await logAudit('EMPLOYEE_CREATED', userId, { employeeId: employee.id, empIdStr: employee.employeeId });

    res.status(201).json(employee);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { department: true, position: true }
    });
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyEmployeeProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: {
        department: true,
        position: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, employeeId: true }
        },
        documents: true,
        positionHistory: {
          include: { department: true, position: true },
          orderBy: { startDate: 'desc' }
        },
        salaryHistory: {
          orderBy: { effectiveDate: 'desc' }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found for authenticated user' });
    }

    res.json({ success: true, data: employee });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeDashboardSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: {
        department: true,
        position: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, employeeId: true }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee record not found for authenticated user' });
    }

    // 1. Latest released payslip
    const latestPayslip = await prisma.payroll.findFirst({
      where: {
        employeeId: employee.id,
        payrollPeriod: {
          status: { in: [PayrollPeriodStatus.APPROVED, PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID] }
        }
      },
      include: {
        payrollPeriod: true,
        items: true
      },
      orderBy: {
        payrollPeriod: { startDate: 'desc' }
      }
    });

    // 2. Leave balances for current year
    const currentYear = new Date().getFullYear();
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: employee.id,
        year: currentYear
      },
      include: {
        leaveType: true
      }
    });

    // 3. Learning & Development assigned courses
    const trainingAssignments = await prisma.trainingAssignment.findMany({
      where: { employeeId: employee.id },
      include: {
        training: {
          include: {
            category: true,
            sessions: true
          }
        }
      },
      take: 5
    });

    // 4. Performance review & current cycle
    const latestReview = await prisma.performanceReview.findFirst({
      where: { employeeId: employee.id },
      include: {
        cycle: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 5. Attendance summary for current month
    const startOfMonth = new Date(currentYear, new Date().getMonth(), 1);
    const endOfMonth = new Date(currentYear, new Date().getMonth() + 1, 0, 23, 59, 59);

    const monthlyAttendance = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const presentDays = monthlyAttendance.filter(a => a.status === 'PRESENT').length;
    const lateDays = monthlyAttendance.filter(a => a.status === 'LATE').length;
    const totalWorkingMinutes = monthlyAttendance.reduce((acc, curr) => acc + (curr.workingMinutes || 0), 0);
    const totalWorkingHours = Math.round((totalWorkingMinutes / 60) * 10) / 10;

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: { gte: today, lt: tomorrow }
      }
    });

    // 6. Recent notifications
    const recentNotifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          department: employee.department?.name,
          position: employee.position?.title,
          status: employee.status,
          employmentType: employee.employmentType,
          hireDate: employee.hireDate,
        },
        latestPayslip: latestPayslip ? {
          id: latestPayslip.id,
          netSalary: latestPayslip.netSalary,
          basicSalary: latestPayslip.basicSalary,
          grossSalary: latestPayslip.basicSalary + latestPayslip.totalAllowances + latestPayslip.totalOvertime,
          totalAllowances: latestPayslip.totalAllowances,
          totalDeductions: latestPayslip.totalDeductions,
          totalOvertime: latestPayslip.totalOvertime,
          periodName: latestPayslip.payrollPeriod.name,
          periodStatus: latestPayslip.payrollPeriod.status,
          periodStart: latestPayslip.payrollPeriod.startDate,
          periodEnd: latestPayslip.payrollPeriod.endDate,
        } : null,
        leaveBalances: leaveBalances.map(b => ({
          id: b.id,
          leaveType: b.leaveType.name,
          totalDays: b.balance,
          usedDays: b.used,
          remainingDays: Math.max(b.balance - b.used, 0),
          year: b.year
        })),
        trainings: trainingAssignments.map(ta => ({
          assignmentId: ta.id,
          trainingId: ta.training.id,
          title: ta.training.title,
          category: ta.training.category?.name,
          status: ta.training.status,
          assignedAt: ta.assignedAt,
          sessionsCount: ta.training.sessions?.length || 0,
        })),
        performance: latestReview ? {
          reviewId: latestReview.id,
          cycleName: latestReview.cycle?.name,
          cycleStatus: latestReview.cycle?.status,
          reviewStatus: latestReview.status,
          score: latestReview.overallScore,
        } : null,
        attendance: {
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          presentDays,
          lateDays,
          totalWorkingHours,
          todayStatus: todayAttendance?.status || 'NOT_RECORDED',
          checkIn: todayAttendance?.checkIn,
          checkOut: todayAttendance?.checkOut,
        },
        recentNotifications
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const provisionAccount = async (req: Request, res: Response) => {
  try {
    const employeeId = parseInt(req.params.id);
    if (isNaN(employeeId)) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }
    const initiatorUserId = (req as any).user!.id;
    const result = await provisionEmployeeAccount(employeeId, initiatorUserId);
    res.status(200).json({
      success: true,
      message: 'Employee account provisioned and invitation sent successfully',
      data: result
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const targetId = parseInt(req.params.id);

    // IDOR & Role Protection:
    // If the authenticated user only has the EMPLOYEE role, they can NEVER query another employee's profile
    const isEmployeeOnly = authUser?.roles?.includes('EMPLOYEE') &&
      !authUser.roles.some((r: string) => r.startsWith('HR_') || r === 'HEAD_OF_HR');
    
    if (isEmployeeOnly) {
      const myEmp = await prisma.employee.findUnique({ where: { userId: authUser.id } });
      if (!myEmp || myEmp.id !== targetId) {
        return res.status(403).json({ error: 'Forbidden: You cannot access another employee profile' });
      }
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetId },
      include: {
        department: true,
        position: true,
        documents: true,
        positionHistory: true,
        salaryHistory: true
      }
    });
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json(employee);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;
    const userId = (req as any).user!.id;
    
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!documentType) return res.status(400).json({ error: 'Document type is required' });

    const result = await storageService.uploadFile(req.file.buffer, req.file.originalname);

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: parseInt(id),
        documentType,
        fileName: req.file.originalname,
        storageKey: result.storageKey,
        uploadedById: userId
      }
    });

    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { onboardingStatus: OnboardingStatus.DOCUMENT_COLLECTION }
    });

    await logAudit('DOCUMENT_UPLOADED', userId, { employeeId: id, documentId: document.id });

    res.status(201).json(document);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const completeOnboarding = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;

    const emp = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { onboardingStatus: OnboardingStatus.PROFILE_COMPLETED }
    });
    await logAudit('ONBOARDING_COMPLETED', userId, { employeeId: id });
    const hrUsers = await prisma.userRole.findMany({ where: { role: { name: 'HEAD_OF_HR' } } });
    for (const hr of hrUsers) {
      await notifyUser(hr.userId, 'Onboarding Completed', `Employee ${emp.firstName} ${emp.lastName} completed onboarding.`, 'SUCCESS', 'Employee', String(id));
    }
    res.json(emp);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const activateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const empId = parseInt(id);

    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: empId },
        include: { documents: true }
      });

      if (!employee) throw new Error('Not found');

      // Do not activate if required onboarding data is incomplete (e.g., no documents)
      if (employee.documents.length === 0) {
        throw new Error('Onboarding incomplete: Missing required documents.');
      }
      
      if (employee.onboardingStatus !== OnboardingStatus.PROFILE_COMPLETED) {
        throw new Error('Employee onboarding must be marked as PROFILE_COMPLETED first.');
      }

      const updated = await tx.employee.update({
        where: { id: empId },
        data: { status: EmployeeStatus.ACTIVE, onboardingStatus: OnboardingStatus.ACTIVE }
      });

      await tx.employeeStatusHistory.create({
        data: {
          employeeId: empId,
          status: EmployeeStatus.ACTIVE,
          changedById: userId,
          notes: 'Employee activated via onboarding workflow'
        }
      });

      return updated;
    });

    await logAudit('EMPLOYEE_ACTIVATED', userId, { employeeId: id });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateEmployeePosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { departmentId, positionId } = req.body;
    const userId = (req as any).user!.id;
    const empId = parseInt(id);

    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id: empId } });
      if (!employee) throw new Error('Not found');

      if (departmentId === employee.departmentId && positionId === employee.positionId) {
        return employee;
      }

      const updated = await tx.employee.update({
        where: { id: empId },
        data: {
          ...(departmentId ? { departmentId } : {}),
          ...(positionId ? { positionId } : {})
        }
      });

      // Preserve previous record by ending it
      const currentPosHist = await tx.employeePositionHistory.findFirst({
        where: { employeeId: empId, endDate: null },
        orderBy: { startDate: 'desc' }
      });

      if (currentPosHist) {
        await tx.employeePositionHistory.update({
          where: { id: currentPosHist.id },
          data: { endDate: new Date() }
        });
      }

      // Create new record
      await tx.employeePositionHistory.create({
        data: {
          employeeId: empId,
          departmentId: updated.departmentId,
          positionId: updated.positionId,
          startDate: new Date(),
          changedById: userId
        }
      });

      return updated;
    });

    await logAudit('EMPLOYEE_POSITION_UPDATED', userId, { employeeId: id });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
