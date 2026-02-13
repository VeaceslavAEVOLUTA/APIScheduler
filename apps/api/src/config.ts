import "dotenv/config";

export const config = {
  logLevel: process.env.LOG_LEVEL || "info",
  disableRequestLogging: process.env.DISABLE_REQUEST_LOGGING === "true",
  apiPort: Number(process.env.API_PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  queueWorker: process.env.QUEUE_WORKER === "true",
  webUrl: process.env.APP_URL || process.env.WEB_URL || "http://localhost:3000",
  defaultTimezone: process.env.DEFAULT_TIMEZONE || "Europe/Rome",
  corsOrigin: process.env.CORS_ORIGIN || "",
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === "true",
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
  trustProxy: process.env.TRUST_PROXY === "true",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "APIScheduler <no-reply@localhost>",
  },
};
