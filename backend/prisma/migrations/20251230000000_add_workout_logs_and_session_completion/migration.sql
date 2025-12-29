-- AlterTable
ALTER TABLE "training_sessions" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteUserId" TEXT NOT NULL,
    "type" "SessionType" NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workout_logs_sessionId_key" ON "workout_logs"("sessionId");

-- CreateIndex
CREATE INDEX "workout_logs_athleteUserId_idx" ON "workout_logs"("athleteUserId");

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_athleteUserId_fkey" FOREIGN KEY ("athleteUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
