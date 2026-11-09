import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import {
  createShift,
  getShifts,
  assignShift,
  getEmployeeShifts,
  checkIn,
  checkOut,
  getAttendances,
  getTodayAttendance,
  generateTimesheet,
  getTimesheets,
} from '../controllers/attendanceController';
import {
  createLeaveRequest,
  approveLeaveRequest,
  getLeaveRequests,
  getLeaveTypes,
  getLeaveBalances,
} from '../controllers/leaveController';
import {
  createOvertimeRequest,
  approveOvertimeRequest,
  getOvertimeRequests,
} from '../controllers/overtimeController';

const router = Router();
router.use(requireAuth);

// Shifts
router.post('/shifts', requirePermission(['SHIFT_CREATE']), createShift);
router.get('/shifts', requireAuth, getShifts);
router.post('/shifts/assign', requirePermission(['SHIFT_CREATE']), assignShift);
router.get(
  '/shifts/assignments',
  requirePermission(['SHIFT_CREATE', 'ATTENDANCE_CREATE', 'ATTENDANCE_UPDATE']),
  getEmployeeShifts,
);

// Attendance
router.post('/attendance/check-in', requirePermission(['ATTENDANCE_CREATE']), checkIn);
router.post('/check-in', requirePermission(['ATTENDANCE_CREATE']), checkIn);
router.post('/attendance/:id/check-out', requirePermission(['ATTENDANCE_UPDATE']), checkOut);
router.post('/attendance/check-out', requirePermission(['ATTENDANCE_UPDATE']), checkOut);
router.post('/check-out', requirePermission(['ATTENDANCE_UPDATE']), checkOut);
router.get(
  '/attendance',
  requirePermission(['ATTENDANCE_CREATE', 'ATTENDANCE_UPDATE', 'TIMESHEET_READ']),
  getAttendances,
);
router.get('/attendance/today/:employeeId', requireAuth, getTodayAttendance);

// Leave
router.post('/leave', requirePermission(['LEAVE_CREATE']), createLeaveRequest);
router.post('/leaves', requirePermission(['LEAVE_CREATE']), createLeaveRequest);
router.get('/leave', requirePermission(['LEAVE_CREATE', 'LEAVE_UPDATE']), getLeaveRequests);
router.get('/leaves', requirePermission(['LEAVE_CREATE', 'LEAVE_UPDATE']), getLeaveRequests);
router.put('/leave/:id/status', requirePermission(['LEAVE_UPDATE']), approveLeaveRequest);
router.post('/leaves/:id/approve', requirePermission(['LEAVE_UPDATE']), approveLeaveRequest);
router.get('/leave/types', requireAuth, getLeaveTypes);
router.get('/leave-types', requireAuth, getLeaveTypes);
router.get('/leave/balances', requirePermission(['LEAVE_CREATE', 'LEAVE_UPDATE']), getLeaveBalances);

// Overtime
router.post('/overtime', requirePermission(['OVERTIME_CREATE']), createOvertimeRequest);
router.get('/overtime', requirePermission(['OVERTIME_CREATE', 'OVERTIME_UPDATE']), getOvertimeRequests);
router.put('/overtime/:id/status', requirePermission(['OVERTIME_UPDATE']), approveOvertimeRequest);
router.post('/overtime/:id/approve', requirePermission(['OVERTIME_UPDATE']), approveOvertimeRequest);

// Timesheets
router.post('/timesheets/generate', requirePermission(['TIMESHEET_READ']), generateTimesheet);
router.get('/timesheets', requirePermission(['TIMESHEET_READ']), getTimesheets);

export default router;
