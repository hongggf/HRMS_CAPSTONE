# HRMS Frontend Application 💻

Welcome to the HRMS (Human Resources Management System) Frontend project. This is a React + TypeScript application built using Vite.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The app will run locally at `http://localhost:5173`.

---

## 🔗 Backend API Connection

The backend API is accessible at:
- **Docker Production Stack:** `http://localhost:3001/api/v1`
- **Local Node.js Development:** `http://localhost:3000/api/v1`

### Test Credentials
- **Email:** `head@hr.local`
- **Password:** `password123`
- **Role:** `HEAD_OF_HR` (Full system access)

---

## 📖 Complete API Documentation

For the full endpoint catalog, response envelopes, RBAC role dictionary, and Axios interceptor patterns, please read:
👉 **[Frontend Integration Guide](../docs/FRONTEND_INTEGRATION_GUIDE.md)**

---

## 📦 Recommended Frontend Libraries

- **HTTP Client:** `axios` (with request/response interceptors for JWT tokens)
- **Routing:** `react-router-dom` (v6)
- **UI Components:** TailwindCSS, Shadcn UI / MUI / Ant Design
- **State Management:** `@tanstack/react-query` (for API server state & caching) and `zustand` (for user session/auth)
- **Form Management:** `react-hook-form` + `@hookform/resolvers/zod`
