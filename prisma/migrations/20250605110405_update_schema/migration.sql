-- CreateTable
CREATE TABLE "PostOffice" (
    "id" SERIAL NOT NULL,
    "city" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostOffice_pkey" PRIMARY KEY ("id")
);
