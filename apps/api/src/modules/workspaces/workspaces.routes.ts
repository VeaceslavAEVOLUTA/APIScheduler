import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getUserId, getUser, rolePreHandler } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";

const createWorkspaceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).optional(),
  statusPageEnabled: z.boolean().optional(),
  statusTitle: z.string().min(2).optional(),
  statusDescription: z.string().min(2).optional(),
});

export async function workspaceRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.authenticate }, async (request) => {
    const user = await getUser(request);
    if (!user) return [];

    if (user.isSuperAdmin) {
      const workspaces = await prisma.workspace.findMany();
      return workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        role: "OWNER",
        isSuperAdmin: true,
        statusPageEnabled: w.statusPageEnabled,
        statusTitle: w.statusTitle,
        statusDescription: w.statusDescription,
      }));
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      statusPageEnabled: m.workspace.statusPageEnabled,
      statusTitle: m.workspace.statusTitle,
      statusDescription: m.workspace.statusDescription,
    }));
  });

  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    const input = createWorkspaceSchema.parse(request.body);
    const userId = getUserId(request);
    if (!userId) return reply.unauthorized();

    const slug = input.slug || `${input.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    const workspace = await prisma.workspace.create({
      data: {
        name: input.name,
        slug,
        memberships: {
          create: { userId, role: "OWNER" },
        },
      },
    });

    await logAudit(request, {
      action: "workspace.create",
      entityType: "Workspace",
      entityId: workspace.id,
      workspaceId: workspace.id,
      metadata: { name: workspace.name },
    });
    return reply.send(workspace);
  });

  app.get("/:workspaceId", { preHandler: app.authenticate }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const user = await getUser(request);
    if (!user) return reply.unauthorized();

    if (user.isSuperAdmin) {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) return reply.notFound();
      return { ...workspace, role: "OWNER", isSuperAdmin: true };
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      include: { workspace: true },
    });
    if (!membership) return reply.forbidden();

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      statusPageEnabled: membership.workspace.statusPageEnabled,
      statusTitle: membership.workspace.statusTitle,
      statusDescription: membership.workspace.statusDescription,
    };
  });

  app.patch(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      const input = updateWorkspaceSchema.parse(request.body);
      const updated = await prisma.workspace.update({
        where: { id: workspaceId },
        data: input,
      });
      await logAudit(request, {
        action: "workspace.update",
        entityType: "Workspace",
        entityId: workspaceId,
        workspaceId,
        metadata: input,
      });
      return reply.send(updated);
    }
  );

  app.delete(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      await prisma.$transaction(async (tx) => {
        const schedules = await tx.schedule.findMany({ where: { workspaceId }, select: { id: true } });
        const monitors = await tx.monitor.findMany({ where: { workspaceId }, select: { id: true } });

        await tx.jobRun.deleteMany({ where: { scheduleId: { in: schedules.map((s) => s.id) } } });
        await tx.scheduleState.deleteMany({ where: { scheduleId: { in: schedules.map((s) => s.id) } } });
        await tx.monitorCheck.deleteMany({ where: { monitorId: { in: monitors.map((m) => m.id) } } });
        await tx.monitorState.deleteMany({ where: { monitorId: { in: monitors.map((m) => m.id) } } });

        await tx.schedule.deleteMany({ where: { workspaceId } });
        await tx.monitor.deleteMany({ where: { workspaceId } });
        await tx.apiRequest.deleteMany({ where: { workspaceId } });
        await tx.notificationChannel.deleteMany({ where: { workspaceId } });
        await tx.workgroup.deleteMany({ where: { workspaceId } });
        await tx.invitation.deleteMany({ where: { workspaceId } });
        await tx.membership.deleteMany({ where: { workspaceId } });
        await tx.workspace.delete({ where: { id: workspaceId } });
      });

      await logAudit(request, {
        action: "workspace.delete",
        entityType: "Workspace",
        entityId: workspaceId,
        workspaceId,
      });
      return reply.send({ ok: true });
    }
  );
}
