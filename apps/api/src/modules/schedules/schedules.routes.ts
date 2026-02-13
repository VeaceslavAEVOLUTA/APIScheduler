import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { jobQueue } from "../../lib/queue.js";
import { rolePreHandler, rolePreHandlerBySchedule } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";

async function removeRepeatable(scheduleId: string) {
  const repeats = await jobQueue.getRepeatableJobs();
  await Promise.all(
    repeats
      .filter((r) => r.name === "schedule" && r.id === scheduleId)
      .map((r) => jobQueue.removeRepeatableByKey(r.key))
  );
}

async function enqueueSchedule(schedule: {
  id: string;
  type: string;
  cron?: string | null;
  intervalMs?: number | null;
  maxRetries?: number | null;
  backoffMs?: number | null;
}) {
  if (schedule.type === "CRON" && schedule.cron) {
    await jobQueue.add(
      "schedule",
      { type: "schedule", scheduleId: schedule.id },
      {
        jobId: schedule.id,
        repeat: { pattern: schedule.cron },
        attempts: schedule.maxRetries ? schedule.maxRetries + 1 : 1,
        backoff: schedule.backoffMs ? { type: "fixed", delay: schedule.backoffMs } : undefined,
      }
    );
  } else if (schedule.type === "INTERVAL" && schedule.intervalMs) {
    await jobQueue.add(
      "schedule",
      { type: "schedule", scheduleId: schedule.id },
      {
        jobId: schedule.id,
        repeat: { every: schedule.intervalMs },
        attempts: schedule.maxRetries ? schedule.maxRetries + 1 : 1,
        backoff: schedule.backoffMs ? { type: "fixed", delay: schedule.backoffMs } : undefined,
      }
    );
  } else if (schedule.type === "ONE_SHOT") {
    await jobQueue.add(
      "schedule",
      { type: "schedule", scheduleId: schedule.id },
      {
        attempts: schedule.maxRetries ? schedule.maxRetries + 1 : 1,
        backoff: schedule.backoffMs ? { type: "fixed", delay: schedule.backoffMs } : undefined,
      }
    );
  }
}

const scheduleSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["CRON", "INTERVAL", "ONE_SHOT"]),
  cron: z.string().optional(),
  intervalMs: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
  showOnStatus: z.boolean().optional(),
  activeFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  activeTo: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  activeTimezone: z.string().optional(),
  maxRetries: z.number().int().nonnegative().optional(),
  backoffMs: z.number().int().nonnegative().optional(),
  failureThreshold: z.number().int().positive().optional(),
  circuitBreakerThreshold: z.number().int().nonnegative().optional(),
  circuitBreakerDurationMs: z.number().int().nonnegative().optional(),
  alertOnRecovery: z.boolean().optional(),
  conditions: z.any().optional(),
  workspaceId: z.string(),
  workgroupId: z.string().optional(),
  apiRequestId: z.string(),
});

export async function scheduleRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };
      return prisma.schedule.findMany({ where: { workspaceId } });
    }
  );

  app.post(
    "/",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const input = scheduleSchema.parse(request.body);
      const schedule = await prisma.schedule.create({ data: input });

      if (schedule.enabled) {
        await enqueueSchedule(schedule);
      }

      await logAudit(request, {
        action: "schedule.create",
        entityType: "Schedule",
        entityId: schedule.id,
        workspaceId: schedule.workspaceId,
        metadata: { name: schedule.name, type: schedule.type },
      });
      return reply.send(schedule);
    }
  );

  app.patch(
    "/:scheduleId",
    { preHandler: [app.authenticate, rolePreHandlerBySchedule(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { scheduleId } = request.params as { scheduleId: string };
      const input = scheduleSchema.partial().parse(request.body);
      const schedule = await prisma.schedule.update({ where: { id: scheduleId }, data: input });
      await removeRepeatable(schedule.id);
      if (schedule.enabled) {
        await enqueueSchedule(schedule);
      }
      await logAudit(request, {
        action: "schedule.update",
        entityType: "Schedule",
        entityId: schedule.id,
        workspaceId: schedule.workspaceId,
        metadata: input,
      });
      return reply.send(schedule);
    }
  );

  app.delete(
    "/:scheduleId",
    { preHandler: [app.authenticate, rolePreHandlerBySchedule(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { scheduleId } = request.params as { scheduleId: string };
      await prisma.jobRun.deleteMany({ where: { scheduleId } });
      await prisma.scheduleState.deleteMany({ where: { scheduleId } });
      const deleted = await prisma.schedule.delete({ where: { id: scheduleId } });
      await logAudit(request, {
        action: "schedule.delete",
        entityType: "Schedule",
        entityId: deleted.id,
        workspaceId: deleted.workspaceId,
        metadata: { name: deleted.name },
      });
      return reply.send({ ok: true });
    }
  );

  app.get(
    "/runs/:scheduleId",
    { preHandler: [app.authenticate, rolePreHandlerBySchedule(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { scheduleId } = request.params as { scheduleId: string };
      return prisma.jobRun.findMany({
        where: { scheduleId },
        orderBy: { finishedAt: "desc" },
        take: 100,
      });
    }
  );
}
