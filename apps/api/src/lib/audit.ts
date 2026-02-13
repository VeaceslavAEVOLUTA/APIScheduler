import { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import { getUserId } from "./rbac.js";

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  workspaceId?: string | null;
  metadata?: any;
};

export async function logAudit(request: FastifyRequest, input: AuditInput) {
  const actorUserId = getUserId(request) || undefined;
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || undefined,
      workspaceId: input.workspaceId || undefined,
      metadata: input.metadata,
    },
  });
}
