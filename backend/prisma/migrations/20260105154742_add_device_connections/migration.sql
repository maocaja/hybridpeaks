-- CreateEnum
CREATE TYPE "DeviceProvider" AS ENUM ('GARMIN', 'WAHOO');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateTable
CREATE TABLE "device_connections" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "provider" "DeviceProvider" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_connections_athleteProfileId_idx" ON "device_connections"("athleteProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "device_connections_athleteProfileId_provider_key" ON "device_connections"("athleteProfileId", "provider");

-- AddForeignKey
ALTER TABLE "device_connections" ADD CONSTRAINT "device_connections_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
