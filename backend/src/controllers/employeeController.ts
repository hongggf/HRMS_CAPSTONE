import { Request, Response } from 'express';
import { EmployeeStatus, OnboardingStatus, ApplicationStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createEmployeeSchema, updateEmployeeSchema } from '../validators/employeeValidator';
import { storageService } from '../services/storageService';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';



export const createEmployee = async (req: Request, res: Response) => {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const userId = (req as any).user!.id;

    // IMPORTANT BUSINESS RULE: Only a candidate approved by HEAD_OF_HR may become an employee.
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true }
    });

    if (!application || application.status !== ApplicationStatus.APPROVED) {
      return res.status(400).json({ error: 'Only a candidate approved by HEAD_OF_HR can become an employee.' });
    }

    // Check unique employeeId
    const existingEmp = await prisma.employee.findUnique({ where: { employeeId: data.employeeId } });
    if (existingEmp) {
      return res.status(400).json({ error: 'Employee ID must be unique.' });
    }

    // Create Employee in transaction
    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          employeeId: data.employeeId,
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

      if (data.baseSalary) {
        await tx.employeeSalaryHistory.create({
          data: {
            employeeId: emp.id,
            baseSalary: data.baseSalary,
            effectiveDate: new Date(),
            changeReason: 'Initial Salary',
            changedById: userId
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

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(req.params.id) },
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

    const result = await storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

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
