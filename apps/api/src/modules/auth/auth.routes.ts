import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config.js";
import { getUserId } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  workspaceName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

    const workspace = await prisma.workspace.create({
      data: {
        name: input.workspaceName,
        slug: input.workspaceName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
      },
    });

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        firstName: input.firstName,
        lastName: input.lastName,
        memberships: {
          create: {
            workspaceId: workspace.id,
            role: "OWNER",
          },
        },
      },
    });

    const token = app.jwt.sign({ sub: user.id, workspaceId: workspace.id });
    await logAudit(request, {
      action: "auth.register",
      entityType: "User",
      entityId: user.id,
      workspaceId: workspace.id,
    });
    return reply.send({ token, userId: user.id, workspaceId: workspace.id });
  });

  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) return reply.unauthorized();

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) return reply.unauthorized();

    const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
    const token = app.jwt.sign({ sub: user.id, workspaceId: membership?.workspaceId });
    await logAudit(request, {
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      workspaceId: membership?.workspaceId,
    });
    return reply.send({ token, userId: user.id, workspaceId: membership?.workspaceId });
  });

  app.post("/reset-password", async (request, reply) => {
    const input = resetPasswordSchema.parse(request.body);
    const reset = await prisma.passwordResetToken.findUnique({ where: { token: input.token } });
    if (!reset || reset.usedAt) return reply.badRequest("Token non valido");
    if (reset.expiresAt < new Date()) return reply.badRequest("Token scaduto");

    const passwordHash = await bcrypt.hash(input.newPassword, config.bcryptRounds);
    await prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    });
    await prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });
    await logAudit(request, {
      action: "auth.resetPassword",
      entityType: "User",
      entityId: reset.userId,
    });
    return reply.send({ ok: true });
  });

  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.unauthorized();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.notFound();
    return { id: user.id, email: user.email, name: user.name, firstName: user.firstName, lastName: user.lastName, isSuperAdmin: user.isSuperAdmin };
  });
}
