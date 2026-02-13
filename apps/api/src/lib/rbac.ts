import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export type JwtUser = {
  sub: string;
  workspaceId?: string;
};

export function getUserId(request: FastifyRequest) {
  const user = request.user as JwtUser | undefined;
  return user?.sub;
}

export async function getUser(request: FastifyRequest) {
  const userId = getUserId(request);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireSuperAdmin(request: FastifyRequest) {
  const user = await getUser(request);
  return !!user?.isSuperAdmin;
}

export async function requireWorkspaceRole(
  request: FastifyRequest,
  workspaceId: string,
  roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">
) {
  const user = await getUser(request);
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });

  if (!membership) return false;
  return roles.includes(membership.role);
}

export function rolePreHandler(roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">) {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const workspaceId = (request.params as any).workspaceId || (request.body as any)?.workspaceId;
    if (!workspaceId) return reply.badRequest("workspaceId is required");
    const ok = await requireWorkspaceRole(request, workspaceId, roles);
    if (!ok) return reply.forbidden();
  };
}

export function rolePreHandlerByWorkgroup(roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">) {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const workgroupId = (request.params as any).workgroupId;
    if (!workgroupId) return reply.badRequest("workgroupId is required");
    const workgroup = await prisma.workgroup.findUnique({ where: { id: workgroupId } });
    if (!workgroup) return reply.notFound();
    const ok = await requireWorkspaceRole(request, workgroup.workspaceId, roles);
    if (!ok) return reply.forbidden();
  };
}

export function rolePreHandlerByInvite(roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">) {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const inviteId = (request.params as any).inviteId;
    if (!inviteId) return reply.badRequest("inviteId is required");
    const invite = await prisma.invitation.findUnique({ where: { id: inviteId } });
    if (!invite) return reply.notFound();
    const ok = await requireWorkspaceRole(request, invite.workspaceId, roles);
    if (!ok) return reply.forbidden();
  };
}

export function rolePreHandlerByApiRequest(roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">) {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const requestId = (request.params as any).requestId;
    if (!requestId) return reply.badRequest("requestId is required");
    const apiRequest = await prisma.apiRequest.findUnique({ where: { id: requestId } });
    if (!apiRequest) return reply.notFound();
    const ok = await requireWorkspaceRole(request, apiRequest.workspaceId, roles);
    if (!ok) return reply.forbidden();
  };
}

export function rolePreHandlerBySchedule(roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">) {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const scheduleId = (request.params as any).scheduleId;
    if (!scheduleId) return reply.badRequest("scheduleId is required");
    const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) return reply.notFound();
    const ok = await requireWorkspaceRole(request, schedule.workspaceId, roles);
    if (!ok) return reply.forbidden();
  };
}

export function rolePreHandlerByMonitor(roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">) {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const monitorId = (request.params as any).monitorId;
    if (!monitorId) return reply.badRequest("monitorId is required");
    const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor) return reply.notFound();
    const ok = await requireWorkspaceRole(request, monitor.workspaceId, roles);
    if (!ok) return reply.forbidden();
  };
}

export function rolePreHandlerByNotificationChannel(roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">) {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const channelId = (request.params as any).channelId;
    if (!channelId) return reply.badRequest("channelId is required");
    const channel = await prisma.notificationChannel.findUnique({ where: { id: channelId } });
    if (!channel) return reply.notFound();
    const ok = await requireWorkspaceRole(request, channel.workspaceId, roles);
    if (!ok) return reply.forbidden();
  };
}

export function rolePreHandlerByMembership(roles: Array<"OWNER" | "ADMIN" | "EDITOR" | "VIEWER">) {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const membershipId = (request.params as any).membershipId;
    if (!membershipId) return reply.badRequest("membershipId is required");
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership) return reply.notFound();
    const ok = await requireWorkspaceRole(request, membership.workspaceId, roles);
    if (!ok) return reply.forbidden();
  };
}

export function superAdminPreHandler() {
  return async function (this: FastifyInstance, request: FastifyRequest, reply: any) {
    const ok = await requireSuperAdmin(request);
    if (!ok) return reply.forbidden();
  };
}
