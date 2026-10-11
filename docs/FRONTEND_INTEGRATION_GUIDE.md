# HRMS Frontend Integration Guide 🚀

Welcome frontend developers! This document outlines everything you need to connect the frontend application to the HRMS backend API smoothly, including base URLs, authentication flows, RBAC role handling, response structures, and a complete endpoint inventory.

---

## 🌐 1. Server & Environment Setup

### Base URLs
| Environment | Base URL | Note |
| :--- | :--- | :--- |
| **Docker (Production)** | `http://localhost:3001/api/v1` | When running backend via Docker Compose |
| **Local Node.js (Dev)** | `http://localhost:3000/api/v1` | When running `npm run dev` in backend |

### Common Headers
Except for multipart file uploads, every API request must send:
```http
Content-Type: application/json
Accept: application/json
```
For authenticated requests:
```http
Authorization: Bearer <accessToken>
```

---

## 🔐 2. Authentication & Token Management

Authentication is JWT-based with short-lived **access tokens** (15 mins) and persistent **refresh tokens** (7 days).

### Login Flow
* **Endpoint:** `POST /api/v1/auth/login`
* **Request Body:**
```json
{
  "email": "head@hr.local",
  "password": "password123"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "bf8c53fa8944c6dfe...",
    "user": {
      "id": 1,
      "email": "head@hr.local",
      "roles": ["HEAD_OF_HR"]
    }
  }
}
```

### Token Refresh Flow
When an API call returns `401 Unauthorized` due to token expiry, call the refresh endpoint:
* **Endpoint:** `POST /api/v1/auth/refresh`
* **Request Body:**
```json
{
  "refreshToken": "bf8c53fa8944c6dfe..."
}
```
* **Response:** Returns a fresh `accessToken` and `refreshToken`. Update your state/localStorage.

### Logout Flow
* **Endpoint:** `POST /api/v1/auth/logout`
* **Request Body:**
```json
{
  "refreshToken": "bf8c53fa8944c6dfe..."
}
```

---

## 🛡️ 3. Role-Based Access Control (RBAC)

The backend provides strict role-based access. The `user.roles` array in the login payload indicates the current user's role. Use this to toggle UI routes and action buttons.

### Role Dictionary
| Role Name | Description & UI Scope |
| :--- | :--- |
| `HEAD_OF_HR` | **Full access**: Master dashboard, approvals across all modules, report views |
| `HR_RECRUITMENT` | Workforce planning, job requisitions, postings, candidate screening & interviews |
| `HR_ADMIN` | Organization setup, employee profiles, onboarding, promotion preparation |
| `HR_ATTENDANCE` | Shift mapping, clock-in/out tracking, leave approvals, overtime management |
| `HR_PAYROLL` | Payroll periods, salary calculation, allowances, deductions, payslips |
| `HR_PERFORMANCE` | Performance cycles, KPI setting, goal tracking, reviews, PIPs |
| `HR_LND` | Training catalogs, training plans, sessions, evaluations, skills tracking |

---

## 📦 4. Standardized Response Envelope

Every backend response strictly adheres to this envelope format:

