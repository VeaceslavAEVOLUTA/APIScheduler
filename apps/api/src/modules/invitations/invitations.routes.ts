import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getUserId, rolePreHandler, rolePreHandlerByInvite } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";
import { sendInviteEmail } from "../../lib/email.js";
import { config } from "../../config.js";

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
  workspaceId: z.string(),
  expiresInHours: z.number().int().positive().default(72),
});

const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

export async function invitationRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN"])] },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };
      return prisma.invitation.findMany({ where: { workspaceId } });
    }
  );

  app.get(
    "/user/me",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) return reply.unauthorized();
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.notFound();
      return prisma.invitation.findMany({ where: { email: user.email, status: "PENDING" } });
    }
  );

  app.post(
    "/",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const input = createInviteSchema.parse(request.body);
      const userId = getUserId(request);
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + input.expiresInHours * 3600 * 1000);

      const invite = await prisma.invitation.create({
        data: {
          email: input.email,
          role: input.role,
          token,
          workspaceId: input.workspaceId,
          invitedById: userId!,
          expiresAt,
        },
      });

      try {
        const inviter = await prisma.user.findUnique({ where: { id: userId! } });
        const workspace = await prisma.workspace.findUnique({ where: { id: input.workspaceId } });
        const inviterLabel = inviter?.name || inviter?.email || "Un membro del team";
        const workspaceName = workspace?.name || "Workspace";
        const inviteUrl = `${config.webUrl.replace(/\/$/, "")}/invite?token=${token}`;
        await sendInviteEmail({
          to: invite.email,
          inviter: inviterLabel,
          workspace: workspaceName,
          role: invite.role,
          inviteUrl,
          expiresAt,
        });
      } catch {
        // non blocca la creazione invito se l'email fallisce
      }

      await logAudit(request, {
        action: "invite.create",
        entityType: "Invitation",
        entityId: invite.id,
        workspaceId: invite.workspaceId,
        metadata: { email: invite.email, role: invite.role },
      });
      return reply.send(invite);
    }
  );

  app.post("/accept", async (request, reply) => {
    const input = acceptInviteSchema.parse(request.body);
    const invite = await prisma.invitation.findUnique({ where: { token: input.token } });
    if (!invite || invite.status !== "PENDING") return reply.notFound();
    if (invite.expiresAt < new Date()) return reply.badRequest("Invitation expired");

    let user = await prisma.user.findUnique({ where: { email: invite.email } });
    if (!user) {
      const bcrypt = (await import("bcrypt")).default;
      const { config } = await import("../../config.js");
      const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);
      user = await prisma.user.create({
        data: {
          email: invite.email,
          passwordHash,
          name: input.name,
        },
      });
    }

    await prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId } },
      update: { role: invite.role },
      create: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role },
    });

    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });

    await logAudit(request, {
      action: "invite.accept",
      entityType: "Invitation",
      entityId: invite.id,
      workspaceId: invite.workspaceId,
      metadata: { email: invite.email, role: invite.role },
    });
    return reply.send({ ok: true });
  });

  app.post(
    "/revoke/:inviteId",
    { preHandler: [app.authenticate, rolePreHandlerByInvite(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { inviteId } = request.params as { inviteId: string };
      const invite = await prisma.invitation.update({
        where: { id: inviteId },
        data: { status: "REVOKED" },
      });
      await logAudit(request, {
        action: "invite.revoke",
        entityType: "Invitation",
        entityId: invite.id,
        workspaceId: invite.workspaceId,
        metadata: { email: invite.email },
      });
      return reply.send(invite);
    }
  );

  app.delete(
    "/:inviteId",
    { preHandler: [app.authenticate, rolePreHandlerByInvite(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { inviteId } = request.params as { inviteId: string };
      const invite = await prisma.invitation.delete({ where: { id: inviteId } });
      await logAudit(request, {
        action: "invite.delete",
        entityType: "Invitation",
        entityId: invite.id,
        workspaceId: invite.workspaceId,
        metadata: { email: invite.email },
      });
      return reply.send(invite);
    }
  );
}
