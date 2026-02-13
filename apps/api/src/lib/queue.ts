import { Queue, Worker } from "bullmq";
import { prisma } from "./prisma.js";
import { executeHttpRequest } from "./executor.js";
import { executeMonitor } from "./monitor.js";
import { sendNotification } from "./notifier.js";
import { config } from "../config.js";
import { isWithinActiveWindow } from "./time-window.js";

export type JobData =
  | { type: "schedule"; scheduleId: string }
  | { type: "monitor"; monitorId: string };

export const jobQueue = new Queue<JobData>("apischeduler", {
  connection: { url: config.redisUrl },
});

export function startWorker() {
  return new Worker<JobData>(
    "apischeduler",
    async (job) => {
      if (job.data.type === "schedule") {
        const schedule = await prisma.schedule.findUnique({
          where: { id: job.data.scheduleId },
          include: { apiRequest: true },
        });
        if (!schedule) return;

        if (
          !isWithinActiveWindow({
            from: schedule.activeFrom,
            to: schedule.activeTo,
            timezone: schedule.activeTimezone,
          })
        ) {
          await prisma.jobRun.create({
            data: {
              scheduleId: schedule.id,
              status: "CANCELED",
              startedAt: new Date(),
              finishedAt: new Date(),
              error: "Outside active window",
            },
          });
          return;
        }

        const conditions = schedule.conditions as any;
        if (conditions) {
          const lastRun = await prisma.jobRun.findFirst({
            where: { scheduleId: schedule.id },
            orderBy: { finishedAt: "desc" },
          });
          if (conditions.requiresLastStatus && lastRun?.status !== conditions.requiresLastStatus) {
            await prisma.jobRun.create({
              data: {
                scheduleId: schedule.id,
                status: "CANCELED",
                startedAt: new Date(),
                finishedAt: new Date(),
                error: `Condition requires last status ${conditions.requiresLastStatus}`,
              },
            });
            return;
          }
          if (conditions.minMinutesSinceLastRun && lastRun?.finishedAt) {
            const elapsed = Date.now() - lastRun.finishedAt.getTime();
            if (elapsed < conditions.minMinutesSinceLastRun * 60 * 1000) {
              await prisma.jobRun.create({
                data: {
                  scheduleId: schedule.id,
                  status: "CANCELED",
                  startedAt: new Date(),
                  finishedAt: new Date(),
                  error: `Condition requires ${conditions.minMinutesSinceLastRun}m since last run`,
                },
              });
              return;
            }
          }
        }

        const state = await prisma.scheduleState.upsert({
          where: { scheduleId: schedule.id },
          create: { scheduleId: schedule.id },
          update: {},
        });

        if (state.circuitOpenUntil && state.circuitOpenUntil > new Date()) {
          await prisma.jobRun.create({
            data: {
              scheduleId: schedule.id,
              status: "CANCELED",
              startedAt: new Date(),
              finishedAt: new Date(),
              error: `Circuit open until ${state.circuitOpenUntil.toISOString()}`,
            },
          });
          return;
        }

        const result = await executeHttpRequest({
          method: schedule.apiRequest.method,
          url: schedule.apiRequest.url,
          headers: schedule.apiRequest.headers as any,
          query: schedule.apiRequest.query as any,
          body: schedule.apiRequest.body,
          timeoutMs: schedule.apiRequest.timeoutMs,
          followRedirects: schedule.apiRequest.followRedirects,
          auth: schedule.apiRequest.auth as any,
        });

        await prisma.jobRun.create({
          data: {
            scheduleId: schedule.id,
            status: result.error ? "FAILED" : "SUCCESS",
            startedAt: new Date(Date.now() - (result.responseMs || 0)),
            finishedAt: new Date(),
            responseMs: result.responseMs,
            statusCode: result.statusCode,
            error: result.error,
            response: result.response as any,
          },
        });

        const nextState = await prisma.scheduleState.update({
          where: { scheduleId: schedule.id },
          data: result.error
            ? {
                consecutiveFailures: { increment: 1 },
                consecutiveSuccesses: 0,
              }
            : {
                consecutiveSuccesses: { increment: 1 },
                consecutiveFailures: 0,
                circuitOpenUntil: null,
              },
        });

        const shouldAlertFail =
          result.error && nextState.consecutiveFailures === schedule.failureThreshold;
        const shouldOpenCircuit =
          result.error &&
          schedule.circuitBreakerThreshold > 0 &&
          nextState.consecutiveFailures >= schedule.circuitBreakerThreshold &&
          schedule.circuitBreakerDurationMs > 0;

        if (shouldOpenCircuit) {
          await prisma.scheduleState.update({
            where: { scheduleId: schedule.id },
            data: { circuitOpenUntil: new Date(Date.now() + schedule.circuitBreakerDurationMs) },
          });
        }

        if (shouldAlertFail || (schedule.alertOnRecovery && !result.error && nextState.consecutiveSuccesses === 1)) {
          const channels = await prisma.notificationChannel.findMany({
            where: { workspaceId: schedule.workspaceId, enabled: true },
          });
          const title = result.error ? `Schedule failed: ${schedule.name}` : `Schedule recovered: ${schedule.name}`;
          const message = result.error ? result.error || "Unknown error" : "Recovered after failures";
          await Promise.all(channels.map((c) => sendNotification(c, { title, message })));
        }
      }

      if (job.data.type === "monitor") {
        const monitor = await prisma.monitor.findUnique({ where: { id: job.data.monitorId } });
        if (!monitor) return;

        if (
          !isWithinActiveWindow({
            from: monitor.activeFrom,
            to: monitor.activeTo,
            timezone: monitor.activeTimezone,
          })
        ) {
          await prisma.monitorCheck.create({
            data: {
              monitorId: monitor.id,
              status: "CANCELED",
              error: "Outside active window",
            },
          });
          return;
        }

        const result = await executeMonitor({
          type: monitor.type,
          url: monitor.url || undefined,
          host: monitor.host || undefined,
          port: monitor.port || undefined,
          timeoutMs: monitor.timeoutMs,
          expectedStatus: monitor.expectedStatus || undefined,
          headers: (monitor.headers as any) || undefined,
        });

        await prisma.monitorCheck.create({
          data: {
            monitorId: monitor.id,
            status: result.error ? "FAILED" : "SUCCESS",
            responseMs: result.responseMs,
            statusCode: result.statusCode,
            error: result.error,
          },
        });

        await prisma.monitorState.upsert({
          where: { monitorId: monitor.id },
          create: { monitorId: monitor.id },
          update: {},
        });

        const nextState = await prisma.monitorState.update({
          where: { monitorId: monitor.id },
          data: result.error
            ? {
                consecutiveFailures: { increment: 1 },
                consecutiveSuccesses: 0,
              }
            : {
                consecutiveSuccesses: { increment: 1 },
                consecutiveFailures: 0,
              },
        });

        const shouldAlertFail =
          result.error && nextState.consecutiveFailures === monitor.failureThreshold;

        if (shouldAlertFail || (monitor.alertOnRecovery && !result.error && nextState.consecutiveSuccesses === 1)) {
          const channels = await prisma.notificationChannel.findMany({
            where: { workspaceId: monitor.workspaceId, enabled: true },
          });
          const title = result.error ? `Monitor failed: ${monitor.name}` : `Monitor recovered: ${monitor.name}`;
          const message = result.error ? result.error || "Unknown error" : "Recovered after failures";
          await Promise.all(channels.map((c) => sendNotification(c, { title, message })));
        }
      }
    },
    { connection: { url: config.redisUrl } }
  );
}
