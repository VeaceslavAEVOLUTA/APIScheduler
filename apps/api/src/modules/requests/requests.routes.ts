import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { rolePreHandler, rolePreHandlerByApiRequest } from "../../lib/rbac.js";
import { logAudit } from "../../lib/audit.js";
import { executeHttpRequest } from "../../lib/executor.js";

const requestSchema = z.object({
  name: z.string().min(2),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  query: z.record(z.string()).optional(),
  body: z.any().optional(),
  timeoutMs: z.number().int().positive().optional(),
  followRedirects: z.boolean().optional(),
  retryPolicy: z.any().optional(),
  auth: z.any().optional(),
  workspaceId: z.string(),
  workgroupId: z.string().optional(),
});

export async function requestRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };
      return prisma.apiRequest.findMany({ where: { workspaceId } });
    }
  );

  app.post(
    "/",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const input = requestSchema.parse(request.body);
      const created = await prisma.apiRequest.create({ data: input });
      await logAudit(request, {
        action: "request.create",
        entityType: "ApiRequest",
        entityId: created.id,
        workspaceId: created.workspaceId,
        metadata: { name: created.name, method: created.method, url: created.url },
      });
      return reply.send(created);
    }
  );

  app.patch(
    "/:requestId",
    { preHandler: [app.authenticate, rolePreHandlerByApiRequest(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { requestId } = request.params as { requestId: string };
      const input = requestSchema.partial().parse(request.body);
      const updated = await prisma.apiRequest.update({ where: { id: requestId }, data: input });
      await logAudit(request, {
        action: "request.update",
        entityType: "ApiRequest",
        entityId: updated.id,
        workspaceId: updated.workspaceId,
        metadata: input,
      });
      return reply.send(updated);
    }
  );

  app.delete(
    "/:requestId",
    { preHandler: [app.authenticate, rolePreHandlerByApiRequest(["OWNER", "ADMIN"])] },
    async (request, reply) => {
      const { requestId } = request.params as { requestId: string };
      const deleted = await prisma.apiRequest.delete({ where: { id: requestId } });
      await logAudit(request, {
        action: "request.delete",
        entityType: "ApiRequest",
        entityId: deleted.id,
        workspaceId: deleted.workspaceId,
        metadata: { name: deleted.name },
      });
      return reply.send({ ok: true });
    }
  );

  app.post(
    "/run/:requestId",
    { preHandler: [app.authenticate, rolePreHandlerByApiRequest(["OWNER", "ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { requestId } = request.params as { requestId: string };
      const req = await prisma.apiRequest.findUnique({ where: { id: requestId } });
      if (!req) return reply.notFound();

      const result = await executeHttpRequest({
        method: req.method,
        url: req.url,
        headers: req.headers as any,
        query: req.query as any,
        body: req.body,
        timeoutMs: req.timeoutMs,
        followRedirects: req.followRedirects,
        auth: req.auth as any,
      });

      await logAudit(request, {
        action: "request.run",
        entityType: "ApiRequest",
        entityId: req.id,
        workspaceId: req.workspaceId,
        metadata: { name: req.name, statusCode: result.statusCode },
      });
      return reply.send(result);
    }
  );
}
