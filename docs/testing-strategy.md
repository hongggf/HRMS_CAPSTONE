# HRMS Frontend Testing Strategy

This document defines the multi-tiered automated testing pyramid for the HRMS frontend application.

---

## 1. Testing Pyramid

```text
       /\
      /  \     End-to-End Tests (Playwright)
     /----\    Critical User Flows, Auth, Navigation, Multi-Tabs
    /      \
   /--------\   Integration & Component Tests (Vitest + React Testing Library)
  /          \  Form Validation, UI State, Mock API Responses, Interceptors
 /------------\ Unit Tests (Vitest)
/              \ Stores, Formatters, Utilities, Contract Parsers
```

---

## 2. Unit & Component Testing (Vitest + RTL)

- **Framework**: `vitest` + `@testing-library/react` + `@testing-library/user-event`
- **Scope**:
  1. **Utility & Formatting Functions**: Currency formatting, date calculations, duration parsers.
  2. **Zustand State Stores**: `useAuthStore` login/logout/setTokens, `useTabStore` addTab/removeTab/closeOthers.
  3. **Axios Client Interceptors**: Verify `Authorization` header injection, concurrent 401 refresh queueing, and redirect on unrecoverable session expiry.
  4. **Component Rendering & Validation**:
     - Login form validation rules (email format, minimum password length).
     - Empty states, loading spinners, and error notification triggers.
     - RoleGuard rendering children when permitted vs `<Forbidden403 />` when restricted.

---

## 3. End-to-End Testing (Playwright)

- **Framework**: `@playwright/test`
- **Scope**:
  1. **Authentication Flow**:
     - Master login with `head@hr.local` / `password123`.
     - Invalid password error alert verification.
     - Logout and session cleanup.
  2. **Navigation & Multi-Tab Behavior**:
     - Clicking sidebar items opens corresponding tags in `TagsView`.
     - Switching between open tabs retains page state without reloading.
     - Closing individual and all tabs.
  3. **Theme & Responsiveness**:
     - Toggling Light / Dark theme toggles body class and Ant Design design token state.
     - Collapsing and expanding the left navigation sidebar.
  4. **Executive Dashboard Live Verification**:
     - Real API cards retrieve and render active counts from `/api/v1/reports/dashboard`.
