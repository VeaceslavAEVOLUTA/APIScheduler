import net from "node:net";
import tls from "node:tls";
import { ExecuteResult, executeHttpRequest } from "./executor.js";

export async function executeMonitor(params: {
  type: "HTTP" | "PING" | "TCP" | "TLS";
  url?: string;
  host?: string;
  port?: number;
  timeoutMs?: number;
  expectedStatus?: number;
  headers?: Record<string, string>;
}) {
  switch (params.type) {
    case "HTTP": {
      const result = await executeHttpRequest({
        method: "GET",
        url: params.url!,
        timeoutMs: params.timeoutMs,
        headers: params.headers,
      });
      if (params.expectedStatus && result.statusCode !== params.expectedStatus) {
        return { ...result, error: `Expected ${params.expectedStatus}, got ${result.statusCode}` } satisfies ExecuteResult;
      }
      return result;
    }
    case "TCP": {
      const start = Date.now();
      return new Promise<ExecuteResult>((resolve) => {
        const socket = net.createConnection(
          { host: params.host!, port: params.port!, timeout: params.timeoutMs || 10000 },
          () => {
            socket.end();
            resolve({ responseMs: Date.now() - start, statusCode: 200 });
          }
        );
        socket.on("error", (err) => resolve({ error: err.message, responseMs: Date.now() - start }));
        socket.on("timeout", () => {
          socket.destroy();
          resolve({ error: "TCP timeout", responseMs: Date.now() - start });
        });
      });
    }
    case "TLS": {
      const start = Date.now();
      return new Promise<ExecuteResult>((resolve) => {
        const socket = tls.connect(
          { host: params.host!, port: params.port || 443, servername: params.host!, timeout: params.timeoutMs || 10000 },
          () => {
            const cert = socket.getPeerCertificate();
            socket.end();
            resolve({
              responseMs: Date.now() - start,
              statusCode: 200,
              response: {
                valid_to: cert.valid_to,
                subject: cert.subject,
                issuer: cert.issuer,
              },
            });
          }
        );
        socket.on("error", (err) => resolve({ error: err.message, responseMs: Date.now() - start }));
        socket.on("timeout", () => {
          socket.destroy();
          resolve({ error: "TLS timeout", responseMs: Date.now() - start });
        });
      });
    }
    case "PING": {
      // Fallback: TCP connect to 443 or 80 to simulate reachability
      const port = params.port || 443;
      const start = Date.now();
      return new Promise<ExecuteResult>((resolve) => {
        const socket = net.createConnection({ host: params.host!, port, timeout: params.timeoutMs || 10000 }, () => {
          socket.end();
          resolve({ responseMs: Date.now() - start, statusCode: 200 });
        });
        socket.on("error", (err) => resolve({ error: err.message, responseMs: Date.now() - start }));
        socket.on("timeout", () => {
          socket.destroy();
          resolve({ error: "PING timeout", responseMs: Date.now() - start });
        });
      });
    }
  }
}
