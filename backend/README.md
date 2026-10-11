# HRMS Backend API 🚀

Welcome to the HRMS (Human Resources Management System) Backend repository. This system is built for high performance, strict type safety, and robust Role-Based Access Control (RBAC).

## 🛠 Tech Stack
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Security:** JWT (Access & Refresh tokens), bcryptjs, Helmet, Express Rate Limit
- **Validation:** Zod
- **Containerization:** Docker & Docker Compose

---

## 🐳 Quickstart with Docker (Recommended)

You can run the entire backend and PostgreSQL database using Docker without needing Node.js or PostgreSQL installed locally.

### 1. Run Prebuilt Production Stack (Docker Hub)
Pull and start the production-ready backend image and PostgreSQL in the background:
```bash
docker compose -f docker-compose.prod.yml up -d
```

- **API URL:** `http://localhost:3001`
- **PostgreSQL Port:** `5433` (isolated to avoid local Postgres port conflicts)
- **Automatic Migrations:** Database migrations are automatically applied on container startup.

### 2. View Live Logs
```bash
docker logs -f hrms-backend-prod
```

### 3. Stop Containers
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 💻 Local Node.js Setup Guide

If you are developing locally with live reload, follow these steps:

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Docker & Docker Compose** (for running local PostgreSQL)

### 2. Start the Local Database
From `backend/`, spin up the local PostgreSQL container in the background:
```bash
docker compose up -d
```
*(Runs PostgreSQL on standard port `5432`)*

### 3. Install Dependencies
Navigate into the backend folder and install the NPM packages:
```bash
cd backend
npm install
```

### 4. Environment Variables
Copy the example environment file to create your local `.env`:
```bash
cp .env.example .env
```
*(The default variables provided are already configured for local Docker development).*

### 5. Setup the Database Schema & Seed Data
Apply the database schema, generate the Prisma Client, and seed initial roles & accounts:
```bash
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

### 6. Start the Server
Start the development server with live-reloading:
```bash
npm run dev
```
The API will now be running at `http://localhost:3000`.

---

## 🔐 Authentication & RBAC System

This API uses a strict Role-Based Access Control system. Roles are stored in the database and mapped to specific granular permissions.

### Seeded Master Account
Running the seed command automatically creates a master HR user for testing:
- **Email:** `head@hr.local`
- **Password:** `password123`
- **Role:** `HEAD_OF_HR` (Has all permissions)

### Role Dictionary
When creating or assigning roles to users via the API, use the following `roleId` mappings:

| Role ID | Role Name | Description |
| :--- | :--- | :--- |
| **1** | `HR_RECRUITMENT` | Manages job postings, candidate screening, and recruitment |
| **2** | `HR_LND` | Learning and Development, courses, and skill tracking |
| **3** | `HEAD_OF_HR` | Master role with full system access and final approvals |
| **4** | `HR_PAYROLL` | Prepares, adjusts, and calculates payroll |
| **5** | `HR_ADMIN` | General system administration, employee profiles, and promotions |
| **6** | `HR_ATTENDANCE` | Manages shifts, clock-ins, clock-outs, leaves, and overtime |
| **7** | `HR_PERFORMANCE` | Manages employee reviews, goals, and KPIs |

---

## 🗄️ Viewing Data with Prisma Studio

Prisma comes with a built-in visual database browser (similar to pgAdmin or DBeaver) called **Prisma Studio**. This allows you to easily view, add, edit, or delete records in your database directly from your web browser.

**To start Prisma Studio:**
1. Open a terminal window.
2. Navigate to the backend directory (`cd hrms/backend`).
3. Run the following command:
```bash
npx prisma studio
```
4. Open your web browser and go to `http://localhost:5555`. 

*(Note: Prisma Studio automatically reads your `.env` file, so there is zero database configuration required!)*

---

## 📡 Standardized API Responses

To make life easy for frontend developers, **every single endpoint** adheres to a strict global response format. 

### Success Response
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": { ... },
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "password",
        "message": "String must contain at least 6 character(s)"
      }
    ]
  }
}
```

---

## 🧪 Testing with Postman

We have prepared a fully automated Postman Collection that handles JWTs for you.

1. Go to the `docs/` folder in the root of the project.
2. Locate the `HRMS_API.postman_collection.json` file.
3. Open Postman, click **Import** -> **Raw Text**, and paste the contents of the file.
4. Hit **Send** on the `Auth -> Login` request. 
*(The Postman scripts will automatically extract the `accessToken` and securely inject it into all other requests!)*

---

## 📜 Available NPM Scripts

- `npm run dev`: Starts the TypeScript server with hot-reloading.
- `npm run build`: Compiles the TypeScript code to plain JavaScript in the `/dist` folder.
- `npm run lint`: Analyzes the code for ESLint errors.
- `npm run test`: Runs the automated Jest test suite (140 tests across 13 test suites).
