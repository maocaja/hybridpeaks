/*
  Warnings:

  - You are about to drop the `garmin_connections` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "garmin_connections" DROP CONSTRAINT "garmin_connections_coachProfileId_fkey";

-- DropTable
DROP TABLE "garmin_connections";
