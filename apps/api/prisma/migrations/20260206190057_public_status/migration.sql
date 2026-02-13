-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "showOnStatus" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "showOnStatus" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "statusDescription" TEXT,
ADD COLUMN     "statusPageEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "statusTitle" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "workspaceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
