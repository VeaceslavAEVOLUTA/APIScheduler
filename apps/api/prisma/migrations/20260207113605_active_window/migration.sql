-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "activeFrom" TEXT,
ADD COLUMN     "activeTimezone" TEXT,
ADD COLUMN     "activeTo" TEXT;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "activeFrom" TEXT,
ADD COLUMN     "activeTimezone" TEXT,
ADD COLUMN     "activeTo" TEXT;
