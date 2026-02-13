import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { rolePreHandler, rolePreHandlerByNotificationChannel } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";

const channelSchema = z.object({
  type: z.enum(["EMAIL", "SLACK", "TELEGRAM", "DISCORD", "TEAMS", "WEBHOOK"]),
  name: z.string().min(2),
  config: z.any(),
  enabled: z.boolean().optional(),
  workspaceId: z.string(),
});

export async function notificationRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };
      return prisma.notificationChannel.findMany({ where: { workspaceId } });
    }
  );

  app.post(
    "/",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const input = channelSchema.parse(request.body);
      const channel = await prisma.notificationChannel.create({ data: input });
      await logAudit(request, {
        action: "notification.create",
        entityType: "NotificationChannel",
        entityId: channel.id,
        workspaceId: channel.workspaceId,
        metadata: { name: channel.name, type: channel.type },
      });
      return reply.send(channel);
    }
  );

  app.patch(
    "/:channelId",
    { preHandler: [app.authenticate, rolePreHandlerByNotificationChannel(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const input = channelSchema.partial().parse(request.body);
      const channel = await prisma.notificationChannel.update({ where: { id: channelId }, data: input });
      await logAudit(request, {
        action: "notification.update",
        entityType: "NotificationChannel",
        entityId: channel.id,
        workspaceId: channel.workspaceId,
        metadata: input,
      });
      return reply.send(channel);
    }
  );

  app.delete(
    "/:channelId",
    { preHandler: [app.authenticate, rolePreHandlerByNotificationChannel(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const deleted = await prisma.notificationChannel.delete({ where: { id: channelId } });
      await logAudit(request, {
        action: "notification.delete",
        entityType: "NotificationChannel",
        entityId: deleted.id,
        workspaceId: deleted.workspaceId,
        metadata: { name: deleted.name, type: deleted.type },
      });
      return reply.send({ ok: true });
    }
  );
}
