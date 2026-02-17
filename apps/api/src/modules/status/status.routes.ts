import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/status/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace || workspace.statusPageEnabled === false) return reply.notFound();

    const monitors = await prisma.monitor.findMany({
      where: {
        workspaceId: workspace.id,
        showOnStatus: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const schedules = await prisma.schedule.findMany({
      where: {
        workspaceId: workspace.id,
        showOnStatus: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const monitorChecks = await prisma.monitorCheck.findMany({
      where: { monitorId: { in: monitors.map((m) => m.id) } },
      orderBy: { checkedAt: "desc" },
      take: 50,
    });

    const jobRuns = await prisma.jobRun.findMany({
      where: { scheduleId: { in: schedules.map((s) => s.id) } },
      orderBy: { finishedAt: "desc" },
      take: 50,
    });

    const checksByMonitor = new Map<string, typeof monitorChecks>();
    for (const c of monitorChecks) {
      const arr = checksByMonitor.get(c.monitorId) || [];
      arr.push(c);
      checksByMonitor.set(c.monitorId, arr);
    }
    const runsBySchedule = new Map<string, typeof jobRuns>();
    for (const r of jobRuns) {
      const arr = runsBySchedule.get(r.scheduleId) || [];
      arr.push(r);
      runsBySchedule.set(r.scheduleId, arr);
    }

    const monitorStatus = monitors.map((m) => {
      const list = checksByMonitor.get(m.id) || [];
      const recent = list.slice(0, 30);
      const ok = recent.filter((x) => x.status === "SUCCESS").length;
      const pct = recent.length ? Math.round((ok / recent.length) * 100) : 0;
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        url: m.url,
        host: m.host,
        lastStatus: list[0]?.status || "UNKNOWN",
        lastCheckedAt: list[0]?.checkedAt || null,
        uptimePct: pct,
        history: recent.map((x) => ({
          ok: x.status === "SUCCESS",
          status: x.status,
          timestamp: x.checkedAt,
          responseMs: x.responseMs ?? null,
          statusCode: x.statusCode ?? null,
          response: null,
          error: x.error ?? null,
        })),
      };
    });

    const scheduleStatus = schedules.map((s) => {
      const list = runsBySchedule.get(s.id) || [];
      const recent = list.slice(0, 30);
      const ok = recent.filter((x) => x.status === "SUCCESS").length;
      const pct = recent.length ? Math.round((ok / recent.length) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        lastStatus: list[0]?.status || "UNKNOWN",
        lastFinishedAt: list[0]?.finishedAt || null,
        uptimePct: pct,
        history: recent.map((x) => ({
          ok: x.status === "SUCCESS",
          status: x.status,
          timestamp: x.finishedAt || x.startedAt || null,
          responseMs: x.responseMs ?? null,
          statusCode: x.statusCode ?? null,
          response: x.response ?? null,
          error: x.error ?? null,
        })),
      };
    });

    return reply.send({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        statusTitle: workspace.statusTitle || workspace.name,
        statusDescription: workspace.statusDescription || null,
      },
      monitors: monitorStatus,
      schedules: scheduleStatus,
    });
  });
}
