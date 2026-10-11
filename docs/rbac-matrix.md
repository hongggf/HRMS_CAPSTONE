# HRMS Role-Based Access Control (RBAC) Matrix

This matrix documents the 7 system roles, their associated permission scopes, and how they map to frontend UI routes, navigation sidebar menus, and actionable controls.

---

## 1. System Roles Dictionary

| Role Name | ID | Description |
| :--- | :--- | :--- |
| `HEAD_OF_HR` | 3 | Master HR authority with all 43 permissions and final approval rights |
| `HR_RECRUITMENT` | 1 | Manages workforce requisitions, job postings, candidate screening & interviews |
| `HR_ADMIN` | 5 | Manages organizational entities, employee records, onboarding, and promotions |
| `HR_ATTENDANCE` | 6 | Manages employee shifts, attendance records, leaves, and overtime |
| `HR_PAYROLL` | 4 | Prepares and calculates payroll periods, overtime adjustments, and deductions |
| `HR_PERFORMANCE` | 7 | Manages performance review cycles, KPIs, goals, and improvement plans |
| `HR_LND` | 2 | Manages course catalog, training plans, attendance, and skill evaluations |

---

## 2. Frontend Navigation & Route Permissions Matrix

| Navigation Menu / Route | Path | Roles Permitted | Action Controls Scope |
| :--- | :--- | :--- | :--- |
| **Executive Dashboard** | `/dashboard` | `HEAD_OF_HR` | Full KPI cards, pending approval quick-links |
| **Department & Positions** | `/organization` | `HEAD_OF_HR`, `HR_ADMIN` | Create, Edit, View structure |
| **Workforce Planning** | `/workforce` | `HEAD_OF_HR`, `HR_RECRUITMENT`, `HR_ADMIN` | Submit request (All); Approve/Reject (`HEAD_OF_HR` only) |
| **Recruitment Portal** | `/recruitment` | `HEAD_OF_HR`, `HR_RECRUITMENT` | Post jobs, schedule interviews; Final candidate hire (`HEAD_OF_HR` only) |
| **Employee Directory** | `/employees` | `HEAD_OF_HR`, `HR_ADMIN` | Create employee, upload documents, complete onboarding, activate |
| **Attendance & Shifts** | `/attendance` | `HEAD_OF_HR`, `HR_ATTENDANCE` | Clock in/out, view timesheets, approve leave & overtime |
| **Payroll Processing** | `/payroll` | `HEAD_OF_HR`, `HR_PAYROLL` | Calculate payroll (All); Approve & Lock (`HEAD_OF_HR` only) |
| **Performance & Goals** | `/performance` | `HEAD_OF_HR`, `HR_PERFORMANCE` | Create cycles, evaluate reviews, track PIPs |
| **Promotions** | `/promotions` | `HEAD_OF_HR`, `HR_ADMIN`, `HR_PERFORMANCE` | Prepare request (All); Final Approval (`HEAD_OF_HR` only) |
| **Learning & Development** | `/lnd` | `HEAD_OF_HR`, `HR_LND` | Manage trainings, sessions, attendance, skills |
| **System Users & Roles** | `/users` | `HEAD_OF_HR` | Create users, assign roles, toggle activation |
| **Audit Trails** | `/audit-logs` | `HEAD_OF_HR`, `HR_ADMIN` | Immutable read-only chronological search & filter |

---

## 3. Supplementary Frontend UI Enforcement
1. **Sidebar Menu Visibility**: Inaccessible routes are completely omitted from the navigation menu based on `user.roles`.
2. **Route Guards**: Any direct URL navigation to unauthorized paths returns the `<Forbidden403 />` view.
3. **Action Button Hiding & Disabling**: Mutating action buttons (e.g. `Approve Headcount`, `Approve Candidate`, `Approve Payroll`, `Lock Period`) are only rendered if the user possesses `HEAD_OF_HR`.
