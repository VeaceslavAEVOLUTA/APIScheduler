import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config.js";
import { getUserId } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export async function usersRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.unauthorized();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.notFound();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperAdmin: user.isSuperAdmin,
    };
  });

  app.patch("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.unauthorized();
    const input = updateProfileSchema.parse(request.body);
    const updated = await prisma.user.update({ where: { id: userId }, data: input });
    await logAudit(request, {
      action: "user.updateProfile",
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
    });
  });

  app.post("/me/password", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) return reply.unauthorized();
    const input = changePasswordSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.notFound();
    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) return reply.unauthorized("Password attuale non valida");
    const passwordHash = await bcrypt.hash(input.newPassword, config.bcryptRounds);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await logAudit(request, {
      action: "user.changePassword",
      entityType: "User",
      entityId: userId,
    });
    return reply.send({ ok: true });
  });
}
