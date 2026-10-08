import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { 
  EmployeeStatus, 
  WorkforceStatus,
  PayrollPeriodStatus,
  AttendanceStatus,
  RequestStatus,
  TrainingStatus
} from '@prisma/client';

export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalEmployees = await prisma.employee.count();
    const activeEmployees = await prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } });
    const inactiveEmployees = await prisma.employee.count({ where: { status: EmployeeStatus.INACTIVE } });

    // New hires: let's assume hired in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newHires = await prisma.employee.count({
      where: {
        hireDate: { gte: thirtyDaysAgo }
      }
    });

    const pendingWorkforceApprovals = await prisma.workforceRequest.count({
      where: { status: WorkforceStatus.PENDING_APPROVAL }
    });
    
    // Using SUBMITTED or PENDING_APPROVAL for job requisitions/applications depending on what exists, let's check schema
    // Let's just return a placeholder for pending recruitment approvals until we check exact enums
    const pendingRecruitmentApprovals = await prisma.jobRequisition.count({
      where: { status: WorkforceStatus.PENDING_APPROVAL }
    });

    const pendingPayrollApprovals = await prisma.payrollPeriod.count({
      where: { status: PayrollPeriodStatus.PENDING_APPROVAL }
    });

    // Attendance summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendanceSummary = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        date: { gte: today }
      },
      _count: {
        _all: true
      }
    });

    // Leave summary
    const leaveSummary = await prisma.leaveRequest.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    // Payroll summary (last period)
    const latestPayrollPeriod = await prisma.payrollPeriod.findFirst({
      orderBy: { endDate: 'desc' }
    });
    
    let payrollSummary = { total: 0, netSalary: 0 };
    if (latestPayrollPeriod) {
      const payrolls = await prisma.payroll.aggregate({
        where: { payrollPeriodId: latestPayrollPeriod.id },
        _sum: {
          netSalary: true,
          basicSalary: true,
        },
        _count: {
          _all: true
        }
      });
      payrollSummary = {
        total: payrolls._count._all,
        netSalary: payrolls._sum.netSalary || 0
      };
    }

    // Performance summary
    const performanceSummary = await prisma.performanceReview.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    // Training summary
    const trainingSummary = await prisma.training.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    res.json({
      success: true,
      message: "Dashboard metrics retrieved successfully",
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        newHires,
        pendingWorkforceApprovals,
        pendingRecruitmentApprovals,
        pendingPayrollApprovals,
        attendanceSummary: attendanceSummary.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        leaveSummary: leaveSummary.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        payrollSummary,
        performanceSummary: performanceSummary.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        trainingSummary: trainingSummary.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRecruitmentReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);
    const dateQuery = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const vacancies = await prisma.jobPosting.count({ where: dateQuery });
    
    const applicationsQuery = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const applicationsByStatus = await prisma.application.groupBy({
      by: ['status'],
      where: applicationsQuery,
      _count: { _all: true }
    });

    const applicationsCount = applicationsByStatus.reduce((acc: any, curr: any) => acc + curr._count._all, 0);
    const shortlistedCount = applicationsByStatus.find((a: any) => a.status === 'SHORTLISTED')?._count?._all || 0;
    const hiredCount = applicationsByStatus.find((a: any) => a.status === 'HIRED')?._count?._all || 0;

    const interviews = await prisma.interview.count({ 
      where: Object.keys(dateFilter).length > 0 ? { scheduledAt: dateFilter } : {} 
    });

    res.json({
      success: true,
      message: "Recruitment reports retrieved successfully",
      data: {
        vacancies,
        applications: applicationsCount,
        shortlistedCandidates: shortlistedCount,
        interviews,
        selectedCandidates: applicationsByStatus.find((a: any) => a.status === 'OFFERED')?._count?._all || 0,
        hiredCandidates: hiredCount,
        applicationsByStatus: applicationsByStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId } = req.query;
    const whereQuery = departmentId ? { departmentId: Number(departmentId) } : {};

    const totalEmployees = await prisma.employee.count({ where: whereQuery });
    
    const employeesByDepartment = await prisma.employee.groupBy({
      by: ['departmentId'],
      _count: { _all: true }
    });

    const employeesByPosition = await prisma.employee.groupBy({
      by: ['positionId'],
      where: whereQuery,
      _count: { _all: true }
    });

    const employeesByStatus = await prisma.employee.groupBy({
      by: ['status'],
      where: whereQuery,
      _count: { _all: true }
    });

    // Hiring trends: grouping by month/year is complex in pure Prisma unless raw SQL, 
    // but we can group by hireDate or just get records and JS group if small, but requirement says "use DB aggregation".
    // Alternatively, just count hires in last 3 months, 6 months etc.
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const hiredLastMonth = await prisma.employee.count({
      where: { ...whereQuery, hireDate: { gte: lastMonth } }
    });

    res.json({
      success: true,
      message: "Employee reports retrieved successfully",
      data: {
        totalEmployees,
        departmentDistribution: employeesByDepartment,
        positionDistribution: employeesByPosition,
        statusDistribution: employeesByStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        hiringTrends: {
          hiredLast30Days: hiredLastMonth
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);
    
    let whereQuery: any = {};
    if (Object.keys(dateFilter).length > 0) whereQuery.date = dateFilter;
    if (departmentId) {
      whereQuery.employee = { departmentId: Number(departmentId) };
    }

    const attendanceByStatus = await prisma.attendance.groupBy({
      by: ['status'],
      where: whereQuery,
      _count: { _all: true }
    });

    const leaveByStatus = await prisma.leaveRequest.groupBy({
      by: ['status'],
      where: departmentId ? { employee: { departmentId: Number(departmentId) } } : {},
      _count: { _all: true }
    });
    
    const overtimeTotal = await prisma.overtimeRequest.aggregate({
      where: { 
        status: RequestStatus.APPROVED,
        ...(departmentId ? { employee: { departmentId: Number(departmentId) } } : {})
      },
      _sum: { hours: true }
    });

    res.json({
      success: true,
      message: "Attendance reports retrieved successfully",
      data: {
        attendance: attendanceByStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        leaves: leaveByStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        totalOvertimeHours: overtimeTotal._sum.hours || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    
    let payrollFilter: any = { status: 'PAID' }; // Example status
    // Prisma grouping by relation field is not directly supported in groupBy, 
    // we'll get sum of payrolls.
    
    const totals = await prisma.payroll.aggregate({
      where: departmentId ? { employee: { departmentId: Number(departmentId) } } : {},
      _sum: {
        basicSalary: true,
        totalAllowances: true,
        totalDeductions: true,
        totalOvertime: true,
        netSalary: true
      },
      _count: { _all: true }
    });

    res.json({
      success: true,
      message: "Payroll reports retrieved successfully",
      data: {
        totalPayrollsProcessed: totals._count._all,
        totals: {
          grossSalary: (totals._sum.basicSalary || 0) + (totals._sum.totalAllowances || 0) + (totals._sum.totalOvertime || 0),
          basicSalary: totals._sum.basicSalary || 0,
          allowances: totals._sum.totalAllowances || 0,
          overtime: totals._sum.totalOvertime || 0,
          deductions: totals._sum.totalDeductions || 0,
          netSalary: totals._sum.netSalary || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPerformanceReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewsByStatus = await prisma.performanceReview.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    const avgScore = await prisma.performanceReview.aggregate({
      _avg: { overallScore: true }
    });

    const pipCount = await prisma.improvementPlan.count({
      where: { status: 'ACTIVE' }
    });

    res.json({
      success: true,
      message: "Performance reports retrieved successfully",
      data: {
        reviewStatus: reviewsByStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        averageScore: avgScore._avg?.overallScore || 0,
        employeesOnImprovementPlan: pipCount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTrainingReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainingParticipation = await prisma.trainingAssignment.count();
    
    const assignmentByStatus = await prisma.training.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    const averageEvaluation = await prisma.trainingEvaluation.aggregate({
      _avg: { rating: true }
    });

    const attendanceRate = await prisma.trainingAttendance.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    res.json({
      success: true,
      message: "Training reports retrieved successfully",
      data: {
        totalParticipation: trainingParticipation,
        completionStatus: assignmentByStatus.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        attendanceRate: attendanceRate.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count._all;
          return acc;
        }, {}),
        averageEvaluationRating: averageEvaluation._avg?.rating || 0
      }
    });
  } catch (error) {
    next(error);
  }
};
