# HRMS Backend API 🚀

Welcome to the HRMS (Human Resources Management System) Backend repository. This system is built for high performance, strict type safety, and robust Role-Based Access Control (RBAC).

## 🛠 Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Security:** JWT (JSON Web Tokens), bcryptjs, Helmet, Express Rate Limit
- **Validation:** Zod

---

## 💻 Local Setup Guide

Follow these steps exactly to get the backend running on your local machine.

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Docker & Docker Compose** (for running PostgreSQL)

### 2. Start the Database
From the root of the project (where `docker-compose.yml` is located), spin up the database in the background:
```bash
docker compose up -d
```

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
*(The default variables provided are already perfectly configured for local Docker development).*

### 5. Setup the Database Schema & Seed Data
Run the following commands to apply the database schema, generate the Prisma Client, and seed the initial roles and admin user:
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
Running the seed command automatically creates a master HR user for you to test with:
- **Email:** `head@hr.local`
- **Password:** `password123`
- **Role:** `HEAD_OF_HR` (Has all permissions)

### Role Dictionary
When creating or assigning roles to users via the API, use the following `roleId` mappings:

| Role ID | Role Name | Description |
| :--- | :--- | :--- |
| **1** | `HR_RECRUITMENT` | Manages job postings and candidates |
| **2** | `HR_LND` | Learning and Development |
| **3** | `HEAD_OF_HR` | Master role with full system access |
| **4** | `HR_PAYROLL` | Approves and manages payroll |
| **5** | `HR_ADMIN` | General system administration |
| **6** | `HR_ATTENDANCE` | Manages clock-ins, clock-outs, and leaves |
| **7** | `HR_PERFORMANCE` | Manages employee reviews and KPIs |

---

## 🗄️ Viewing Data with Prisma Studio

Prisma comes with a built-in visual database browser (similar to pgAdmin or DBeaver) called **Prisma Studio**. This allows you to easily view, add, edit, or delete records in your database directly from your web browser.

**To start Prisma Studio:**
1. Open a new terminal window.
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
- `npm run test`: Runs the automated Jest test suite (Note: This will isolate and reset the database).
