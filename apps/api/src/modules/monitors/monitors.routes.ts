import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { jobQueue } from "../../lib/queue.js";
import { rolePreHandler, rolePreHandlerByMonitor } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";
import { executeMonitor } from "../../lib/monitor.js";

async function removeRepeatable(monitorId: string) {
  const repeats = await jobQueue.getRepeatableJobs();
  await Promise.all(
    repeats
      .filter((r) => r.name === "monitor" && r.id === monitorId)
      .map((r) => jobQueue.removeRepeatableByKey(r.key))
  );
}

async function enqueueMonitor(monitor: { id: string; intervalMs?: number | null }) {
  await jobQueue.add(
    "monitor",
    { type: "monitor", monitorId: monitor.id },
    { jobId: monitor.id, repeat: { every: monitor.intervalMs || 60000 } }
  );
}

const monitorSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["HTTP", "PING", "TCP", "TLS"]),
  url: z.string().url().optional(),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  intervalMs: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
  expectedStatus: z.number().int().optional(),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().optional(),
  showOnStatus: z.boolean().optional(),
  activeFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  activeTo: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  activeTimezone: z.string().optional(),
  failureThreshold: z.number().int().positive().optional(),
  alertOnRecovery: z.boolean().optional(),
  workspaceId: z.string(),
  workgroupId: z.string().optional(),
});

export async function monitorRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };
      return prisma.monitor.findMany({ where: { workspaceId } });
    }
  );

  app.post(
    "/",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const input = monitorSchema.parse(request.body);
      const monitor = await prisma.monitor.create({ data: input });

      if (monitor.enabled) {
        await enqueueMonitor(monitor);
      }

      await logAudit(request, {
        action: "monitor.create",
        entityType: "Monitor",
        entityId: monitor.id,
        workspaceId: monitor.workspaceId,
        metadata: { name: monitor.name, type: monitor.type },
      });
      return reply.send(monitor);
    }
  );

  app.patch(
    "/:monitorId",
    { preHandler: [app.authenticate, rolePreHandlerByMonitor(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { monitorId } = request.params as { monitorId: string };
      const input = monitorSchema.partial().parse(request.body);
      const monitor = await prisma.monitor.update({ where: { id: monitorId }, data: input });
      await removeRepeatable(monitor.id);
      if (monitor.enabled) {
        await enqueueMonitor(monitor);
      }
      await logAudit(request, {
        action: "monitor.update",
        entityType: "Monitor",
        entityId: monitor.id,
        workspaceId: monitor.workspaceId,
        metadata: input,
      });
      return reply.send(monitor);
    }
  );

  app.delete(
    "/:monitorId",
    { preHandler: [app.authenticate, rolePreHandlerByMonitor(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { monitorId } = request.params as { monitorId: string };
      await prisma.monitorCheck.deleteMany({ where: { monitorId } });
      await prisma.monitorState.deleteMany({ where: { monitorId } });
      const deleted = await prisma.monitor.delete({ where: { id: monitorId } });
      await logAudit(request, {
        action: "monitor.delete",
        entityType: "Monitor",
        entityId: deleted.id,
        workspaceId: deleted.workspaceId,
        metadata: { name: deleted.name },
      });
      return reply.send({ ok: true });
    }
  );

  app.post(
    "/run/:monitorId",
    { preHandler: [app.authenticate, rolePreHandlerByMonitor(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { monitorId } = request.params as { monitorId: string };
      const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
      if (!monitor) return reply.notFound();

      const result = await executeMonitor({
        type: monitor.type,
        url: monitor.url || undefined,
        host: monitor.host || undefined,
        port: monitor.port || undefined,
        timeoutMs: monitor.timeoutMs,
        expectedStatus: monitor.expectedStatus || undefined,
        headers: (monitor.headers as any) || undefined,
      });

      await logAudit(request, {
        action: "monitor.run",
        entityType: "Monitor",
        entityId: monitor.id,
        workspaceId: monitor.workspaceId,
        metadata: { name: monitor.name, status: result.status, statusCode: result.statusCode },
      });
      return reply.send(result);
    }
  );

  app.get(
    "/checks/:monitorId",
    { preHandler: [app.authenticate, rolePreHandlerByMonitor(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { monitorId } = request.params as { monitorId: string };
      return prisma.monitorCheck.findMany({
        where: { monitorId },
        orderBy: { checkedAt: "desc" },
        take: 100,
      });
    }
  );
}
