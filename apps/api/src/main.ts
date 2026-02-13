import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { workspaceRoutes } from "./modules/workspaces/workspaces.routes.js";
import { workgroupRoutes } from "./modules/workgroups/workgroups.routes.js";
import { invitationRoutes } from "./modules/invitations/invitations.routes.js";
import { requestRoutes } from "./modules/requests/requests.routes.js";
import { scheduleRoutes } from "./modules/schedules/schedules.routes.js";
import { monitorRoutes } from "./modules/monitors/monitors.routes.js";
import { notificationRoutes } from "./modules/notifications/notifications.routes.js";
import { startWorker } from "./lib/queue.js";
import { ensureSuperAdmin } from "./lib/bootstrap.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { memberRoutes } from "./modules/members/members.routes.js";
import { logRoutes } from "./modules/logs/logs.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { statusRoutes } from "./modules/status/status.routes.js";

const logger =
  config.logLevel === "silent" || config.logLevel === "none"
    ? false
    : { level: config.logLevel };
const app = Fastify({ logger, disableRequestLogging: config.disableRequestLogging, trustProxy: config.trustProxy });

const corsOrigins = config.corsOrigin
  ? config.corsOrigin.split(",").map((o) => o.trim()).filter(Boolean)
  : true;
await app.register(cors, { origin: corsOrigins, credentials: true });
await app.register(sensible);
await app.register(jwt, { secret: config.jwtSecret });
if (config.rateLimitEnabled) {
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  });
}

await app.register(swagger, {
  swagger: {
    info: { title: "APIScheduler API", version: "0.1.0" },
    consumes: ["application/json"],
    produces: ["application/json"],
  },
});
await app.register(swaggerUI, { routePrefix: "/docs" });

app.decorate("authenticate", async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.unauthorized();
  }
});

await app.register(healthRoutes, { prefix: "/health" });
await app.register(authRoutes, { prefix: "/auth" });
await app.register(workspaceRoutes, { prefix: "/workspaces" });
await app.register(workgroupRoutes, { prefix: "/workgroups" });
await app.register(invitationRoutes, { prefix: "/invitations" });
await app.register(requestRoutes, { prefix: "/requests" });
await app.register(scheduleRoutes, { prefix: "/schedules" });
await app.register(monitorRoutes, { prefix: "/monitors" });
await app.register(notificationRoutes, { prefix: "/notifications" });
await app.register(adminRoutes, { prefix: "/admin" });
await app.register(memberRoutes, { prefix: "/members" });
await app.register(logRoutes, { prefix: "/logs" });
await app.register(usersRoutes, { prefix: "/users" });
await app.register(statusRoutes, { prefix: "/public" });

app.get("/", async () => ({ name: "APIScheduler API", status: "ok" }));

if (config.queueWorker) {
  startWorker();
}

await ensureSuperAdmin();
app.listen({ port: config.apiPort, host: "0.0.0.0" });
