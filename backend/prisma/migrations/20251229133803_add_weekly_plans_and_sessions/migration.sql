-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('STRENGTH', 'ENDURANCE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'COMPLETED', 'MISSED', 'MODIFIED');

-- CreateTable
CREATE TABLE "weekly_plans" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteUserId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "SessionType" NOT NULL,
    "title" TEXT NOT NULL,
    "prescription" JSONB NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_plans_coachId_idx" ON "weekly_plans"("coachId");

-- CreateIndex
CREATE INDEX "weekly_plans_athleteUserId_weekStart_idx" ON "weekly_plans"("athleteUserId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_plans_athleteUserId_weekStart_key" ON "weekly_plans"("athleteUserId", "weekStart");

-- CreateIndex
CREATE INDEX "training_sessions_weeklyPlanId_idx" ON "training_sessions"("weeklyPlanId");

-- CreateIndex
CREATE INDEX "training_sessions_date_idx" ON "training_sessions"("date");

-- AddForeignKey
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_athleteUserId_fkey" FOREIGN KEY ("athleteUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
