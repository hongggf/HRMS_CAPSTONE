-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('MONTHLY', 'BI_WEEKLY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('ALLOWANCE', 'DEDUCTION', 'BONUS', 'OTHER');

-- CreateEnum
CREATE TYPE "ComponentValueType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('DRAFT', 'CALCULATING', 'CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'LOCKED', 'PAID');

-- CreateTable
CREATE TABLE "EmployeeCompensation" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "effectiveDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryComponent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalaryComponent" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "ComponentValueType" NOT NULL DEFAULT 'FIXED',
    "effectiveDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" SERIAL NOT NULL,
    "payrollPeriodId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "totalAllowances" DOUBLE PRECISION NOT NULL,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "totalOvertime" DOUBLE PRECISION NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" SERIAL NOT NULL,
    "payrollId" INTEGER NOT NULL,
    "componentName" TEXT NOT NULL,
    "componentType" "ComponentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollApproval" (
    "id" SERIAL NOT NULL,
    "payrollPeriodId" INTEGER NOT NULL,
    "approvedById" INTEGER NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL,
    "comments" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustment" (
    "id" SERIAL NOT NULL,
    "payrollId" INTEGER NOT NULL,
    "adjustedById" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCompensation_employeeId_key" ON "EmployeeCompensation"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryComponent_name_key" ON "SalaryComponent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_startDate_endDate_key" ON "PayrollPeriod"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_payrollPeriodId_employeeId_key" ON "Payroll"("payrollPeriodId", "employeeId");

-- AddForeignKey
ALTER TABLE "EmployeeCompensation" ADD CONSTRAINT "EmployeeCompensation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryComponent" ADD CONSTRAINT "EmployeeSalaryComponent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryComponent" ADD CONSTRAINT "EmployeeSalaryComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "SalaryComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollApproval" ADD CONSTRAINT "PayrollApproval_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollApproval" ADD CONSTRAINT "PayrollApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
