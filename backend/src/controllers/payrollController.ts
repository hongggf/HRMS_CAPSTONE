import { Request, Response } from 'express';
import { PayrollPeriodStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { createPeriodSchema, updatePayrollStatusSchema, createAdjustmentSchema } from '../validators/payrollValidator';
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
  let period: any = null;
  const { id } = req.params;
  const periodId = parseInt(id);

  try {
    const userId = (req as any).user!.id;

    period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    if (period.status === 'LOCKED' || period.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot calculate locked or paid payroll' });
    }
    if (period.status === 'CALCULATING') {
      return res.status(400).json({ error: 'Payroll calculation is already in progress' });
    }
    if (period.status === 'PENDING_APPROVAL' || period.status === 'APPROVED') {
      return res.status(400).json({ error: `Cannot calculate payroll in ${period.status} status` });
    }

    await prisma.payrollPeriod.update({ where: { id: periodId }, data: { status: PayrollPeriodStatus.CALCULATING } });

    // Transaction for calculation
    await prisma.$transaction(async (tx) => {
      // Clear existing calculations for this period if recalculating
      await tx.payrollItem.deleteMany({ where: { payroll: { payrollPeriodId: periodId } } });
      await tx.payroll.deleteMany({ where: { payrollPeriodId: periodId } });

      const employees = await tx.employee.findMany({
        where: { status: 'ACTIVE' },
        include: {
          compensation: true,
          salaryHistory: { orderBy: { effectiveDate: 'desc' } },
          position: true,
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
        let compensation = emp.compensation;

        // Auto-heal / resolve compensation from salaryHistory or position if not yet set in EmployeeCompensation
        if (!compensation) {
          let baseSalary = 0;
          let currency = 'USD';

          if (emp.salaryHistory && emp.salaryHistory.length > 0) {
            const activeSal = emp.salaryHistory.find((s: any) => !s.endDate) || emp.salaryHistory[0];
            if (activeSal && activeSal.baseSalary > 0) {
              baseSalary = activeSal.baseSalary;
              currency = activeSal.currency || 'USD';
            }
          } else if (emp.position?.salaryMin && emp.position.salaryMin > 0) {
            baseSalary = emp.position.salaryMin;
          }

          if (baseSalary > 0) {
            compensation = await tx.employeeCompensation.upsert({
              where: { employeeId: emp.id },
              create: {
                employeeId: emp.id,
                basicSalary: baseSalary,
                currency,
                effectiveDate: new Date(),
                status: 'ACTIVE'
              },
              update: {
                basicSalary: baseSalary,
                status: 'ACTIVE'
              }
            });
          }
        }

        if (!compensation || !compensation.basicSalary) continue; // Skip employees without compensation defined
        
        const basic = compensation.basicSalary;
        let allowances = 0;
        let deductions = 0;
        let bonuses = 0;
        let overtimePay = 0;

        const itemsToCreate = [];

        itemsToCreate.push({
          componentName: 'Basic Salary',
          componentType: 'OTHER' as const,
          amount: basic,
          description: 'Base pay'
        });

        // Components
        for (const empComp of emp.salaryComponents) {
          if (empComp.endDate && empComp.endDate < period.startDate) continue;
          
          const amount = empComp.type === 'FIXED' ? empComp.amount : (basic * empComp.amount / 100);
          
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
            componentType: 'ALLOWANCE' as const,
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
    if (period && period.status !== PayrollPeriodStatus.CALCULATING) {
      await prisma.payrollPeriod.update({
        where: { id: periodId },
        data: { status: period.status }
      }).catch(() => {});
    }
    res.status(400).json({ error: error.message });
  }
};

export const submitPayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const periodId = parseInt(id);

    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: 'Payroll period not found' });

    if (period.status === PayrollPeriodStatus.PENDING_APPROVAL) {
      return res.status(400).json({ error: 'Payroll is already pending approval' });
    }
    if (period.status === PayrollPeriodStatus.LOCKED || period.status === PayrollPeriodStatus.PAID) {
      return res.status(400).json({ error: 'Cannot submit locked or paid payroll' });
    }
    if (period.status !== PayrollPeriodStatus.CALCULATED && period.status !== PayrollPeriodStatus.DRAFT) {
      return res.status(400).json({ error: `Cannot submit payroll with status ${period.status}` });
    }
    
    const updated = await prisma.payrollPeriod.update({
      where: { id: periodId },
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
    const periodId = parseInt(id);

    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: 'Payroll period not found' });

    if (period.status === PayrollPeriodStatus.APPROVED) {
      return res.status(400).json({ error: 'Payroll is already approved' });
    }
    if (period.status !== PayrollPeriodStatus.PENDING_APPROVAL) {
      return res.status(400).json({ error: `Only payrolls in PENDING_APPROVAL status can be approved` });
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: PayrollPeriodStatus.APPROVED }
      });
      await tx.payrollApproval.create({
        data: {
          payrollPeriodId: periodId,
          approvedById: userId,
          status: PayrollPeriodStatus.APPROVED,
          comments: req.body?.comments || 'Approved by Head of HR'
        }
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
    const periodId = parseInt(id);

    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: 'Payroll period not found' });

    if (period.status !== PayrollPeriodStatus.PENDING_APPROVAL) {
      return res.status(400).json({ error: `Only payrolls in PENDING_APPROVAL status can be rejected` });
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: PayrollPeriodStatus.REJECTED }
      });
      await tx.payrollApproval.create({
        data: {
          payrollPeriodId: periodId,
          approvedById: userId,
          status: PayrollPeriodStatus.REJECTED,
          comments: req.body.comments || 'Rejected by Head of HR'
        }
      });
      return updated;
    });

    await logAudit('PAYROLL_REJECTED', userId, { periodId: id, comments: req.body.comments });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const lockPayroll = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const periodId = parseInt(id);
    
    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) return res.status(404).json({ error: 'Payroll period not found' });
    if (period.status === PayrollPeriodStatus.LOCKED) {
      return res.status(400).json({ error: 'Payroll is already locked' });
    }
    if (period.status !== PayrollPeriodStatus.APPROVED) {
      return res.status(400).json({ error: 'Only APPROVED payrolls can be locked' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payrollPeriod.update({
        where: { id: periodId },
        data: { status: PayrollPeriodStatus.LOCKED }
      });
      await tx.payroll.updateMany({
        where: { payrollPeriodId: periodId },
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
  const periods = await prisma.payrollPeriod.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      _count: {
        select: { payrolls: true }
      },
      approvals: {
        include: {
          approvedBy: {
            select: { id: true, email: true }
          }
        },
        orderBy: { date: 'desc' }
      }
    }
  });
  res.json(periods);
};

export const getPayrollPeriodById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: parseInt(id) },
      include: {
        approvals: {
          include: {
            approvedBy: {
              select: { id: true, email: true }
            }
          },
          orderBy: { date: 'desc' }
        },
        _count: {
          select: { payrolls: true }
        }
      }
    });
    if (!period) return res.status(404).json({ error: 'Payroll period not found' });
    res.json(period);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPayrollByPeriod = async (req: Request, res: Response) => {
  const { id } = req.params;
  const payrolls = await prisma.payroll.findMany({
    where: { payrollPeriodId: parseInt(id) },
    include: {
      items: true,
      employee: {
        include: {
          department: true,
          position: true
        }
      },
      adjustments: true
    },
    orderBy: { employeeId: 'asc' }
  });
  res.json(payrolls);
};

