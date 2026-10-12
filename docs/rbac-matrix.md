# HRMS Role-Based Access Control (RBAC) Matrix

This matrix documents the 7 system HR officer roles, their associated backend permission scopes, frontend UI routes, navigation sidebar rules, role-aware dashboard integrations, and security enforcement policies.

---

## 1. System Roles Dictionary

| Role Name | Role ID | Domain Scope | Description |
| :--- | :--- | :--- | :--- |
| `HEAD_OF_HR` | 3 | Master HR Authority | Full administrative control with all 43 permissions and final approval rights across all modules. |
| `HR_RECRUITMENT` | 1 | Talent Acquisition | Manages workforce requisitions, job postings, candidate screening, interviews, and hiring pipeline. |
| `HR_ADMIN` | 5 | Personnel Administration | Manages organizational hierarchy, positions, employee records, onboarding, and promotions. |
| `HR_ATTENDANCE` | 6 | Time & Attendance | Manages employee shifts, clock-in/out records, timesheets, leave requests, and overtime logs. |
| `HR_PAYROLL` | 4 | Compensation & Payroll | Prepares and calculates payroll periods, overtime adjustments, deductions, and payslips. |
| `HR_PERFORMANCE` | 7 | Performance & PIP | Manages performance review cycles, KPIs, appraisal scorings, and performance improvement plans. |
| `HR_LND` | 2 | Learning & Development | Manages training course catalog, training plans, session attendance, and employee skill evaluations. |

---

## 2. Backend Permissions Matrix (43 Permissions)

Extracted directly from backend database schema (`prisma/schema.prisma`), seed configurations (`prisma/seed.ts`), and authorization middleware (`middlewares/auth.ts`):

| Permission String | HEAD_OF_HR | HR_RECRUITMENT | HR_ADMIN | HR_ATTENDANCE | HR_PAYROLL | HR_PERFORMANCE | HR_LND |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `ATTENDANCE_CREATE` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `ATTENDANCE_UPDATE` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `DEPARTMENT_CREATE` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `DEPARTMENT_READ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `DEPARTMENT_UPDATE` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `DOCUMENT_UPLOAD` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `EMPLOYEE_ACTIVATE` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `EMPLOYEE_CREATE` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `EMPLOYEE_READ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `EMPLOYEE_UPDATE` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `LEAVE_CREATE` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `LEAVE_UPDATE` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `LND_CREATE` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `LND_READ` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `LND_UPDATE` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `OVERTIME_CREATE` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `OVERTIME_UPDATE` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `PAYROLL_CREATE` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `PAYROLL_LOCK` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `PAYROLL_READ` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `PAYROLL_APPROVE` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `PERFORMANCE_APPROVE` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `PERFORMANCE_CREATE` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `PERFORMANCE_UPDATE` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `PIP_CREATE` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `PIP_UPDATE` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `POSITION_CREATE` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POSITION_READ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POSITION_UPDATE` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `PROMOTION_APPROVE` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `PROMOTION_CREATE` | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `PROMOTION_READ` | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `RECRUITMENT_CREATE` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `RECRUITMENT_READ` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `RECRUITMENT_UPDATE` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `SHIFT_CREATE` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `TIMESHEET_READ` | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `USER_CREATE` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `USER_READ` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `USER_ROLE_ASSIGN` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `WORKFORCE_CREATE` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `WORKFORCE_READ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `WORKFORCE_APPROVE` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Frontend Navigation & Module Access Matrix

| Module Name | Route Path | Authorized Roles | Functional Scope & Action Rights |
| :--- | :--- | :--- | :--- |
| **Role-Aware Dashboard** | `/dashboard` | All 7 HR Roles | Displays only the role's authorized KPIs, pipeline summaries, and module shortcuts |
| **Departments & Structure** | `/organization` | `HEAD_OF_HR`, `HR_ADMIN` | View and manage organizational trees, department nodes, positions |
| **Workforce Planning** | `/workforce` | `HEAD_OF_HR`, `HR_RECRUITMENT`, `HR_ADMIN` | Create/view requests (All); Approve/Reject (`HEAD_OF_HR` only) |
| **Recruitment & ATS** | `/recruitment` | `HEAD_OF_HR`, `HR_RECRUITMENT` | Manage job postings, applications, interviews; Approve candidate (`HEAD_OF_HR` only) |
| **Employee Directory** | `/employees` | `HEAD_OF_HR`, `HR_ADMIN` | Personnel records, onboarding documents, status lifecycle |
| **Attendance & Leaves** | `/attendance` | `HEAD_OF_HR`, `HR_ATTENDANCE` | Time punches, shifts, leave requests, overtime management |
| **Payroll Processing** | `/payroll` | `HEAD_OF_HR`, `HR_PAYROLL` | Prepare pay runs, adjust salaries; Final approve & lock (`HEAD_OF_HR` only) |
| **Performance & PIP** | `/performance` | `HEAD_OF_HR`, `HR_PERFORMANCE` | Performance appraisals, goal evaluation, PIP management |
| **Learning & Dev** | `/lnd` | `HEAD_OF_HR`, `HR_LND` | Course catalog, employee assignments, sessions, skill ratings |
| **Audit Trails** | `/audit-logs` | `HEAD_OF_HR`, `HR_ADMIN` | Immutable read-only system audit log search & timeline |

