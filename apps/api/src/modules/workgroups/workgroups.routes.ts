import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { rolePreHandler, rolePreHandlerByWorkgroup } from "../../lib/rbac.js";

const createWorkgroupSchema = z.object({
  name: z.string().min(2),
  workspaceId: z.string(),
});

const updateWorkgroupSchema = z.object({
  name: z.string().min(2).optional(),
});

export async function workgroupRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };
      return prisma.workgroup.findMany({ where: { workspaceId } });
    }
  );

  app.post(
    "/",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const input = createWorkgroupSchema.parse(request.body);
      const workgroup = await prisma.workgroup.create({ data: input });
      return reply.send(workgroup);
    }
  );

  app.patch(
    "/:workgroupId",
    { preHandler: [app.authenticate, rolePreHandlerByWorkgroup(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { workgroupId } = request.params as { workgroupId: string };
      const input = updateWorkgroupSchema.parse(request.body);
      const workgroup = await prisma.workgroup.update({ where: { id: workgroupId }, data: input });
      return reply.send(workgroup);
    }
  );

  app.delete(
    "/:workgroupId",
    { preHandler: [app.authenticate, rolePreHandlerByWorkgroup(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { workgroupId } = request.params as { workgroupId: string };
      await prisma.workgroup.delete({ where: { id: workgroupId } });
      return reply.send({ ok: true });
    }
  );
}