export const getPayslip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = (req as any).user;
    const payrollId = parseInt(id);

    if (isNaN(payrollId)) {
      return res.status(400).json({ error: 'Invalid payslip ID' });
    }

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        items: true,
        employee: {
          include: {
            department: true,
            position: true
          }
        },
        payrollPeriod: true,
        adjustments: true
      }
    });

    if (!payroll) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    // Strict Authorization check:
    // 1. User with PAYROLL_READ permission can view any payslip.
    // 2. Otherwise, check if user is the employee associated with this payslip.
    // Client-provided parameters (such as query/body employeeId or role) are NEVER trusted.
    const hasPayrollRead = authUser?.permissions?.includes('PAYROLL_READ');

    if (!hasPayrollRead) {
      const linkedEmployee = await prisma.employee.findUnique({
        where: { userId: authUser.id }
      });

      if (!linkedEmployee || linkedEmployee.id !== payroll.employeeId) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions to access this payslip' });
      }

      // Self-service employee payslip access requires the payroll period to be APPROVED, LOCKED, or PAID
      const releasedStatuses: PayrollPeriodStatus[] = [
        PayrollPeriodStatus.APPROVED,
        PayrollPeriodStatus.LOCKED,
        PayrollPeriodStatus.PAID
      ];

      if (!releasedStatuses.includes(payroll.payrollPeriod.status)) {
        return res.status(403).json({ error: 'Forbidden: Payslip is not yet released for employee viewing' });
      }
    }

    res.json(payroll);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyPayslips = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const linkedEmployee = await prisma.employee.findUnique({
      where: { userId: authUser.id }
    });

    if (!linkedEmployee) {
      return res.json([]);
    }

    const payrolls = await prisma.payroll.findMany({
      where: {
        employeeId: linkedEmployee.id,
        payrollPeriod: {
          status: { in: [PayrollPeriodStatus.APPROVED, PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID] }
        }
      },
      include: {
        items: true,
        payrollPeriod: true,
        adjustments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payrolls);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeePayslips = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const authUser = (req as any).user;
    const empId = parseInt(employeeId);

    if (isNaN(empId)) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const hasPayrollRead = authUser?.permissions?.includes('PAYROLL_READ');

    if (!hasPayrollRead) {
      const linkedEmployee = await prisma.employee.findUnique({
        where: { userId: authUser.id }
      });

      if (!linkedEmployee || linkedEmployee.id !== empId) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions to view these payslips' });
      }
    }

    const whereClause: any = { employeeId: empId };
    if (!hasPayrollRead) {
      whereClause.payrollPeriod = {
        status: { in: [PayrollPeriodStatus.APPROVED, PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID] }
      };
    }

    const payrolls = await prisma.payroll.findMany({
      where: whereClause,
      include: {
        items: true,
        payrollPeriod: true,
        adjustments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payrolls);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAdjustment = async (req: Request, res: Response) => {
  try {
    const { payrollId } = req.params;
    const data = createAdjustmentSchema.parse(req.body);
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

    // If not locked, we alter the payroll amounts directly via transaction
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
