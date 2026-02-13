import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { rolePreHandler } from "../../lib/rbac.js";

export async function logRoutes(app: FastifyInstance) {
  app.get(
    "/:workspaceId",
    { preHandler: [app.authenticate, rolePreHandler(["OWNER", "ADMIN", "EDITOR", "VIEWER"])] },
    async (request) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const jobRuns = await prisma.jobRun.findMany({
        where: { schedule: { workspaceId } },
        include: { schedule: true },
        orderBy: { finishedAt: "desc" },
        take: 100,
      });

      const monitorChecks = await prisma.monitorCheck.findMany({
        where: { monitor: { workspaceId } },
        include: { monitor: true },
        orderBy: { checkedAt: "desc" },
        take: 100,
      });

      return { jobRuns, monitorChecks };
    }
  );
}
