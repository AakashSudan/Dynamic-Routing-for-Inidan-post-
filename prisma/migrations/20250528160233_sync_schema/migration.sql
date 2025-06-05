/*
  Warnings:

  - Added the required column `description` to the `Issue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `issueType` to the `Issue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `severity` to the `Issue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Issue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `channel` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parcelId` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destination` to the `Parcel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `origin` to the `Parcel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transportMode` to the `Parcel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `Parcel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `distance` to the `Route` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `Route` table without a default value. This is not possible if the table is not empty.
  - Added the required column `routePath` to the `Route` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transportMode` to the `Route` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "affectedParcels" INTEGER[],
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "issueType" TEXT NOT NULL,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "severity" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "channel" TEXT NOT NULL,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "parcelId" INTEGER NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "currentLocation" TEXT,
ADD COLUMN     "delayDuration" TEXT,
ADD COLUMN     "delayReason" TEXT,
ADD COLUMN     "destination" TEXT NOT NULL,
ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "estimatedDelivery" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "origin" TEXT NOT NULL,
ADD COLUMN     "transportMode" TEXT NOT NULL,
ADD COLUMN     "weight" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "distance" TEXT NOT NULL,
ADD COLUMN     "duration" TEXT NOT NULL,
ADD COLUMN     "routePath" JSONB NOT NULL,
ADD COLUMN     "traffic" JSONB,
ADD COLUMN     "transportMode" TEXT NOT NULL,
ADD COLUMN     "weather" JSONB;
