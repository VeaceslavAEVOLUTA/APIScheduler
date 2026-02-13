import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { rolePreHandler, rolePreHandlerByMembership } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";

const updateRoleSchema = z.object({ role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]) });

export async function memberRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };
      return prisma.membership.findMany({
        where: { workspaceId },
        include: { user: true },
      });
    }
  );

  app.patch(
    "/:membershipId",
    { preHandler: [app.authenticate, rolePreHandlerByMembership(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { membershipId } = request.params as { membershipId: string };
      const input = updateRoleSchema.parse(request.body);
      const updated = await prisma.membership.update({ where: { id: membershipId }, data: input });
      await logAudit(request, {
        action: "member.updateRole",
        entityType: "Membership",
        entityId: updated.id,
        workspaceId: updated.workspaceId,
        metadata: { role: updated.role, userId: updated.userId },
      });
      return reply.send(updated);
    }
  );

  app.delete(
    "/:membershipId",
    { preHandler: [app.authenticate, rolePreHandlerByMembership(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { membershipId } = request.params as { membershipId: string };
      const deleted = await prisma.membership.delete({ where: { id: membershipId } });
      await logAudit(request, {
        action: "member.remove",
        entityType: "Membership",
        entityId: deleted.id,
        workspaceId: deleted.workspaceId,
        metadata: { userId: deleted.userId },
      });
      return reply.send({ ok: true });
    }
  );
}