---

## 4. Role-Specific Dashboard Metrics & API Contracts

All metrics are fetched exclusively from verified backend report endpoints in `reportRoutes.ts`:

| Role Name | Backend Report Endpoint | Authorized Metrics Displayed |
| :--- | :--- | :--- |
| `HEAD_OF_HR` | `GET /api/v1/reports/dashboard` | Organization headcount, active workforce %, new hires, pending approval counters (workforce, recruitment, payroll), latest payroll payout, daily attendance punches, leave counts. |
| `HR_RECRUITMENT` | `GET /api/v1/reports/recruitment` | Open job vacancies, total candidate applications, shortlisted candidates, scheduled interviews, extended offers, hired candidates, pipeline status breakdown tags. |
| `HR_ADMIN` | `GET /api/v1/reports/employees` | Total employee records, new hires (last 30 days), configured department count, position types count, personnel status distribution tags. |
| `HR_ATTENDANCE` | `GET /api/v1/reports/attendance` | Approved overtime hours, today's attendance punches breakdown (PRESENT, ABSENT, LATE, HALF_DAY), active leave requests by status. |
| `HR_PAYROLL` | `GET /api/v1/reports/payroll` | Total pay runs processed, net payout total, gross earnings, basic salaries, total allowances, overtime payout, deductions breakdown. |
| `HR_PERFORMANCE` | `GET /api/v1/reports/performance` | Average overall appraisal score (out of 5.0), active PIP count, review cycles tracked, review status breakdown tags. |
| `HR_LND` | `GET /api/v1/reports/training` | Total training enrollments, average course evaluation rating (out of 5.0), training course completion status breakdown tags, session attendance rates. |

---

## 5. Security & RBAC Enforcement Architecture

1. **Zero-Trust Route Guards**:
   - `ProtectedRoute`: Unauthenticated requests visiting protected routes are intercepted and redirected to `/login`.
   - `RoleGuard`: Authenticated users visiting routes unauthorized for their role are denied and presented with the dedicated `Forbidden403` component.
2. **Sidebar Menu Pruning**:
   - Navigation links are filtered dynamically via `filterNavByRoles()`. Parent menu groups with zero accessible child links are completely pruned from DOM rendering.
3. **No Frontend Security Substitution**:
   - Frontend route hiding is treated purely as UX convenience. All sensitive backend routes are independently guarded by `requireRole` and `requirePermission` middleware.
4. **Stale Cache Purging**:
   - `useAuthStore` executes `queryClient.clear()` upon both `login()` and `logout()` to guarantee zero cross-account data leakage when switching users in the same browser session.
5. **Multi-Role Handling**:
   - For users holding multiple roles (e.g., `['HR_ADMIN', 'HR_RECRUITMENT']`), the dashboard provides a segmented role switcher allowing seamless toggling between authorized role perspectives without exposing unauthorized endpoints.

---

## 6. Unresolved Permission Questions & Backend Gap Analysis

1. **User Management Module (`/users`)**:
   - Currently, `userRoutes.ts` allows `HEAD_OF_HR` to activate/deactivate users, and requires `USER_CREATE`, `USER_READ`, `USER_ROLE_ASSIGN`. A dedicated navigation item for system user administration should be scheduled for later governance phases.
2. **Promotion Approvals**:
   - Both `HR_ADMIN` and `HR_PERFORMANCE` can create promotion requests (`PROMOTION_CREATE`), but `PROMOTION_APPROVE` is reserved strictly for `HEAD_OF_HR`.
3. **Audit Trail Scope**:
   - `auditRoutes.ts` allows `HEAD_OF_HR` and `HR_ADMIN` to query system logs. Officer roles without `HR_ADMIN` cannot access audit logs.
