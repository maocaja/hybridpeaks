-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('NOT_CONNECTED', 'PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "training_sessions" ADD COLUMN     "exportProvider" "DeviceProvider",
ADD COLUMN     "exportStatus" "ExportStatus" DEFAULT 'NOT_CONNECTED',
ADD COLUMN     "exportedAt" TIMESTAMP(3),
ADD COLUMN     "externalWorkoutId" TEXT,
ADD COLUMN     "lastExportError" TEXT;

-- CreateIndex
CREATE INDEX "training_sessions_exportStatus_idx" ON "training_sessions"("exportStatus");
