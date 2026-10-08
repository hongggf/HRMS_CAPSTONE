import { Request, Response } from 'express';
import { PayrollPeriodStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createPeriodSchema, updatePayrollStatusSchema } from '../validators/payrollValidator';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';



export const createPayrollPeriod = async (req: Request, res: Response) => {
  try {
    const data = createPeriodSchema.parse(req.body);
    const userId = (req as any).user!.id;

    const period = await prisma.payrollPeriod.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: PayrollPeriodStatus.DRAFT
      }
    });

    await logAudit('PAYROLL_CREATED', userId, { periodId: period.id });
    res.status(201).json(period);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const calculatePayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const periodId = parseInt(id);

    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status === 'LOCKED' || period.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot calculate locked or paid payroll' });
    }

    await prisma.payrollPeriod.update({ where: { id: periodId }, data: { status: PayrollPeriodStatus.CALCULATING } });

    // Transaction for calculation
    await prisma.$transaction(async (tx) => {
      // Clear existing calculations for this period if recalcuating
      await tx.payrollItem.deleteMany({ where: { payroll: { payrollPeriodId: periodId } } });
      await tx.payroll.deleteMany({ where: { payrollPeriodId: periodId } });

      const employees = await tx.employee.findMany({
        where: { status: 'ACTIVE' },
        include: {
          compensation: true,
          salaryComponents: { include: { component: true } },
          Timesheet: {
            where: {
              startDate: { gte: period.startDate },
              endDate: { lte: period.endDate }
            }
          }
        }
      });

      for (const emp of employees) {
        if (!emp.compensation) continue; // Skip employees without compensation defined
        
        const basic = emp.compensation.basicSalary;
        let allowances = 0;
        let deductions = 0;
        let bonuses = 0;
        let overtimePay = 0;

        const itemsToCreate = [];

        itemsToCreate.push({
          componentName: 'Basic Salary',
          componentType: 'OTHER',
          amount: basic,
          description: 'Base pay'
        });

        // Components
        for (const empComp of emp.salaryComponents) {
          if (empComp.endDate && empComp.endDate < period.startDate) continue;
          
          let amount = empComp.type === 'FIXED' ? empComp.amount : (basic * empComp.amount / 100);
          
          itemsToCreate.push({
            componentName: empComp.component.name,
            componentType: empComp.component.type as any,
            amount,
            description: empComp.component.description
          });

          if (empComp.component.type === 'ALLOWANCE') allowances += amount;
          else if (empComp.component.type === 'DEDUCTION') deductions += amount;
          else if (empComp.component.type === 'BONUS') bonuses += amount;
        }

        // Overtime (assuming 160 hours/month standard, 1.5x rate)
        const totalOvertimeHours = emp.Timesheet.reduce((acc, t) => acc + t.overtimeHours, 0);
        if (totalOvertimeHours > 0) {
          const hourlyRate = basic / 160;
          overtimePay = hourlyRate * 1.5 * totalOvertimeHours;
          itemsToCreate.push({
            componentName: 'Overtime Pay',
            componentType: 'ALLOWANCE',
            amount: overtimePay,
            description: `${totalOvertimeHours} hours at 1.5x rate`
          });
        }

        const gross = basic + allowances + bonuses + overtimePay;
        const net = gross - deductions;

        const payrollRecord = await tx.payroll.create({
          data: {
            payrollPeriodId: periodId,
            employeeId: emp.id,
            basicSalary: basic,
            totalAllowances: allowances + bonuses,
            totalDeductions: deductions,
            totalOvertime: overtimePay,
            netSalary: net,
            status: PayrollPeriodStatus.CALCULATED
          }
        });

        await tx.payrollItem.createMany({
          data: itemsToCreate.map(item => ({
            payrollId: payrollRecord.id,
            ...item
          }))
        });
      }

      await tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: PayrollPeriodStatus.CALCULATED }
      });
    });

    await logAudit('PAYROLL_CALCULATED', userId, { periodId });
    res.json({ success: true, message: 'Payroll calculated successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const submitPayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    
    const updated = await prisma.payrollPeriod.update({
      where: { id: parseInt(id) },
      data: { status: PayrollPeriodStatus.PENDING_APPROVAL }
    });
    
    await logAudit('PAYROLL_SUBMITTED', userId, { periodId: id });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const approvePayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollPeriod.update({
        where: { id: parseInt(id) },
        data: { status: PayrollPeriodStatus.APPROVED }
      });
      await tx.payrollApproval.create({
        data: { payrollPeriodId: parseInt(id), approvedById: userId, status: PayrollPeriodStatus.APPROVED }
      });
      return updated;
    });

    await logAudit('PAYROLL_APPROVED', userId, { periodId: id });
    const hrUsers = await prisma.userRole.findMany({ where: { role: { name: 'HEAD_OF_HR' } } });
    for (const hr of hrUsers) {
      await notifyUser(hr.userId, 'Payroll Approved', `Payroll period ${id} has been approved.`, 'SUCCESS', 'PayrollPeriod', String(id));
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const rejectPayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollPeriod.update({
        where: { id: parseInt(id) },
        data: { status: PayrollPeriodStatus.REJECTED }
      });
      await tx.payrollApproval.create({
        data: { payrollPeriodId: parseInt(id), approvedById: userId, status: PayrollPeriodStatus.REJECTED, comments: req.body.comments }
      });
      return updated;
    });

    await logAudit('PAYROLL_REJECTED', userId, { periodId: id });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const lockPayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    
    const period = await prisma.payrollPeriod.findUnique({ where: { id: parseInt(id) } });
    if (period?.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only APPROVED payrolls can be locked' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payrollPeriod.update({
        where: { id: parseInt(id) },
        data: { status: PayrollPeriodStatus.LOCKED }
      });
      await tx.payroll.updateMany({
        where: { payrollPeriodId: parseInt(id) },
        data: { status: PayrollPeriodStatus.LOCKED }
      });
      return p;
    });

    await logAudit('PAYROLL_LOCKED', userId, { periodId: id });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getPayrollPeriods = async (req: Request, res: Response) => {
  const periods = await prisma.payrollPeriod.findMany();
  res.json(periods);
};

