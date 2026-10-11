# HRMS Frontend Security Checklist & Guidelines

This document establishes the security standards and verification checks enforced across the HRMS frontend client.

---

## 1. Authentication & Token Management
- [x] **In-Memory Access Tokens**: Short-lived access tokens (15-minute lifespan) are stored in memory inside the Zustand Auth store, never written to disk or indexedDB.
- [x] **Refresh Token Storage Risk Mitigation**: The backend API requires `refreshToken` in JSON request bodies (`POST /api/v1/auth/refresh`). To maintain session persistence across browser reloads, it is stored in `localStorage`. 
  - *Mitigation*: Strictly sanitize all user input and rendering contexts to eliminate XSS vectors that could access `localStorage`.
- [x] **Concurrent Refresh Mutex**: Axios response interceptors implement a queue/promise lock. If 10 requests fail with 401 simultaneously, only 1 refresh request is dispatched. Queued requests resume seamlessly.
- [x] **Immediate Session Invalidation**: On explicit logout (`POST /api/v1/auth/logout`) or unrecoverable refresh failure, tokens are immediately purged from both memory and `localStorage`, and the client state resets.

---

## 2. Authorization & RBAC Supplementary Controls
- [x] **Backend Primary Enforcement**: Frontend guards and button disabling are strictly supplementary UX controls. Backend controllers and middleware (`requireAuth`, `requireRole`, `requirePermission`) remain the ultimate security boundary.
- [x] **Role Guard Fallback**: Unauthorized direct navigation renders a `<Forbidden403 />` barrier with a "Return to Dashboard" action.
- [x] **Menu Filtering**: Navigation sidebars automatically suppress links to modules the logged-in user cannot access.

---

## 3. Data Protection & Privacy
- [x] **Zero Secret Leakage**: No passwords, access tokens, refresh tokens, or personal identifiers are logged to `console.log`, `console.error`, network URLs, query strings, or error telemetry.
- [x] **Sensitive Field Masking**: Salary amounts, bank accounts, and personal identification numbers require explicit view toggle or are restricted to authorized payroll views.
- [x] **Form Payload Sanitization**: Trim whitespace on credentials and inputs; strip unselected parameters prior to dispatch.

---

## 4. XSS & Injection Mitigations
- [x] **React JSX Auto-Escaping**: Never use `dangerouslySetInnerHTML`. All dynamic strings rendered in tables, lists, and notifications are natively escaped.
- [x] **Safe URL Validation**: External links or document download URLs are verified before opening in `window.open`.
- [x] **Strict Content Security Policy Compatibility**: Avoid inline script execution and dynamic code evaluation (`eval`).

---

## 5. File Upload Security
- [x] **Multipart Handling**: Upload document forms use `multipart/form-data` without manually specifying boundaries.
- [x] **File Size & Type Validation**: Front-end validation checks that documents adhere to the 5MB size limit and allowed extensions (`.pdf`, `.png`, `.jpg`, `.jpeg`) before sending payloads to the backend.
