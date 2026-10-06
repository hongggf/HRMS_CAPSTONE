-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PIPStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PromotionRequest" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "currentPositionId" INTEGER NOT NULL,
    "proposedPositionId" INTEGER NOT NULL,
    "currentSalary" DOUBLE PRECISION,
    "proposedSalary" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "performanceReviewId" INTEGER,
    "effectiveDate" DATE NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementPlan" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "objective" TEXT NOT NULL,
    "status" "PIPStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImprovementPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementPlanItem" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImprovementPlanItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_currentPositionId_fkey" FOREIGN KEY ("currentPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_proposedPositionId_fkey" FOREIGN KEY ("proposedPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_performanceReviewId_fkey" FOREIGN KEY ("performanceReviewId") REFERENCES "PerformanceReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImprovementPlan" ADD CONSTRAINT "ImprovementPlan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImprovementPlanItem" ADD CONSTRAINT "ImprovementPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ImprovementPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
