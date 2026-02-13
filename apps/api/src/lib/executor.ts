export type ExecuteResult = {
  statusCode?: number;
  responseMs?: number;
  response?: unknown;
  error?: string;
};

export async function executeHttpRequest(params: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  followRedirects?: boolean;
  auth?: { type: "bearer"; token: string } | { type: "basic"; username: string; password: string } | { type: "header"; name: string; value: string };
}) {
  const start = Date.now();
  const url = new URL(params.url);
  if (params.query) {
    for (const [k, v] of Object.entries(params.query)) {
      url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs || 15000);

  try {
    const headers = params.headers ? { ...params.headers } : params.body ? {} : undefined;
    if (params.auth && headers) {
      if (params.auth.type === "bearer") headers["Authorization"] = `Bearer ${params.auth.token}`;
      if (params.auth.type === "basic") {
        const encoded = Buffer.from(`${params.auth.username}:${params.auth.password}`).toString("base64");
        headers["Authorization"] = `Basic ${encoded}`;
      }
      if (params.auth.type === "header") headers[params.auth.name] = params.auth.value;
    }

    if (params.body && headers && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url.toString(), {
      method: params.method,
      headers,
      body: params.body ? JSON.stringify(params.body) : undefined,
      redirect: params.followRedirects === false ? "manual" : "follow",
      signal: controller.signal,
    });

    const text = await res.text();
    let response: unknown = text;
    try {
      response = JSON.parse(text);
    } catch {
      // keep text
    }

    return {
      statusCode: res.status,
      responseMs: Date.now() - start,
      response,
    } satisfies ExecuteResult;
  } catch (err: any) {
    return {
      error: err?.message || "Request failed",
      responseMs: Date.now() - start,
    } satisfies ExecuteResult;
  } finally {
    clearTimeout(timeout);
  }
}
