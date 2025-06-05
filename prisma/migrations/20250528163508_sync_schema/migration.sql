/*
  Warnings:

  - You are about to drop the column `affectedParcels` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `issueType` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `channel` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `parcelId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `distance` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `routePath` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `traffic` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `transportMode` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `weather` on the `Route` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Issue" DROP COLUMN "affectedParcels",
DROP COLUMN "description",
DROP COLUMN "issueType",
DROP COLUMN "location",
DROP COLUMN "severity",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "channel",
DROP COLUMN "message",
DROP COLUMN "parcelId",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Route" DROP COLUMN "distance",
DROP COLUMN "duration",
DROP COLUMN "routePath",
DROP COLUMN "traffic",
DROP COLUMN "transportMode",
DROP COLUMN "weather";
