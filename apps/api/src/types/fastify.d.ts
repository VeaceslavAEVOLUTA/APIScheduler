import "@fastify/jwt";
import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; workspaceId?: string };
    user: { sub: string; workspaceId?: string };
  }
}
