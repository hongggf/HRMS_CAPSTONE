-- AlterTable
ALTER TABLE "Training" ADD COLUMN "departmentId" INTEGER;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
