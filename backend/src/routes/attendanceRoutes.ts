import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { createShift, assignShift, checkIn, checkOut, generateTimesheet } from '../controllers/attendanceController';
import { createLeaveRequest, approveLeaveRequest } from '../controllers/leaveController';
import { createOvertimeRequest, approveOvertimeRequest } from '../controllers/overtimeController';

const router = Router();
router.use(requireAuth);

// Shifts
router.post('/shifts', requirePermission(['SHIFT_CREATE']), createShift);
router.post('/shifts/assign', requirePermission(['SHIFT_CREATE']), assignShift);

// Attendance
router.post('/attendance/check-in', requirePermission(['ATTENDANCE_CREATE']), checkIn);
router.post('/attendance/:id/check-out', requirePermission(['ATTENDANCE_UPDATE']), checkOut);

// Leave
router.post('/leave', requirePermission(['LEAVE_CREATE']), createLeaveRequest);
router.put('/leave/:id/status', requirePermission(['LEAVE_UPDATE']), approveLeaveRequest);

// Overtime
router.post('/overtime', requirePermission(['OVERTIME_CREATE']), createOvertimeRequest);
router.put('/overtime/:id/status', requirePermission(['OVERTIME_UPDATE']), approveOvertimeRequest);

// Timesheets
router.post('/timesheets/generate', requirePermission(['TIMESHEET_READ']), generateTimesheet);

export default router;
