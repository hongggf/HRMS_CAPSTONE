# HRMS Verified API Contract Matrix

This matrix documents the verified endpoints, HTTP methods, request payloads, response schemas, and access permissions derived directly from the backend controllers, validation schemas, and route guards.

---

## 1. Global Response Envelopes

### Success Envelope
```typescript
interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Error Envelope
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}
```

---

## 2. API Endpoint Matrix

| Module | Method | Endpoint Path | Auth / Role | Request Payload | Response Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Public (Rate Limited) | `{ email, password }` | `{ accessToken, refreshToken, user: { id, email, roles } }` |
| **Auth** | `POST` | `/api/v1/auth/refresh` | Public | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| **Auth** | `POST` | `/api/v1/auth/logout` | `requireAuth` | `{ refreshToken }` | `{ message: "Logged out successfully" }` |
| **Auth** | `GET` | `/api/v1/auth/me` | `requireAuth` | None | `{ id, email, isActive, roles, permissions }` |
| **Auth** | `POST` | `/api/v1/auth/change-password` | `requireAuth` | `{ currentPassword, newPassword }` | `{ message: "Password updated successfully" }` |
| **Users** | `GET` | `/api/v1/users` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | Query: `?page=1&limit=10` | `{ users: User[] }`, meta |
| **Users** | `POST` | `/api/v1/users` | `requireRole(['HEAD_OF_HR'])` | `{ email, password, roleIds }` | `User` |
| **Users** | `POST` | `/api/v1/users/:id/role` | `requireRole(['HEAD_OF_HR'])` | `{ roleIds: number[] }` | `User` |
| **Users** | `POST` | `/api/v1/users/:id/activate` | `requireRole(['HEAD_OF_HR'])` | `{ isActive: boolean }` | `User` |
| **Org** | `GET` | `/api/v1/departments` | `requireAuth` | None | `Department[]` |
| **Org** | `POST` | `/api/v1/departments` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | `{ name, code, description? }` | `Department` |
| **Org** | `GET` | `/api/v1/positions` | `requireAuth` | Query: `?departmentId` | `Position[]` |
| **Org** | `POST` | `/api/v1/positions` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | `{ title, code, departmentId, level? }` | `Position` |
| **Workforce** | `GET` | `/api/v1/workforce-requests` | `requireAuth` | Query: `?status&page&limit` | `WorkforceRequest[]`, meta |
| **Workforce** | `POST` | `/api/v1/workforce-requests` | `requireRole(['HR_RECRUITMENT', 'HR_ADMIN', 'HEAD_OF_HR'])` | `{ positionId, headcount, justification }` | `WorkforceRequest` |
| **Workforce** | `POST` | `/api/v1/workforce-requests/:id/submit` | `requireAuth` | None | `WorkforceRequest` |
| **Workforce** | `POST` | `/api/v1/workforce-requests/:id/approve` | `requireRole(['HEAD_OF_HR'])` | None | `WorkforceRequest` |
| **Workforce** | `POST` | `/api/v1/workforce-requests/:id/reject` | `requireRole(['HEAD_OF_HR'])` | `{ reason }` | `WorkforceRequest` |
| **Recruitment** | `GET` | `/api/v1/recruitment/requisitions` | `requireAuth` | Query: `?status` | `JobRequisition[]` |
| **Recruitment** | `POST` | `/api/v1/recruitment/requisitions` | `requireRole(['HR_RECRUITMENT', 'HEAD_OF_HR'])` | `{ workforceRequestId, title, requirements }` | `JobRequisition` |
| **Recruitment** | `GET` | `/api/v1/recruitment/postings` | `requireAuth` | Query: `?status` | `JobPosting[]` |
| **Recruitment** | `POST` | `/api/v1/recruitment/postings` | `requireRole(['HR_RECRUITMENT', 'HEAD_OF_HR'])` | `{ requisitionId, title, description, openings }` | `JobPosting` |
| **Recruitment** | `GET` | `/api/v1/recruitment/candidates` | `requireAuth` | Query: `?search` | `Candidate[]` |
| **Recruitment** | `POST` | `/api/v1/recruitment/applications` | `requireRole(['HR_RECRUITMENT', 'HEAD_OF_HR'])` | `{ candidateId, jobPostingId }` | `Application` |
| **Recruitment** | `PUT` | `/api/v1/recruitment/applications/:id/status` | `requireRole(['HR_RECRUITMENT', 'HEAD_OF_HR'])` | `{ status: ApplicationStatus }` | `Application` |
| **Recruitment** | `POST` | `/api/v1/recruitment/applications/:id/approve` | `requireRole(['HEAD_OF_HR'])` | None | `Application` |
| **Employees** | `GET` | `/api/v1/employees` | `requireAuth` | Query: `?departmentId&status&page&limit` | `Employee[]`, meta |
| **Employees** | `POST` | `/api/v1/employees` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | `{ candidateId, employeeId, hireDate, ... }` | `Employee` |
| **Employees** | `GET` | `/api/v1/employees/:id` | `requireAuth` | None | `EmployeeDetail` (with history & docs) |
| **Employees** | `POST` | `/api/v1/employees/:id/documents` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | Multipart: `file`, `documentType` | `EmployeeDocument` |
| **Employees** | `POST` | `/api/v1/employees/:id/onboarding/complete` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | None | `Employee` |
| **Employees** | `POST` | `/api/v1/employees/:id/activate` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | None | `Employee` |
| **Attendance** | `POST` | `/api/v1/check-in` | `requireAuth` | `{ employeeId }` | `Attendance` |
| **Attendance** | `POST` | `/api/v1/check-out` | `requireAuth` | `{ employeeId }` | `Attendance` |
| **Attendance** | `GET` | `/api/v1/timesheets` | `requireAuth` | Query: `?startDate&endDate&employeeId` | `Timesheet[]` |
| **Attendance** | `POST` | `/api/v1/leaves` | `requireAuth` | `{ employeeId, leaveTypeId, startDate, endDate, reason }` | `LeaveRequest` |
| **Attendance** | `POST` | `/api/v1/leaves/:id/approve` | `requireRole(['HEAD_OF_HR', 'HR_ATTENDANCE'])` | None | `LeaveRequest` |
| **Attendance** | `POST` | `/api/v1/overtime` | `requireAuth` | `{ employeeId, date, hours, reason }` | `OvertimeRequest` |
| **Attendance** | `POST` | `/api/v1/overtime/:id/approve` | `requireRole(['HEAD_OF_HR', 'HR_ATTENDANCE'])` | None | `OvertimeRequest` |
| **Payroll** | `GET` | `/api/v1/payroll/periods` | `requireAuth` | Query: `?year` | `PayrollPeriod[]` |
| **Payroll** | `POST` | `/api/v1/payroll/periods` | `requireRole(['HEAD_OF_HR', 'HR_PAYROLL'])` | `{ name, startDate, endDate }` | `PayrollPeriod` |
| **Payroll** | `POST` | `/api/v1/payroll/periods/:id/calculate` | `requireRole(['HEAD_OF_HR', 'HR_PAYROLL'])` | None | `PayrollCalculationResult` |
| **Payroll** | `POST` | `/api/v1/payroll/periods/:id/submit` | `requireRole(['HEAD_OF_HR', 'HR_PAYROLL'])` | None | `PayrollPeriod` |
| **Payroll** | `POST` | `/api/v1/payroll/periods/:id/approve` | `requireRole(['HEAD_OF_HR'])` | None | `PayrollPeriod` |
| **Payroll** | `POST` | `/api/v1/payroll/periods/:id/lock` | `requireRole(['HEAD_OF_HR'])` | None | `PayrollPeriod` |
| **Performance** | `GET` | `/api/v1/performance/cycles` | `requireAuth` | None | `PerformanceCycle[]` |
| **Performance** | `POST` | `/api/v1/performance/cycles` | `requireRole(['HEAD_OF_HR', 'HR_PERFORMANCE'])` | `{ title, startDate, endDate }` | `PerformanceCycle` |
| **Performance** | `POST` | `/api/v1/performance/reviews/:id/evaluate` | `requireRole(['HEAD_OF_HR', 'HR_PERFORMANCE'])` | `{ score, comments, ratings }` | `PerformanceReview` |
| **Performance** | `POST` | `/api/v1/performance/reviews/:id/finalize` | `requireRole(['HEAD_OF_HR', 'HR_PERFORMANCE'])` | None | `PerformanceReview` |
| **Promotions** | `POST` | `/api/v1/promotions/requests` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN', 'HR_PERFORMANCE'])` | `{ employeeId, newPositionId, newSalary, reason }` | `PromotionRequest` |
| **Promotions** | `POST` | `/api/v1/promotions/requests/:id/approve` | `requireRole(['HEAD_OF_HR'])` | None | `PromotionRequest` |
| **LND** | `GET` | `/api/v1/lnd/categories` | `requireAuth` | None | `TrainingCategory[]` |
| **LND** | `GET` | `/api/v1/lnd/trainings` | `requireAuth` | None | `Training[]` |
| **LND** | `POST` | `/api/v1/lnd/trainings` | `requireRole(['HEAD_OF_HR', 'HR_LND'])` | `{ title, categoryId, description }` | `Training` |
| **Notifications** | `GET` | `/api/v1/notifications` | `requireAuth` | Query: `?page&limit` | `Notification[]`, meta |
| **Notifications** | `GET` | `/api/v1/notifications/unread` | `requireAuth` | None | `{ unreadCount: number, notifications: Notification[] }` |
| **Notifications** | `POST` | `/api/v1/notifications/:id/read` | `requireAuth` | None | `Notification` |
| **Notifications** | `POST` | `/api/v1/notifications/mark-all-read` | `requireAuth` | None | `{ count: number }` |
| **Audit** | `GET` | `/api/v1/audit-logs` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | Query: `?action&module&page&limit` | `AuditLog[]`, meta |
| **Reports** | `GET` | `/api/v1/reports/dashboard` | `requireRole(['HEAD_OF_HR'])` | None | `DashboardMetrics` |
| **Reports** | `GET` | `/api/v1/reports/recruitment` | `requireRole(['HEAD_OF_HR', 'HR_RECRUITMENT'])` | Query: `?startDate&endDate` | `RecruitmentReport` |
| **Reports** | `GET` | `/api/v1/reports/employees` | `requireRole(['HEAD_OF_HR', 'HR_ADMIN'])` | Query: `?departmentId` | `EmployeeDistributionReport` |
| **Reports** | `GET` | `/api/v1/reports/attendance` | `requireRole(['HEAD_OF_HR', 'HR_ATTENDANCE'])` | Query: `?date&departmentId` | `AttendanceReport` |
| **Reports** | `GET` | `/api/v1/reports/payroll` | `requireRole(['HEAD_OF_HR', 'HR_PAYROLL'])` | Query: `?periodId` | `PayrollReport` |
| **Reports** | `GET` | `/api/v1/reports/performance` | `requireRole(['HEAD_OF_HR', 'HR_PERFORMANCE'])` | Query: `?cycleId` | `PerformanceReport` |
| **Reports** | `GET` | `/api/v1/reports/training` | `requireRole(['HEAD_OF_HR', 'HR_LND'])` | Query: `?categoryId` | `TrainingReport` |