### Success Format (`success: true`)
```typescript
interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Error Format (`success: false`)
```typescript
interface ApiError {
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

## 🗺️ 5. Complete API Endpoint Catalog

All paths are prefixed with `/api/v1`.

### 👤 Authentication & Users
- `POST /auth/login` – Login with email & password
- `POST /auth/refresh` – Obtain new token pair
- `POST /auth/logout` – Revoke refresh token
- `GET /users` – List all system users (supports pagination `?page=1&limit=10`)
- `POST /users` – Create new user account
- `POST /users/:id/role` – Assign role to user
- `POST /users/:id/activate` – Toggle active/inactive status

### 🏢 Organization Structure
- `GET|POST /departments` – List or create departments
- `GET|PUT|DELETE /departments/:id` – Department CRUD
- `GET|POST /positions` – List or create positions
- `GET|PUT|DELETE /positions/:id` – Position CRUD

### 👥 Workforce Planning
- `GET|POST /workforce` – List requests or submit headcount request
- `GET /workforce/:id` – Get workforce request detail
- `POST /workforce/:id/submit` – Submit request for approval
- `POST /workforce/:id/approve` – Approve request (`HEAD_OF_HR` only)
- `POST /workforce/:id/reject` – Reject request (`HEAD_OF_HR` only)

### 🎯 Recruitment Lifecycle
- `GET|POST /recruitment/requisitions` – Job requisitions
- `POST /recruitment/requisitions/:id/approve` – Requisition approval
- `GET|POST /recruitment/postings` – Job postings
- `GET|POST /recruitment/candidates` – Candidate profiles
- `POST /recruitment/applications` – Apply candidate to job posting
- `PUT /recruitment/applications/:id/status` – Update screening status
- `POST /recruitment/applications/:id/approve` – Approve candidate for hiring (`HEAD_OF_HR` only)
- `POST /recruitment/interviews` – Schedule interview
- `POST /recruitment/interviews/:id/evaluations` – Submit interview score/feedback

### 👨‍💼 Employee Management
- `GET|POST /employees` – List employees (filter by `departmentId`, `status`) or create draft profile
- `GET /employees/:id` – Full employee profile (includes contact, position history, documents)
- `POST /employees/:id/documents` – Upload document (**Multipart/Form-Data**, keys: `file`, `documentType`)
- `POST /employees/:id/onboarding/complete` – Mark onboarding workflow as completed
- `POST /employees/:id/activate` – Activate employee (enables attendance and payroll)
- `PUT /employees/:id/position` – Update position (records position history)

### ⏰ Attendance & Leaves
- `POST /attendance/check-in` – Employee clock-in
- `POST /attendance/check-out` – Employee clock-out
- `GET /attendance/timesheets` – Query timesheet logs
- `GET|POST /attendance/shifts` – Shift schedules
- `POST /attendance/leaves` – Request leave (Annual, Sick, Maternity, etc.)
- `POST /attendance/leaves/:id/approve` – Approve leave
- `POST /attendance/overtime` – Request overtime
- `POST /attendance/overtime/:id/approve` – Approve overtime

### 💵 Payroll Processing
- `GET|POST /payroll/periods` – List or create payroll cycles (e.g. `2026-10`)
- `POST /payroll/periods/:id/calculate` – Trigger automated calculation for all active employees
- `POST /payroll/periods/:id/submit` – Submit prepared payroll for review
- `POST /payroll/periods/:id/approve` – Approve payroll (`HEAD_OF_HR` only)
- `POST /payroll/periods/:id/lock` – Lock payroll period (prevents retroactive edits)
- `GET /payroll/employees/:employeeId/payslips` – Retrieve employee payslips

### 📈 Performance Management & PIP
- `GET|POST /performance/cycles` – Evaluation cycles
- `GET|POST /performance/goals` – Company & departmental goals
- `POST /performance/reviews/:id/evaluate` – Score employee evaluation
- `POST /performance/reviews/:id/finalize` – Lock performance review
- `POST /promotions/requests` – Submit promotion/raise request
- `POST /promotions/requests/:id/approve` – Approve promotion (`HEAD_OF_HR` only)
- `GET|POST /pips` – Performance Improvement Plans for struggling employees

### 📚 Learning & Development (L&D)
- `GET|POST /lnd/categories` – Training categories
- `GET|POST /lnd/trainings` – Training course catalog
- `GET|POST /lnd/plans` – Company training schedules
- `POST /lnd/sessions/:id/attendance` – Record session attendance
- `POST /lnd/evaluations` – Submit course feedback/score
- `POST /lnd/employees/:id/skills` – Update verified employee skills

### 🔔 Central Notifications
- `GET /notifications` – In-app notifications
- `GET /notifications/unread` – Count and list of unread alerts
- `POST /notifications/:id/read` – Mark notification as read
- `POST /notifications/mark-all-read` – Mark all as read

### 📊 Real-Time Analytics & Reports
- `GET /reports/dashboard` – Holistic metrics summary (headcounts, pending approvals, alerts)
- `GET /reports/recruitment` – Application funnel, time-to-hire, vacancies
- `GET /reports/employees` – Department distributions, turnover
- `GET /reports/attendance` – Attendance rates, total overtime hours
- `GET /reports/payroll` – Gross, net salaries, allowance breakdowns
- `GET /reports/performance` – Average ratings, promotion candidates
- `GET /reports/training` – Training completion and feedback scores

---

## 🧪 6. Testing Accounts

You can test all scenarios with the seeded credentials:

| Email | Password | Assigned Role | Permissions |
| :--- | :--- | :--- | :--- |
| `head@hr.local` | `password123` | `HEAD_OF_HR` | Full 43-permission system access |

---

## 💡 7. Frontend Development Tips

1. **Axios Interceptor for Token Refresh**:
   Implement an Axios response interceptor that catches `401` errors, calls `POST /api/v1/auth/refresh`, updates the token, and retries the original request automatically.
2. **File Uploads**:
   When uploading documents (`POST /api/v1/employees/:id/documents`), construct a `FormData` instance and do not explicitly set the `Content-Type` header (let the browser calculate the multipart boundary).
3. **Postman Reference**:
   Import `docs/HRMS_API.postman_collection.json` into Postman for live request samples and sample payloads.
