-- CreateTable
CREATE TABLE "AccountInvitation" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountInvitation_token_key" ON "AccountInvitation"("token");

-- CreateIndex
CREATE INDEX "AccountInvitation_token_idx" ON "AccountInvitation"("token");

-- CreateIndex
CREATE INDEX "AccountInvitation_employeeId_idx" ON "AccountInvitation"("employeeId");

-- CreateIndex
CREATE INDEX "AccountInvitation_userId_idx" ON "AccountInvitation"("userId");

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
