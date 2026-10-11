# HRMS Frontend Developer Operations Runbook

This runbook provides actionable instructions for local development, building, testing, configuring environment variables, and troubleshooting the HRMS frontend client.

---

## 1. Local Environment Setup

### Prerequisites
- **Node.js**: v18.x or higher
- **NPM**: v9.x or higher
- **Backend API**: Running locally on `http://localhost:3000` (Node dev) or `http://localhost:3001` (Docker)

### Quick Start
```bash
# Navigate to the frontend directory
cd hrms/frontend

# Copy environment variables
cp .env.example .env

# Install dependencies
npm install

# Start development server with Vite hot-reload
npm run dev
```
The application will launch at: **`http://localhost:5173`**.

---

## 2. Environment Configuration (`.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:3001/api/v1` | Target HRMS backend API root |
| `VITE_APP_TITLE` | `HRMS Enterprise Portal` | Application brand name displayed in headers & tabs |

---

## 3. Available NPM Scripts

- `npm run dev`: Starts the Vite development server with hot-module reloading.
- `npm run build`: Compiles TypeScript with `tsc` and bundles production assets via Vite into `dist/`.
- `npm run preview`: Starts a local web server serving the compiled production `dist/` bundle.
- `npm run lint`: Runs ESLint across all TypeScript and TSX files.
- `npm run test`: Executes the Vitest unit and component test suite.
- `npm run test:e2e`: Executes the Playwright browser test suite.

---

## 4. Common Troubleshooting Scenarios

### Problem: API Requests Fail with `401 Unauthorized` Loop
* **Check**: Ensure `VITE_API_BASE_URL` points to the active backend port (`http://localhost:3001/api/v1` for Docker or `http://localhost:3000/api/v1` for local Node).
* **Fix**: Clear `localStorage.removeItem('hrms_refresh_token')` and re-login with `head@hr.local` / `password123`.

### Problem: Backend Returns `500 Internal Server Error` on Dashboard Metrics
* **Check**: Verify all database migrations are applied on the backend DB.
* **Fix**: Run `npx prisma migrate deploy` in `hrms/backend` to ensure Phase 10-12 tables (`Training`, `Notification`, `AuditLog`) exist.
