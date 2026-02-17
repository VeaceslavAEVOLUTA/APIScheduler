export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function flattenValidationMessage(input: unknown): string | null {
  if (!input) return null;

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;

    try {
      return flattenValidationMessage(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }

  if (Array.isArray(input) && input.length > 0) {
    const first = input[0] as any;
    if (typeof first?.message === "string") {
      const path = Array.isArray(first?.path) && first.path.length ? ` (${first.path.join(".")})` : "";
      return `${first.message}${path}`;
    }
    return String(first);
  }

  if (typeof input === "object") {
    const maybe = input as Record<string, unknown>;
    if (typeof maybe.message === "string") return maybe.message;
  }

  return null;
}

async function parseErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const payload = await res.json();
      const parsed =
        flattenValidationMessage((payload as any)?.message) ||
        flattenValidationMessage(payload) ||
        (payload as any)?.error;
      if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
    } catch {
      // fallback to generic message
    }
  } else {
    const text = (await res.text()).trim();
    if (text) {
      const parsed = flattenValidationMessage(text);
      if (parsed) return parsed;
    }
  }

  return `Richiesta fallita (${res.status})`;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Impossibile contattare il server. Verifica connessione e configurazione API.");
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("workspaceId");
      window.location.href = "/login";
    }
    const message = await parseErrorMessage(res);
    throw new Error(message);
  }
  return (await res.json()) as T;
}
