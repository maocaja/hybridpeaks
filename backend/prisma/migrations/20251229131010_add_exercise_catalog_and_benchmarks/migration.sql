-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('STRENGTH', 'ENDURANCE');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('GYM', 'BIKE', 'RUN', 'SWIM');

-- CreateEnum
CREATE TYPE "BenchmarkKey" AS ENUM ('FTP', 'HR_MAX', 'HR_REST', 'ONE_RM');

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "modality" "Modality",
    "description" TEXT,
    "videoUrl" TEXT,
    "primaryMuscles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_benchmarks" (
    "id" TEXT NOT NULL,
    "athleteUserId" TEXT NOT NULL,
    "key" "BenchmarkKey" NOT NULL,
    "context" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "athlete_benchmarks_athleteUserId_key_idx" ON "athlete_benchmarks"("athleteUserId", "key");

-- AddForeignKey
ALTER TABLE "athlete_benchmarks" ADD CONSTRAINT "athlete_benchmarks_athleteUserId_fkey" FOREIGN KEY ("athleteUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
