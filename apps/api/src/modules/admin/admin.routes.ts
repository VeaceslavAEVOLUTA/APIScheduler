import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { superAdminPreHandler } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";
import { z } from "zod";
import bcrypt from "bcrypt";
import { config } from "../../config.js";
import crypto from "crypto";

export async function adminRoutes(app: FastifyInstance) {
  const pre = [app.authenticate, superAdminPreHandler()];

  app.get("/users", { preHandler: pre }, async () =>
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  );
  app.get("/workspaces", { preHandler: pre }, async () => prisma.workspace.findMany());
  app.get("/workgroups", { preHandler: pre }, async () => prisma.workgroup.findMany());
  app.get("/requests", { preHandler: pre }, async () => prisma.apiRequest.findMany());
  app.get("/schedules", { preHandler: pre }, async () => prisma.schedule.findMany());
  app.get("/monitors", { preHandler: pre }, async () => prisma.monitor.findMany());
  app.get("/notifications", { preHandler: pre }, async () => prisma.notificationChannel.findMany());
  app.get(
    "/audit",
    { preHandler: pre },
    async (request) => {
      const limit = Math.min(200, Number((request.query as any)?.limit || 50));
      return prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { actor: { select: { id: true, email: true, name: true, firstName: true, lastName: true } } },
      });
    }
  );

  app.delete("/users/:userId", { preHandler: pre }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    await prisma.user.delete({ where: { id: userId } });
    await logAudit(request, {
      action: "admin.user.delete",
      entityType: "User",
      entityId: userId,
    });
    return reply.send({ ok: true });
  });

  app.patch("/users/:userId", { preHandler: pre }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const schema = z.object({
      email: z.string().email().optional(),
      name: z.string().min(1).optional(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      isSuperAdmin: z.boolean().optional(),
    });
    const input = schema.parse(request.body);
    const updated = await prisma.user.update({ where: { id: userId }, data: input });
    await logAudit(request, {
      action: "admin.user.update",
      entityType: "User",
      entityId: updated.id,
      metadata: input,
    });
    return reply.send({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      firstName: updated.firstName,
      lastName: updated.lastName,
      isSuperAdmin: updated.isSuperAdmin,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  });

  app.post("/users/:userId/password", { preHandler: pre }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const schema = z.object({ newPassword: z.string().min(8) });
    const input = schema.parse(request.body);
    const passwordHash = await bcrypt.hash(input.newPassword, config.bcryptRounds);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await logAudit(request, {
      action: "admin.user.resetPassword",
      entityType: "User",
      entityId: userId,
    });
    return reply.send({ ok: true });
  });

  app.post("/users/:userId/reset-token", { preHandler: pre }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    const created = await prisma.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });
    await logAudit(request, {
      action: "admin.user.createResetToken",
      entityType: "User",
      entityId: userId,
    });
    return reply.send({ token: created.token, expiresAt: created.expiresAt });
  });

  app.delete("/workspaces/:workspaceId", { preHandler: pre }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await logAudit(request, {
      action: "admin.workspace.delete",
      entityType: "Workspace",
      entityId: workspaceId,
      workspaceId,
    });
    return reply.send({ ok: true });
  });
}