export const getPayrollByPeriod = async (req: Request, res: Response) => {
  const { id } = req.params;
  const payrolls = await prisma.payroll.findMany({
    where: { payrollPeriodId: parseInt(id) },
    include: { items: true, employee: true }
  });
  res.json(payrolls);
};

export const createAdjustment = async (req: Request, res: Response) => {
  try {
    const { payrollId } = req.params;
    const data = require('../validators/payrollValidator').createAdjustmentSchema.parse(req.body);
    const userId = (req as any).user!.id;
    
    const payroll = await prisma.payroll.findUnique({
      where: { id: parseInt(payrollId) },
      include: { payrollPeriod: true }
    });
    
    if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
    
    if (payroll.payrollPeriod.status === 'LOCKED' || payroll.payrollPeriod.status === 'PAID') {
      // Requirement: "After LOCKED... If correction is needed, use a controlled adjustment/reversal process."
      // We will record the adjustment but NOT alter the locked payroll amounts.
      const adjustment = await prisma.payrollAdjustment.create({
        data: {
          payrollId: payroll.id,
          adjustedById: userId,
          amount: data.amount,
          type: data.type,
          reason: data.reason
        }
      });
      await logAudit('PAYROLL_ADJUSTED', userId, { payrollId, adjustmentId: adjustment.id, status: 'RECORDED_ONLY' });
      return res.status(201).json(adjustment);
    }

    // If not locked, we can alter the payroll amounts directly via transaction
    const result = await prisma.$transaction(async (tx) => {
      const adjustment = await tx.payrollAdjustment.create({
        data: {
          payrollId: payroll.id,
          adjustedById: userId,
          amount: data.amount,
          type: data.type,
          reason: data.reason
        }
      });

      const netSalary = data.type === 'ADDITION' 
        ? payroll.netSalary + data.amount 
        : payroll.netSalary - data.amount;

      await tx.payroll.update({
        where: { id: payroll.id },
        data: { netSalary }
      });

      return adjustment;
    });

    await logAudit('PAYROLL_ADJUSTED', userId, { payrollId, adjustmentId: result.id, status: 'APPLIED' });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllPayrolls = async (req: Request, res: Response) => {
  const payrolls = await prisma.payroll.findMany({
    include: { payrollPeriod: true, employee: true }
  });
  res.json(payrolls);
};
