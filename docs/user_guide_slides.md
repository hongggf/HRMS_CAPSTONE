---
marp: true
theme: default
paginate: true
header: "HRMS Enterprise Suite — End-to-End User Guide"
footer: "Confidential | © 2026 HRMS Platform | Enterprise Operations Manual"
style: |
  section {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    padding: 36px 48px;
    font-size: 18px;
    line-height: 1.5;
    background-color: #f8fafc;
    color: #1e293b;
  }
  h1 {
    color: #0f172a;
    font-size: 32px;
    margin-bottom: 8px;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 6px;
  }
  h2 {
    color: #1e3a8a;
    font-size: 24px;
    margin-top: 0;
    margin-bottom: 12px;
  }
  h3 {
    color: #2563eb;
    font-size: 19px;
    margin-top: 8px;
    margin-bottom: 6px;
  }
  .title-slide {
    text-align: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .title-slide h1 {
    color: #ffffff;
    font-size: 42px;
    border-bottom: 3px solid #60a5fa;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .title-slide h2 {
    color: #93c5fd;
    font-size: 24px;
    font-weight: 400;
  }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    margin-right: 6px;
  }
  .badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
  .badge-green { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .badge-purple { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
  .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
  }
  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .card-highlight {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 14px 18px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    margin-top: 8px;
  }
  th {
    background: #1e293b;
    color: #ffffff;
    text-align: left;
    padding: 8px 12px;
  }
  td {
    border-bottom: 1px solid #e2e8f0;
    padding: 7px 12px;
    background: #ffffff;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }
  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: #2563eb;
    color: #ffffff;
    border-radius: 50%;
    font-size: 13px;
    font-weight: bold;
    margin-right: 8px;
  }
  .alert-box {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    padding: 10px 14px;
    border-radius: 4px;
    margin-top: 10px;
    font-size: 14px;
    color: #92400e;
  }
---

<!-- _class: title-slide -->

# HRMS ENTERPRISE SUITE
## Comprehensive End-to-End User Guide & Operational Manual
### All Roles • Complete Workflows • Platform Standards

**Application Version:** 2.0.0 (Production Release)  
**Target Audience:** Head of HR, HR Administrators, Recruiters, Attendance & Payroll Officers, Performance/L&D Specialists, and Employees

---

# Presentation Deck Architecture

<div class="grid-2">

<div class="card">

### 1. Platform & Governance
- **Slide 1–5:** System Architecture, Personas & Navigation
- **Slide 6–9:** Authentication, Security & Tasks Center

### 2. Departmental Operations
- **Slide 10–15:** HR Admin (`HR_ADMIN`) Guide
- **Slide 16–21:** HR Recruitment (`HR_RECRUITMENT`) Guide
- **Slide 22–27:** HR Attendance (`HR_ATTENDANCE`) Guide
- **Slide 28–34:** HR Payroll (`HR_PAYROLL`) Guide

</div>

<div class="card">

### 3. Executive Review & Talent
- **Slide 35–40:** Head of HR (`HEAD_OF_HR`) Guide
- **Slide 41–44:** Performance & Learning (`HR_PERFORMANCE`, `HR_LND`)

### 4. Staff & Support
- **Slide 45–48:** Employee Self-Service (ESS) Guide
- **Slide 49–50:** Troubleshooting, FAQ & Best Practices

</div>

</div>

<!-- Note: This presentation is designed for cross-functional onboarding, role-specific certifications, and executive compliance audits. -->

---

# Platform Architecture & Module Ecosystem

The HRMS platform unifies seven core domains into a single enterprise system:

<div class="grid-3">

<div class="card">
<span class="badge badge-blue">Structure</span>
<h4>Organization & Workforce</h4>
Departments tree, position bands, budget quotas, and headcount approval requests.
</div>

<div class="card">
<span class="badge badge-purple">Talent</span>
<h4>Recruitment & ATS</h4>
Job requisitions, postings, candidate screening, interviews, and hiring pipeline.
</div>

<div class="card">
<span class="badge badge-green">Operations</span>
<h4>Attendance & Leaves</h4>
Shifts, real-time punch logs, corrections, overtime tracking, and approved timesheets.
</div>

<div class="card">
<span class="badge badge-amber">Finance</span>
<h4>Authoritative Payroll</h4>
Calculation engine, salary adjustments, validation audits, locking, and bank CSV exports.
</div>

<div class="card">
<span class="badge badge-blue">Growth</span>
<h4>Performance & L&D</h4>
Appraisals, KPI scorings, PIPs, training course catalog, and skill evaluations.
</div>

<div class="card">
<span class="badge badge-red">Security</span>
<h4>Governance & Tasks</h4>
Multi-tab workspace (TagsView), real-time notifications, unified executive inbox, audit trails.
</div>

</div>

<!-- Note: Explain how each module connects cleanly: Workforce -> Recruitment -> Employee -> Attendance -> Payroll -> General Ledger. -->

---

# User Personas & Role-Based Access Hierarchy

| System Role | Scope & Authority | Primary Responsibilities | Default Seed Account |
| :--- | :--- | :--- | :--- |
| **`HEAD_OF_HR`** | Master HR Authority | Full access (43 permissions), final approver across all modules | `head@hr.local` |
| **`HR_ADMIN`** | Personnel Administration | Org structures, positions, employee records, promotions | `admin@hr.local` |
| **`HR_RECRUITMENT`** | Talent Acquisition | Headcount requests, requisitions, job ads, ATS, candidate evaluations | `recruiter@hr.local` |
| **`HR_ATTENDANCE`** | Time & Attendance | Shift scheduling, punch logs, anomaly corrections, leaves & OT | `attendance@hr.local` |
| **`HR_PAYROLL`** | Compensation & Benefits | Pay periods, calculations, adjustments, validation scans, payslips | `payroll@hr.local` |
| **`HR_PERFORMANCE`** | Performance & PIP | Review cycles, KPI targets, appraisals, PIP management | `performance@hr.local` |
| **`HR_LND`** | Training & Development | Training courses, enrollments, sessions, skill certifications | `lnd@hr.local` |
| **`EMPLOYEE`** | Staff Self-Service (ESS) | Clock-in/out, submit leave & OT, inspect personal payslips | Individual employee logins |

<!-- Note: Point out that all seed accounts share the default development password: password123. -->

---

# Platform Access & Navigation Anatomy

<div class="grid-2">

<div class="card">

### Key Navigation Elements
- **App Header:** Global brand, Real-Time Socket Connection status badge, Notification Bell counter, User Profile dropdown.
- **Sidebar Menu:** Role-filtered dynamically. Modules without permission are automatically pruned from DOM.
- **Multi-Tab Workspace (TagsView):** Keep multiple records (e.g. Employee #102 + Payroll Period #5) open simultaneously without losing form state.
- **Breadcrumb Trail:** Immediate contextual hierarchy locator.

</div>

<div class="card">

### System Environment URLs
- **Web Application Portal:**  
  `http://localhost:5173` (or production domain)
- **API Backend Endpoint:**  
  `http://localhost:3000/api/v1`
- **Socket Real-Time Server:**  
  Integrated over WebSocket at port `3000`
- **Supported Browsers:**  
  Chrome 90+, Edge 90+, Firefox 88+, Safari 14+

</div>

</div>

<div class="alert-box">
💡 <b>Pro Tip:</b> Right-click any tab in the TagsView bar to "Close Others", "Close Tabs to the Right", or "Refresh Active Tab".
</div>

<!-- Note: Emphasize the TagsView feature which allows HR personnel to work on multiple records at once. -->

---

# Authentication, Session & Multi-Role Switching

<div class="grid-2">

<div class="card">

### Authentication Flow
1. **Access Portal:** Navigate to `/login`.
2. **Submit Credentials:** Input corporate email and password.
3. **Token Issuance:** System generates short-lived access JWT (15 min) and secure refresh token (7 days).
4. **Cache Cleansing:** Client automatically runs `queryClient.clear()` upon login and logout to eliminate data leakage.

</div>

<div class="card">

### Multi-Role Officer Support
- For officers assigned multiple roles (e.g., `HR_ADMIN` + `HR_RECRUITMENT`):
  - A **Segmented Role Switcher** appears atop the dashboard.
  - Officers can toggle active operational perspectives on the fly.
  - Sidebar and metrics instantly adapt without requiring re-login.

</div>

</div>

<div class="card-highlight" style="margin-top: 14px;">
<b>Separation of Duties (SoD) Protocol:</b> In accordance with corporate governance, users acting in a preparation role (e.g., HR Payroll) cannot approve their own batches, even if holding dual roles.
</div>

<!-- Note: Explain how multi-role toggling simplifies life for HR generalists wearing multiple hats in regional offices. -->

---

# Self-Service Password Governance

<div class="grid-2">

<div class="card">

### Password Policy Constraints
To guarantee enterprise security, all password modifications require:
- **Minimum 8 characters** in total length.
- At least **1 uppercase letter** ($A-Z$).
- At least **1 lowercase letter** ($a-z$).
- At least **1 numerical digit** ($0-9$).
- At least **1 special character** (`!@#$%^&*`).
- **History Enforcement:** New password must not match current password.

</div>

<div class="card">

### Security Protections
- **Global Session Revocation:** Changing your password instantly invalidates all existing refresh tokens across all browsers/devices.
- **Brute-Force Rate Limiting:** Maximum 3 password change attempts per hour per account.
- **Audit Logging:** Every password reset logs a permanent immutable event in the audit trail.

</div>

</div>

<div class="alert-box">
⚠️ <b>First-Time Login Requirement:</b> All new staff seeded with <code>password123</code> should immediately navigate to <b>Profile Menu &gt; Change Password</b> to secure their account.
</div>

<!-- Note: Review the 3 attempts per hour rate limiting rule. -->

---

# Zero-Trust Security & Role Guards

<div class="grid-2">

<div class="card">

### 1. Dual-Layer Route Guards
- **`ProtectedRoute`**: Intercepts unauthenticated requests, preserving the intended destination URL and redirecting to `/login`.
- **`RoleGuard`**: Validates authenticated JWT roles against target routes. Unauthorized attempts are blocked with a dedicated `403 Forbidden` screen.

</div>

<div class="card">

### 2. Backend Permission Enforcement
- Frontend button hiding is purely for user experience.
- The Express backend independently executes `requireRole()` and `requirePermission()` middleware on every REST invocation.
- Attempting to bypass the UI produces a strict `403 Access Denied` response.

</div>

</div>

```
[User Request] 
      │
      ▼
[Client Route Guard] ──── Unauthorized ───► [403 Forbidden Screen]
      │ Allowed
      ▼
[Express Auth Middleware (JWT)] ─── Invalid ───► [401 Unauthorized]
      │ Valid
      ▼
[RBAC Permission Validator] ────── Forbidden ──► [403 Forbidden Response]
      │ Authorized
      ▼
[Controller Business Logic & Prisma DB Transaction]
```

<!-- Note: Reinforce that security is enforced at both client and server layers. -->

---

# Unified Tasks & Approvals Center (`/tasks`)

The central nervous system for approvals and workflow management:

<div class="grid-3">

<div class="card">
<h4>Pending Approvals</h4>
Unified inbox aggregating all requests requiring your review:
- Workforce Headcount
- Job Requisitions
- Leaves & Overtime
- Payroll Periods
- Promotions
</div>

<div class="card">
<h4>Drafts & Submissions</h4>
Track status of requests submitted by your team:
- Edit draft items
- View reviewer remarks
- Inspect pending days
- Monitor overdue escalations
</div>

<div class="card">
<h4>Actions & Escalation</h4>
- **Approve / Reject** with mandatory remarks modal
- **Follow-Up Ping:** Send real-time notification reminder to assigned approver
- **Batch Processing:** Multi-select approval for routine items
</div>

</div>

<div class="card-highlight" style="margin-top: 14px;">
<b>Task Status Cycle:</b> <code>DRAFT</code> ➔ <code>SUBMITTED</code> / <code>PENDING_APPROVAL</code> ➔ <code>APPROVED</code> or <code>REJECTED</code>
</div>

<!-- Note: Show how the Tasks center eliminates email ping-pong and lost approvals. -->

---

# Role Guide: HR Administrator (`HR_ADMIN`)

<div class="grid-2">

<div class="card">

### Role Mission & Profile
- **Domain:** Personnel Administration & Master Data
- **Permissions:** 14 Permissions (Departments, Positions, Employees, Onboarding, Documents, Status Transitions, Promotions)
- **Primary Route:** `/organization`, `/employees`, `/tasks`
- **Dashboard Metrics:**
  - Total Employee Headcount
  - New Hires (Last 30 Days)
  - Active Departments & Positions Count
  - Personnel Status Distribution Breakdown

</div>

<div class="card">

### Key Operational Responsibilities
1. Model organization hierarchy, parent departments, and cost centers.
2. Define standardized position titles and salary bands.
3. Create and onboard employee master records.
4. Manage compliance documents (contracts, ID, certificates).
5. Record employee promotions, transfers, and status changes.

</div>

</div>

<!-- Note: HR Admin is the foundation of the platform; without accurate org records, payroll and attendance cannot operate. -->

---

# HR Admin: Department Hierarchy (`/organization`)

<div class="grid-2">

<div class="card">

### Step-by-Step Department Creation
1. Navigate to **Organization & Workforce > Departments & Structure**.
2. Select the **Departments** tab.
3. Click **`+ Add Department`**.
4. Complete the Department Modal:
   - **Department Name:** e.g., `Engineering` or `Talent Acquisition`.
   - **Department Code:** Unique identifier (e.g., `ENG-01`).
   - **Parent Department:** Nest under executive tree or leave blank for root.
   - **Department Head:** Designate lead employee.
   - **Annual Budget:** Allocated fiscal amount.
5. Click **Save Department**.

</div>

<div class="card">

### Department Actions & Hierarchy View
- **Tree View Mode:** Visualize organizational reporting structures from C-suite down to squad levels.
- **Edit Department:** Update department code, budget allocation, or change parent lineage.
- **Deactivate:** Soft-delete departments with 0 active employees.

</div>

</div>

<div class="alert-box">
⚠️ <b>Integrity Rule:</b> A department containing active positions or employees cannot be deleted until dependencies are re-assigned.
</div>

<!-- Note: Show how nesting departments automatically rolls up budgets in reporting. -->

---

# HR Admin: Positions & Compensation Bands

<div class="grid-2">

<div class="card">

### Defining Standardized Positions
1. On `/organization`, switch to the **Positions** tab.
2. Click **`+ Create Position`**.
3. Complete position parameters:
   - **Position Title:** e.g., `Senior Full-Stack Engineer`.
   - **Job Code:** e.g., `POS-ENG-04`.
   - **Department:** Link to authorized department node.
   - **Job Level:** Junior, Mid, Senior, Lead, Director.
   - **Salary Range:** Specify Min ($Base_{min}$) and Max ($Base_{max}$).
4. Click **Create Position**.

</div>

<div class="card">

### Compensation Governance
- **Band Enforcement:** When creating employees or proposing promotions, the system checks base salaries against defined min/max bands.
- **Requisition Compliance:** Job requisitions inherit approved position salary ranges automatically, preventing out-of-budget candidate offers.

</div>

</div>

<!-- Note: Emphasize how compensation bands prevent salary disparity across teams. -->

---

# HR Admin: Employee Directory (`/employees`)

<div class="grid-2">

<div class="card">

### 1. Creating a New Personnel Record
1. Navigate to **Talent & Employees > Employee Directory**.
2. Click **`+ Add Employee`** in the top action bar.
3. Enter primary details:
   - Personal info: Full Name, Email, Phone, National ID.
   - Placement: Select Department and Assigned Position.
   - Compensation: Base Salary ($Basic$), Currency.
   - Employment Date: First working day ($HireDate$).
4. System automatically provisions:
   - Unique Employee ID (e.g., `EMP-2026-0042`).
   - Linked User Account for platform login.
   - Default Attendance & Shift profile.

</div>

<div class="card">

### 2. Personnel Status Lifecycle
The system enforces state-machine lifecycle tracking:
- `PROBATION`: Initial onboarding stage.
- `ACTIVE`: Full-time verified staff.
- `ON_LEAVE`: Extended leave of absence.
- `SUSPENDED`: Disciplinary hold.
- `TERMINATED`: Offboarded staff (deactivates user login and payroll disbursements).

</div>

</div>

<!-- Note: Demonstrate how employee code auto-generation prevents duplicate records. -->

---

# HR Admin: Document Vault & Onboarding

<div class="grid-2">

<div class="card">

### Employee Document Management
1. In the Employee Directory, click **`View Profile`** on any staff record.
2. The **Employee Detail Drawer** slides open.
3. Select the **Documents** tab.
4. Click **`Upload Document`**:
   - Choose document type: *Employment Contract, Government ID, Academic Degree, Tax Exemption, Medical*.
   - Drag & drop file (PDF, PNG, JPG up to 10MB).
   - Enter expiry date (if applicable) for compliance tracking.
5. Uploaded files are encrypted, versioned, and audit-stamped with uploader identity.

</div>

<div class="card">

### Onboarding Tracking
- **Onboarding Status Tracker:** Monitor `PENDING_DOCUMENTS`, `IN_REVIEW`, and `COMPLETED`.
- **Automated Alerts:** Approaching document expirations trigger dashboard warning flags.

</div>

</div>

<div class="alert-box">
🔒 <b>Privacy Control:</b> Sensitive personnel files are restricted strictly to <code>HEAD_OF_HR</code> and <code>HR_ADMIN</code> roles.
</div>

<!-- Note: Point out that documents are stored with sha256 checksums for audit integrity. -->

---

# HR Admin: Promotions, Transfers & Life Events

<div class="grid-2">

<div class="card">

### Initiating a Promotion or Transfer
1. Open the target employee's **Employee Detail Drawer**.
2. Click **`Update Position / Promote`**.
3. In the update dialog:
   - Select **New Department** (if transferring).
   - Select **New Position Title**.
   - Input **Adjusted Base Salary** ($Basic_{new}$).
   - Specify **Effective Date**.
   - Input **Justification Remarks** (e.g., *Annual cycle top-performer promotion*).
4. Click **Submit Promotion Request**.

</div>

<div class="card">

### Approval Workflow & History
- Creates a `PROMOTION` approval item in `/tasks`.
- Routes to `HEAD_OF_HR` for executive sign-off.
- **Position History Tab:** Once approved, previous titles, dates, salary delta, and approving officer are logged permanently.
- Payroll automatically reflects new salary from the effective date forward.

</div>

</div>

<!-- Note: Explain how promotion approval ensures financial accountability before compensation increases take effect. -->

---

# Role Guide: HR Recruitment (`HR_RECRUITMENT`)

<div class="grid-2">

<div class="card">

### Role Mission & Profile
- **Domain:** Talent Acquisition & ATS
- **Permissions:** Workforce Requests, Requisitions, Job Postings, Candidate Sourcing, Interview Scheduling, Evaluations
- **Primary Route:** `/workforce`, `/recruitment`, `/tasks`
- **Dashboard Metrics:**
  - Open Job Vacancies
  - Total Candidate Applications
  - Shortlisted Candidates
  - Scheduled Interviews This Week
  - Offers Extended vs. Accepted
  - Pipeline Status Breakdown Chart

</div>

<div class="card">

### End-to-End Recruitment Workflow
```
[1. Workforce Request]
         │
         ▼
[2. Executive Approval (Head of HR)]
         │
         ▼
[3. Job Requisition & Job Posting]
         │
         ▼
[4. Sourcing & Kanban Screening]
         │
         ▼
[5. Interview Scoring & Evaluation]
         │
         ▼
[6. Offer Extension & Employee Creation]
```

</div>

</div>

<!-- Note: Emphasize how recruitment ties directly into workforce quotas, preventing unbudgeted hiring. -->

---

# HR Recruitment: Workforce Planning (`/workforce`)

<div class="grid-2">

<div class="card">

### Submitting a Headcount Request
1. Navigate to **Organization & Workforce > Workforce Planning**.
2. Click **`+ New Workforce Request`**.
3. Complete the request form:
   - **Target Department:** e.g., *Information Technology*.
   - **Position Title:** Desired new role.
   - **Headcount Quantity:** Number of vacancies (e.g., `3`).
   - **Estimated Budget:** Total annual package allocation.
   - **Business Justification:** Reason for headcount expansion (e.g., *New mobile banking platform initiative*).
4. Click **Submit for Approval**.

</div>

<div class="card">

### Workforce Request States
- <span class="badge badge-blue">DRAFT</span> Editable by requester.
- <span class="badge badge-amber">SUBMITTED</span> Awaiting Head of HR review.
- <span class="badge badge-green">APPROVED</span> Unlocks requisition creation.
- <span class="badge badge-red">REJECTED</span> Returned with reviewer reason.

</div>

</div>

<div class="alert-box">
💡 <b>Guardrail:</b> A Job Requisition cannot be opened without referencing an Approved Workforce Request ID.
</div>

<!-- Note: Highlight how this prevents department managers from hiring without corporate budget approval. -->

---

# HR Recruitment: Job Requisitions & Postings

<div class="grid-2">

<div class="card">

### 1. Creating Job Requisitions
1. On `/recruitment`, switch to **Job Requisitions** tab.
2. Click **`+ Create Requisition`**.
3. Select linked **Workforce Request ID**.
4. Confirm target hiring date, position grade, and hiring manager.
5. Submit for executive sign-off.
6. Once approved, the requisition transitions to `OPEN`.

</div>

<div class="card">

### 2. Publishing Job Postings
1. Select **Job Postings** tab.
2. Click **`+ Create Posting`**.
3. Select active Requisition.
4. Formulate candidate-facing copy:
   - Job Title & Location (Remote, Hybrid, Onsite).
   - Roles & Responsibilities.
   - Required Technical & Soft Skills.
   - Experience Range & Educational Criteria.
5. Set status to `PUBLISHED` (Internal or External).

</div>

</div>

<!-- Note: Job postings can be closed or paused at any time when sufficient candidates are shortlisted. -->

---

# HR Recruitment: ATS & Candidate Sourcing

<div class="grid-2">

<div class="card">

### Sourcing & Adding Candidates
1. In the **Candidates** tab, click **`+ Add Candidate`**.
2. Input Candidate Name, Email, Phone, LinkedIn profile, and current employment.
3. Attach Resume / Portfolio (PDF).
4. Link Candidate to the active **Job Posting**.
5. Application is generated at the `APPLIED` status stage.

</div>

<div class="card">

### Candidate Privacy & Contact Masking
- **Data Protection Enforcement:** Staff without talent permissions view masked contact details (e.g., `j***@example.com`, `+1 ***-***-8821`).
- Only authorized Recruiters and Head of HR can unmask full contact info and view resumes.

</div>

</div>

<div class="card-highlight" style="margin-top: 14px;">
<b>Kanban Pipeline View:</b> Toggle from Table mode to <b>Kanban Board</b> to drag & drop applications across stages: <code>APPLIED</code> ➔ <code>SCREENING</code> ➔ <code>INTERVIEWING</code> ➔ <code>OFFERED</code> ➔ <code>HIRED</code>.
</div>

<!-- Note: Demonstrate Kanban drag-and-drop feature which speeds up recruiter evaluations. -->

---

# HR Recruitment: Interview Scheduling & Scoring

<div class="grid-2">

<div class="card">

### 1. Scheduling Interviews
1. On any shortlisted candidate, click **`Schedule Interview`**.
2. Specify parameters:
   - **Interview Stage:** Screening, Technical, Culture Fit, Executive.
   - **Scheduled Date & Time:** Integrated calendar selector.
   - **Interviewers:** Assign one or more panel members.
   - **Meeting Link / Room:** Virtual link or physical office.
3. System sends notification alerts to candidate and interviewers.

</div>

<div class="card">

### 2. Submitting Evaluation Scoring
1. Panel members click **`Submit Evaluation`**.
2. Score candidate across competencies (1.0 to 5.0):
   - Technical Skill & Problem Solving
   - Communication & Collaboration
   - Cultural Alignment
3. Provide recommendation: `STRONG_HIRE`, `HIRE`, `HOLD`, or `REJECT`.
4. System aggregates panel consensus score.

</div>

</div>

<!-- Note: Standardized rubrics ensure fair, bias-free candidate evaluations. -->

---

# HR Recruitment: Offer Extension & Handoff

<div class="grid-2">

<div class="card">

### Extending an Offer
1. When candidate passes evaluation, click **`Change Status > OFFERED`**.
2. Input offer compensation terms:
   - Offered Basic Salary
   - Target Start Date
   - Probation Duration (e.g., 3 months)
3. Generate formal Offer Letter and dispatch to candidate.

</div>

<div class="card">

### Converting Candidate to Employee
1. Once the candidate signs, change status to `HIRED`.
2. Click **`Convert to Employee Record`**.
3. All personal details, resume, and compensation terms auto-populate into the **Employee Directory**.
4. The vacancy counter on the Workforce Request automatically decrements by 1.

</div>

</div>

<div class="alert-box">
🎉 <b>Seamless Handoff:</b> Zero duplicate manual entry required between ATS and Core HR records!
</div>

<!-- Note: Highlight how conversion from Candidate to Employee automates profile creation. -->

---

# Role Guide: HR Attendance Officer (`HR_ATTENDANCE`)

<div class="grid-2">

<div class="card">

### Role Mission & Profile
- **Domain:** Time, Attendance, Leaves & Overtime
- **Permissions:** Attendance Punches, Anomaly Correction, Shift Roster, Leave Management, Overtime Validation, Timesheets
- **Primary Route:** `/attendance`, `/tasks`
- **Dashboard Metrics:**
  - Today's Punches Breakdown (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`)
  - Active Leave Requests by Type
  - Approved Overtime Hours This Month
  - Unresolved Attendance Anomalies Flagged

</div>

<div class="card">

### Operational Module Structure (`/attendance`)
1. **Attendance Overview:** Punch logs, anomalies, manual punch.
2. **Leave Reference & Approvals:** Balances, leave requests review.
3. **Shifts & Rostering:** Shift schedules and employee assignments.
4. **Overtime Review:** Submission audits, rate validation.
5. **Timesheets:** Monthly generation and approval.
6. **Audit History:** Comprehensive log of manual corrections.

</div>

</div>

<!-- Note: Attendance data directly drives payroll overtime and unpaid leave deductions. -->

---

# HR Attendance: Shifts & Rostering

<div class="grid-2">

<div class="card">

### 1. Creating Shift Templates
1. On `/attendance`, open **Shifts & Rostering** tab.
2. Click **`+ Create Shift`**.
3. Define shift parameters:
   - **Shift Name:** e.g., `Standard Day Shift (09:00 - 18:00)`.
   - **Start Time & End Time:** 24-hr format.
   - **Grace Period:** e.g., `15 minutes` before marked late.
   - **Break Duration:** e.g., `60 minutes`.
   - **Working Hours:** e.g., `8 hours`.
4. Click **Save Shift**.

</div>

<div class="card">

### 2. Assigning Shifts to Staff
1. Click **`Assign Shift`**.
2. Select target: Individual employee or entire Department.
3. Pick shift template and effective date range.
4. System maps expected attendance schedule against all punches.

</div>

</div>

<div class="alert-box">
💡 <b>Overnight Shifts:</b> Check the <i>"Spans Midnight"</i> toggle for graveyard shifts (e.g., 22:00 to 06:00).
</div>

<!-- Note: Shifts provide the baseline expected hours against which tardiness and overtime are evaluated. -->

---

# HR Attendance: Punch Records & Anomaly Detection

<div class="grid-2">

<div class="card">

### Real-Time Attendance Monitoring
- View the **Attendance Overview** live stream of employee clock-ins and clock-outs.
- Automatic status tags generated:
  - <span class="badge badge-green">PRESENT</span> In on time, matched shift.
  - <span class="badge badge-amber">LATE</span> Check-in past shift start + grace.
  - <span class="badge badge-amber">EARLY_DEPARTURE</span> Left before shift end.
  - <span class="badge badge-red">ABSENT</span> No punch recorded during shift.
  - <span class="badge badge-purple">HALF_DAY</span> Worked less than 50% shift hours.

</div>

<div class="card">

### Anomaly Flagging
- **Missing Clock-Out:** Staff punched in but forgot to punch out before day close.
- **Unassigned Punch:** Clock-in registered without active shift roster.
- **Geo/IP Mismatch:** Punches recorded outside registered corporate network.

</div>

</div>

<!-- Note: Attendance anomalies must be resolved prior to closing monthly timesheets. -->

---

# HR Attendance: Attendance Corrections

<div class="grid-2">

<div class="card">

### Submitting an Attendance Correction
1. In the attendance table, locate the flagged record.
2. Click the **`Correct`** action button.
3. The **Attendance Correction Modal** opens:
   - Review original punch timestamps.
   - Input corrected **Check-in Time** and **Check-out Time**.
   - Select Correction Reason: *Badge Malfunction, Network Timeout, Field Duty, Approved Late Arrival*.
   - Input detailed justification note.
4. Click **Apply Correction**.

</div>

<div class="card">

### Audit Trail Compliance
- System retains original unedited raw punch for legal compliance.
- Modified records display an <span class="badge badge-blue">EDITED</span> indicator badge.
- Detail drawer documents:
  - Officer who performed correction.
  - Timestamp of adjustment.
  - Reason and old vs. new values.

</div>

</div>

<!-- Note: All corrections are immutably logged for audit readiness. -->

---

# HR Attendance: Leave Administration

<div class="grid-2">

<div class="card">

### Managing Leave Applications
1. Open the **Leave Reference & Approvals** tab.
2. Filter requests by status: `PENDING`, `APPROVED`, `REJECTED`.
3. Review request details:
   - Leave Type: *Annual, Sick, Maternity, Paternity, Unpaid, Bereavement*.
   - Start Date, End Date, Total Days.
   - Attached medical certificate / documentation.
   - Current employee balance remaining.
4. Click **Approve** or **Reject** (with reason).

</div>

<div class="card">

### Balance Entitlement Tracking
- Annual leave entitlements auto-accrue monthly based on tenure.
- Sick leave quotas automatically validate against statutory ceilings.
- Approved Unpaid Leaves automatically feed payroll as deduction line items.

</div>

</div>

<!-- Note: Show how approving unpaid leaves automatically informs the payroll calculation engine. -->

---

# HR Attendance: Overtime Audit & Timesheets

<div class="grid-2">

<div class="card">

### 1. Overtime Verification
1. Open the **Overtime Review** tab.
2. Inspect employee overtime claims:
   - Pre-shift / Post-shift extra hours worked.
   - Reason / Project code.
   - Attendance punch verification (system validates physical presence during claimed overtime window).
3. Click **Approve Overtime**.

</div>

<div class="card">

### 2. Generating Authoritative Timesheets
1. Switch to **Timesheets** tab.
2. Click **`Generate Timesheet`**.
3. Select Period Month (e.g., `November 2026`).
4. System aggregates:
   - Total Regular Working Hours
   - Overtime Hours (Standard 1.5x / Holiday 2.0x)
   - Unpaid Leave Hours
5. Submit Timesheet to lock data for Payroll.

</div>

</div>

<div class="alert-box">
🔒 <b>Handoff Rule:</b> Timesheet generation formally closes the attendance period and prevents further manual edits to punches.
</div>

<!-- Note: Emphasize the timesheet lock before payroll calculation. -->

---

# Role Guide: HR Payroll Specialist (`HR_PAYROLL`)

<div class="grid-2">

<div class="card">

### Role Mission & Profile
- **Domain:** Compensation, Disbursements & Taxes
- **Permissions:** Pay Periods, Calculations, Adjustments, Pre-submission Validation, Payslips, Export
- **Primary Route:** `/payroll`, `/tasks`
- **Dashboard Metrics:**
  - Total Pay Runs Processed
  - Net Payroll Payout Total ($)
  - Gross Earnings vs. Basic Base ($)
  - Total Allowances & Overtime Payouts ($)
  - Statutory Deductions Breakdown ($)

</div>

<div class="card">

### 10-Step Payroll Lifecycle
1. Create Period ➔ 2. Trigger Authoritative Calculation ➔ 3. Inspect Breakdown ➔ 4. Add Adjustments ➔ 5. Re-run Calculation ➔ 6. Run Pre-submission Validation Scan ➔ 7. Preview Payslips ➔ 8. Submit for Executive Approval ➔ 9. Head of HR Approval ➔ 10. Lock Period & Export CSV.

</div>

</div>

<!-- Note: Payroll Specialist is the preparer; separation of duties prevents them from self-approving payouts. -->

---

# HR Payroll: Creating a Pay Run Period

<div class="grid-2">

<div class="card">

### Period Setup Steps
1. Navigate to **Operations & Payroll > Payroll Processing**.
2. Click the blue **`+ New Payroll Period`** button.
3. In the modal:
   - **Period Name:** e.g., `November 2026 Monthly Payroll`.
   - **Start Date:** First calendar day of cycle (e.g., `2026-11-01`).
   - **End Date:** Last calendar day of cycle (e.g., `2026-11-30`).
4. Click **Create Period**.

</div>

<div class="card">

### Period Status Indicators
- <span class="badge badge-blue">DRAFT</span> Open for calculation & adjustments.
- <span class="badge badge-amber">SUBMITTED</span> Under review by Head of HR.
- <span class="badge badge-green">APPROVED</span> Executive sign-off granted.
- <span class="badge badge-purple">LOCKED</span> Finalized disbursement; immutable.
- <span class="badge badge-red">REJECTED</span> Returned for adjustment.

</div>

</div>

<div class="alert-box">
⚠️ <b>Constraint:</b> The backend strictly rejects overlapping calendar periods for the same payroll group.
</div>

<!-- Note: Period naming should be clear and consistent across all months. -->

---

# HR Payroll: Authoritative Calculation Engine

<div class="grid-2">

<div class="card">

### Triggering Calculation
1. Select active period in the Period Manager dropdown.
2. Click **`Calculate Payroll`** (or **`Recalculate`**).
3. Confirm modal prompt.
4. Backend runs an atomic database transaction processing all active employees.

</div>

<div class="card">

### Authoritative Calculation Formula
- **Base Salary ($Basic$):** Prorated for partial-month joiners.
- **Overtime Pay ($OT$):**
  $$\text{Hourly Rate} = \frac{\text{Basic}}{160}$$
  $$\text{OT Pay} = \text{Hourly Rate} \times 1.5 \times \text{Approved OT Hours}$$
- **Gross Pay ($Gross$):**
  $$\text{Gross} = \text{Basic} + \text{Allowances} + \text{OT} + \text{Bonuses}$$
- **Net Pay ($Net$):**
  $$\text{Net} = \text{Gross} - \text{Statutory Deductions} - \text{Taxes}$$

</div>

</div>

<!-- Note: Walk through the hourly rate formula based on standard 160 monthly working hours. -->

---

# HR Payroll: Calculation Inspector Drawer

<div class="grid-2">

<div class="card">

### Granular Salary Audit
1. In the Payroll Register Table, find target employee.
2. Click the **`Inspect Calculation`** action button.
3. The **Calculation Inspector Drawer** slides open:
   - Base salary parameters & daily prorations.
   - Timesheet link: Total regular hours & approved OT.
   - Overtime formula breakdown showing exact math.
   - Detailed itemized list of all allowances.
   - Statutory deduction schedules.
   - Net payout balance check down to the cent.

</div>

<div class="card">

### Transparency & Dispute Resolution
- Eliminates mystery numbers and calculation confusion.
- Provides immediate mathematical verification before payroll is locked.
- Print-friendly audit view can be saved for external tax reviewers.

</div>

</div>

<!-- Note: Explain how the inspector builds trust with employee unions and auditors. -->

---

# HR Payroll: Manual Adjustments

<div class="grid-2">

<div class="card">

### Adding Compensation Adjustments
1. Locate employee in the Payroll Register Table.
2. Click **`Add Adjustment`**.
3. In the Adjustment Modal:
   - **Type:** Allowance, Bonus, Commission, Reimbursement, Deduction, Loan Repayment, Unpaid Leave Penalty.
   - **Amount:** Numerical positive value.
   - **Description:** e.g., *Q3 Project Performance Milestone Bonus*.
   - **Recurring:** Toggle if adjustment persists into future months.
4. Click **Apply Adjustment**.

</div>

<div class="card">

### Re-Running Calculations
- Newly added adjustments reflect immediately as pending modifications.
- Click **`Recalculate Payroll`** to recalculate taxes, gross figures, and net balances.
- Adjusted rows display an <span class="badge badge-amber">ADJUSTED</span> badge.

</div>

</div>

<!-- Note: All adjustments require an itemized description for financial auditing. -->

---

# HR Payroll: Pre-Submission Validation Scan

Before submitting payroll to executive leadership, run the automated validation scanner:

<div class="grid-2">

<div class="card">

### Automated Audit Checks
1. Switch to the **Payroll Validation** tab.
2. System evaluates entire disbursement batch against 4 critical rules:
   - 🔴 **Zero / Negative Net Pay:** Flags employees whose deductions exceed gross earnings.
   - 🟡 **Missing Attendance Records:** Flags active staff with zero recorded timesheets.
   - 🟡 **High Salary Deviation:** Flags payouts deviating $> 20\%$ from historical baseline.
   - 🔴 **Missing Banking Information:** Flags staff without verified bank account numbers.

</div>

<div class="card">

### Remediation Workflow
- Click **`Inspect Issue`** next to any flagged row.
- Resolve underlying condition (e.g. adjust deduction or enter bank details).
- Click **`Re-run Validation Scan`**.
- Submission is unlocked once all critical errors are resolved!

</div>

</div>

<!-- Note: Emphasize that preventing errors here saves payroll rollback headaches later. -->

---

# HR Payroll: Official Payslips & Submission

<div class="grid-2">

<div class="card">

### 1. Official Payslip Drawer
- Click **`View Payslip`** on any row to open the formal branded payslip.
- Includes company logo, registration numbers, tax IDs, earnings breakdown, and year-to-date totals.
- Optimized CSS print mode: Click **`Print / PDF`** to generate high-resolution employee documents.

</div>

<div class="card">

### 2. Submitting for Executive Sign-off
1. Ensure Validation Scan reports 0 blocking issues.
2. Click the green **`Submit for Approval`** button.
3. Review submission summary modal.
4. Click **Confirm Submission**.
5. Period status updates to <span class="badge badge-amber">SUBMITTED</span>.
6. Instant notification dispatched to `HEAD_OF_HR`.

</div>

</div>

<!-- Note: Submitting freezes preparer editing capabilities while under executive review. -->

---

# Role Guide: Head of HR (`HEAD_OF_HR`)

<div class="grid-2">

<div class="card">

### Role Mission & Profile
- **Domain:** Master HR Authority & Final Sign-off
- **Permissions:** All 43 System Permissions
- **Primary Route:** `/dashboard`, `/tasks`, across all modules
- **Executive Dashboard Metrics:**
  - Total Headcount & Active Workforce %
  - Pending Approval Counters:
    - Workforce Requests
    - Job Requisitions
    - Leave & Overtime Applications
    - Payroll Disbursements
    - Promotion Requests
  - Latest Payroll Payout Amount ($)
  - Daily Punch & Attendance Ratios

</div>

<div class="card">

### Executive Governance Principles
1. **Separation of Duties:** Acts as the independent final approver for all financial and personnel changes.
2. **Audit Oversight:** Full visibility into immutable system audit logs.
3. **Escalations:** Authority to override, reject with cause, or request re-evaluation.

</div>

</div>

<!-- Note: The Head of HR is the ultimate compliance officer for the platform. -->

---

# Head of HR: Executive Review & Approvals

<div class="grid-2">

<div class="card">

### Unified Approvals Management (`/tasks`)
1. Navigate to **Tasks & Approvals**.
2. Select **Pending Approvals** tab.
3. Filter by type: *Workforce, Payroll, Promotion, Leave*.
4. Click **`Review Item`** to open detailed side drawer.
5. Inspect supporting documentation, business case, and requester info.

</div>

<div class="card">

### Decision Actions
- **`Approve`**: Grants immediate authorization. Changes take effect across live databases.
- **`Reject`**: Opens mandatory **Rejection Reason Modal**. Feedback is delivered back to requester inbox.
- **`Request Clarification`**: Sends interactive prompt to requester.

</div>

</div>

<div class="card-highlight" style="margin-top: 14px;">
<b>Audit Stamp:</b> Every approval or rejection permanently records the executive's User ID, timestamp, and decision notes in the immutable audit log.
</div>

<!-- Note: Mandatory rejection reasons ensure transparency and help junior officers learn policies. -->

---

# Head of HR: Final Payroll Approval & Period Lock

The most critical financial workflow in the organization:

<div class="grid-2">

<div class="card">

### Step 1: Reviewing Submitted Payroll
1. Navigate to `/payroll` or click review link in `/tasks`.
2. Select submitted period (<span class="badge badge-amber">SUBMITTED</span>).
3. Review executive KPIs: Total Gross, Net Disbursement, Overtime, Deductions.
4. Verify validation audit results (confirm 0 critical flags).
5. Inspect high-earner or large-deviation rows.

</div>

<div class="card">

### Step 2: Granting Sign-Off & Period Lock
1. Click **`Approve Payroll`** in top bar.
2. Status changes to <span class="badge badge-green">APPROVED</span>.
3. To disburse funds, click **`Lock Period`**.
4. Status transitions to <span class="badge badge-purple">LOCKED</span>:
   - Permanently freezes all records; no further modifications possible.
   - Makes payslips instantly visible in Employee Self-Service.
   - Unlocks bank transmission file download.

</div>

</div>

<!-- Note: Locking the period is the point of no return for monthly disbursement. -->

---

# Head of HR: Formula-Safe CSV Export

<div class="grid-2">

<div class="card">

### Exporting Bank Disbursement Register
1. In the locked payroll period, click **`Export to CSV`**.
2. Select bank export template (Standard NACHA, SEPA, Direct Wire, or General Ledger).
3. System compiles verified disbursement data:
   - Employee Full Name
   - Bank Name & Routing / Swift Code
   - Encrypted Account Number
   - Exact Net Disbursement Amount

</div>

<div class="card">

### Formula Injection Protection
- **Security Hardening:** The export engine sanitizes all fields against CSV Injection attacks ($=$, $+$, $-$, $@$).
- Prevents malicious spreadsheet formulas from executing when opened in Microsoft Excel.
- Generates official SHA-256 batch checksum for banking verification.

</div>

</div>

<!-- Note: Explain how CSV sanitization protects corporate finance workstations from malware. -->

---

# Head of HR: Audit Trails & Enterprise Governance

<div class="grid-2">

<div class="card">

### Compliance Audit Log Review (`/audit-logs`)
- Navigate to **Growth & Governance > Audit & Compliance**.
- View immutable, chronological log of all platform operations.
- Powerful search and filtering:
  - Filter by Actor (User Email / Role)
  - Filter by Action (`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `LOCK`, `PASSWORD_CHANGED`)
  - Filter by Target Entity (`EMPLOYEE`, `PAYROLL_PERIOD`, `WORKFORCE_REQUEST`)
  - Date Range picker

</div>

<div class="card">

### Forensic Change Inspection
- Click on any log entry to view full JSON diff:
  - Previous values vs. New values.
  - Client IP address and User Agent.
  - Execution duration and status.

</div>

</div>

<div class="alert-box">
🔒 <b>Immutability Guarantee:</b> Audit logs are append-only. No user—including system administrators—has permission to edit or delete audit records.
</div>

<!-- Note: This guarantees complete SOX and GDPR compliance during external reviews. -->

---

# HR Performance: Reviews & PIPs (`HR_PERFORMANCE`)

<div class="grid-2">

<div class="card">

### Performance Appraisals (`/performance`)
- **Review Cycle Configuration:** Set annual, bi-annual, or quarterly review windows.
- **Goal & KPI Setting:** Assign quantitative goals with measurable milestones and weightings.
- **360-Degree Scoring:**
  - Employee Self-Assessment
  - Manager Appraisal
  - Peer Review Feedback
- **Calibration & Bell-Curve:** Review score distributions prior to finalization.

</div>

<div class="card">

### Performance Improvement Plans (PIP)
- **Initiating PIP:** Initiated for staff scoring below performance standards.
- **Action Milestones:** 30, 60, or 90-day review checkpoints with clear deliverables.
- **Outcome Determination:** Successful completion (return to good standing) or offboarding recommendation.

</div>

</div>

<!-- Note: Performance appraisals feed directly into promotional and merit increase workflows. -->

---

# HR L&D: Training Programs & Skills (`HR_LND`)

<div class="grid-2">

<div class="card">

### Course Catalog Management (`/lnd`)
- **Course Repository:** Define internal training modules, compliance workshops, and technical bootcamps.
- **Skills Matrix Mapping:** Link courses to competency frameworks and position requirements.
- **Format Delivery:** On-demand eLearning, instructor-led workshops, or external certifications.

</div>

<div class="card">

### Session Scheduling & Certification
- **Session Rostering:** Schedule time slots, instructors, and maximum seat capacities.
- **Enrollment Tracking:** Nominate staff or open self-service enrollments.
- **Attendance & Completion:** Mark attendance and issue digital competency certificates.
- **Effectiveness Scoring:** Post-training feedback surveys (1.0 to 5.0 rating).

</div>

</div>

<!-- Note: L&D ensures workforce competencies grow alongside business expansion. -->

---

# General Staff: Employee Self-Service (ESS)

<div class="grid-2">

<div class="card">

### The Employee Experience
Every active staff member receives individual portal credentials:
- **Daily Attendance Clock:** Quick punch in/out from desktop or mobile browser.
- **Shift Roster:** View upcoming work shifts and scheduled hours.
- **Leave Applications:** Check real-time leave balances and submit time-off requests.
- **Overtime Claims:** File extra hours worked with task notes.
- **Personal Payslips:** Access current and historical payslips 24/7.
- **Profile & Documents:** Keep contact info and compliance files up to date.

</div>

<div class="card">

### Self-Service Dashboard
```
┌──────────────────────────────────────────────┐
│ 👋 Welcome back, Sarah Jenkins (EMP-0042)    │
├──────────────────────┬───────────────────────┤
│ ⏰ Today's Status    │ 📅 Leave Balance      │
│ Checked In: 08:58 AM │ Annual: 14.5 Days     │
├──────────────────────┼───────────────────────┤
│ 💵 Latest Payslip    │ 📝 Pending Requests   │
│ Nov 2026: Available  │ Overtime: Under Review│
└──────────────────────┴───────────────────────┘
```

</div>

</div>

<!-- Note: Empowering staff with self-service dramatically reduces HR ticket volume. -->

---

# Staff ESS: Punches, Leaves & Overtime

<div class="grid-3">

<div class="card">

### 1. Clock In / Out
1. Log in to portal.
2. Click large **`Clock In`** button on dashboard header.
3. System registers timestamp and confirms active shift.
4. At end of working day, click **`Clock Out`**.
5. Check total hours recorded for the day.

</div>

<div class="card">

### 2. Requesting Leave
1. Navigate to **My Leaves**.
2. Click **`Apply for Leave`**.
3. Select Leave Type (e.g. *Annual Leave*).
4. Select Date Range.
5. System computes working days.
6. Attach notes/files.
7. Click **Submit**.

</div>

<div class="card">

### 3. Claiming Overtime
1. Navigate to **My Overtime**.
2. Click **`Submit Overtime`**.
3. Select date and hours worked.
4. Select project / reason.
5. Submit to manager for approval.

</div>

</div>

<!-- Note: Show how simple the interface is for everyday non-technical staff. -->

---

# Staff ESS: "My Payslips" Access

<div class="grid-2">

<div class="card">

### Viewing & Downloading Personal Payslips
1. Expand **Operations & Payroll** and click **My Payslips** (or select quick link on personal dashboard).
2. The table displays all finalized (<span class="badge badge-purple">LOCKED</span>) pay runs.
3. View summary columns: Period Name, Gross Pay, Total Deductions, Net Payout, Disbursement Date.
4. Click **`View Payslip`** to inspect the official slip.
5. Click **`Download / Print PDF`** to generate an official printout for loan or visa applications.

</div>

<div class="card">

### Data Security & Privacy Guarantee
- Employees **only** have access to their own personal remuneration data.
- System denies cross-account payslip requests with immediate 403 authorization rejections.
- Watermarked with verification code for anti-tamper authenticity.

</div>

</div>

<!-- Note: Payslips are only visible once Head of HR locks the period. -->

---

# Operational Troubleshooting & FAQ

<div class="grid-2">

<div class="card">

### Frequent Scenarios
- **Q: Why is my calculated Net Pay showing as $0 or negative?**  
  *A:* Check the employee's manual adjustments or statutory deductions. Ensure deductions do not exceed base salary.
- **Q: Why cannot HR Payroll approve a payroll period?**  
  *A:* Separation of Duties policy prevents preparers from approving batches. Only `HEAD_OF_HR` can approve.
- **Q: How do I resolve a "Missing Timesheet" validation error?**  
  *A:* Navigate to `/attendance > Timesheets`, select the month, and click `Generate Timesheet` to compile data.

</div>

<div class="card">

### Security & System FAQ
- **Q: What happens if an employee loses their password?**  
  *A:* An HR Admin can trigger a password reset, or the user can change it under profile if currently authenticated.
- **Q: Why is a candidate's email masked?**  
  *A:* Role-based data privacy masks personal contact info for users without recruitment clearance.

</div>

</div>

<!-- Note: Keep this slide handy for helpdesk support staff. -->

---

# System Governance & Security Best Practices

<div class="grid-3">

<div class="card">

### 1. Account Hygiene
- Enforce unique individual logins; **never share credentials**.
- Immediately rotate passwords upon suspected compromise.
- Enable automatic session logout on shared terminal machines.

</div>

<div class="card">

### 2. Workflow Integrity
- Always review validation scan results before submitting payroll.
- Attach formal justification remarks to all rejections and salary changes.
- Adhere strictly to monthly cut-off dates for attendance corrections.

</div>

<div class="card">

### 3. Data Protection
- Treat all personnel and compensation records as strictly confidential.
- Store sensitive employee uploads exclusively in the encrypted Document Vault.
- Do not export unmasked payroll files to unsecured personal devices.

</div>

</div>

<div class="card-highlight" style="margin-top: 18px; text-align: center;">
<b>Support Escalations:</b> HR Systems Governance Desk | <code>hr-support@company.internal</code> | Extension: <b>4400</b>
</div>

---

<!-- _class: title-slide -->

# THANK YOU
## HRMS Enterprise Suite — Empowering People & Operations

**Continuous Learning • Operational Excellence • Transparent Governance**

*Prepared by the HRMS Core Engineering & Operations Team*  
*Reference: `/hrms/docs/user_guide_slides.md` & `/hrms/docs/user_guide_slides.html`*
