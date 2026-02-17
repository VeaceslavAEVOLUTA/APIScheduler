"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { resolveActiveWorkspaceId } from "../../lib/workspace";
import ConfirmModal from "../../components/confirm-modal";

type RequestItem = { id: string; name: string; method: string; url: string; workspaceId: string };

function safeJson(input: string, fallback: any, label: string) {
  if (!input || input.trim() === "") return fallback;
  try {
    return JSON.parse(input);
  } catch (err: any) {
    throw new Error(`${label}: JSON non valido`);
  }
}

export default function RequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [name, setName] = useState("");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState("{}");
  const [body, setBody] = useState("");
  const [authType, setAuthType] = useState("none");
  const [authValue, setAuthValue] = useState("");
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const load = async () => {
    const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
    const workspaceId = resolveActiveWorkspaceId(workspaces);
    if (!workspaceId) {
      setItems([]);
      setError("Nessun workspace disponibile. Crea o seleziona un workspace prima di aggiungere richieste API.");
      return;
    }
    const res = await apiFetch<RequestItem[]>(`/requests/${workspaceId}`);
    setItems(res);
  };

  useEffect(() => {
    load().catch(() => undefined);
    const onActive = () => load().catch(() => undefined);
    window.addEventListener("workspace:active", onActive as EventListener);
    return () => window.removeEventListener("workspace:active", onActive as EventListener);
  }, []);

  useEffect(() => {
    if (method === "GET" || method === "HEAD") {
      setBody("");
    }
  }, [method]);

  const create = async () => {
    setError(null);
    try {
      if (name.trim().length < 2) {
        setError("Nome: minimo 2 caratteri.");
        return;
      }
      try {
        new URL(url);
      } catch {
        setError("URL non valido. Usa https://...");
        return;
      }
      const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
      const workspaceId = resolveActiveWorkspaceId(workspaces);
      if (!workspaceId) {
        setError("Nessun workspace disponibile. Crea o seleziona un workspace.");
        return;
      }

      const auth =
        authType === "bearer"
          ? { type: "bearer", token: authValue }
          : authType === "basic"
          ? { type: "basic", username: authValue.split(":")[0], password: authValue.split(":")[1] || "" }
          : authType === "header"
          ? { type: "header", name: "X-Auth", value: authValue }
          : undefined;

      let parsedHeaders: any;
      let parsedBody: any;
      try {
        parsedHeaders = safeJson(headers, {}, "Header");
        parsedBody = method === "GET" || method === "HEAD" ? undefined : safeJson(body, {}, "Corpo");
      } catch (e: any) {
        setError(e.message);
        return;
      }

      await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          name,
          method,
          url,
          headers: parsedHeaders,
          body: parsedBody,
          auth,
          workspaceId,
        }),
      });
      setName("");
      setUrl("");
      load();
    } catch (err: any) {
      setError(err.message || "Errore durante la creazione.");
    }
  };

  const run = async (id: string) => {
    const res = await apiFetch(`/requests/run/${id}`, { method: "POST" });
    setLastResponse(res);
  };

  const remove = async () => {
    if (!confirmId) return;
    await apiFetch(`/requests/${confirmId}`, { method: "DELETE" });
    setConfirmId(null);
    setConfirmName("");
    load();
  };

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_1fr]">
          <div className="field">
            <div className="label">Nome <span className="help" data-tip="Nome leggibile della richiesta">?</span></div>
            <input className="input" placeholder="Esempio" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Metodo <span className="help" data-tip="Metodo HTTP">?</span></div>
            <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
              {['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <div className="label">URL <span className="help" data-tip="Endpoint completo con https://">?</span></div>
            <input className="input" placeholder="https://api.example.com/v1" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="field">
            <div className="label">Header JSON <span className="help" data-tip="Header HTTP in JSON">?</span></div>
            <textarea className="textarea" placeholder='{"Authorization":"Bearer ..."}' value={headers} onChange={(e) => setHeaders(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Corpo JSON <span className="help" data-tip="Corpo JSON (vuoto per GET/HEAD)">?</span></div>
            <textarea className="textarea" placeholder='{"foo":"bar"}' value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="grid gap-3">
            <div className="field">
              <div className="label">Tipo autenticazione <span className="help" data-tip="Tipo autenticazione">?</span></div>
              <select className="select" value={authType} onChange={(e) => setAuthType(e.target.value)}>
                <option value="none">Nessuna</option>
                <option value="bearer">Bearer</option>
                <option value="basic">Basic (user:pass)</option>
                <option value="header">Header personalizzato</option>
              </select>
            </div>
            <div className="field">
              <div className="label">Valore autenticazione <span className="help" data-tip="Token / user:pass / valore">?</span></div>
              <input className="input" placeholder="Token / user:pass / valore" value={authValue} onChange={(e) => setAuthValue(e.target.value)} />
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-rose">{error}</div>}
        <button className="rounded-xl bg-ink px-4 py-3 text-fog" onClick={create}>Crea</button>
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Richieste API</div>
        <div className="mt-4 space-y-3 text-sm">
          {items.slice((page - 1) * pageSize, page * pageSize).map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-slate">{row.method} · {row.url}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-xl border border-ink/10 px-3 py-1 text-xs" onClick={() => run(row.id)}>
                  Esegui
                </button>
                <button
                  className="rounded-xl border border-ink/10 px-3 py-1 text-xs text-rose"
                  onClick={() => { setConfirmId(row.id); setConfirmName(row.name); }}
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <button className="rounded-lg border border-ink/10 px-3 py-1" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prec
          </button>
          <span className="text-slate">Pagina {page}</span>
          <button className="rounded-lg border border-ink/10 px-3 py-1" disabled={page * pageSize >= items.length} onClick={() => setPage((p) => p + 1)}>
            Succ
          </button>
        </div>
      </div>

      {lastResponse && (
        <div className="glass rounded-3xl p-6 shadow-edge">
          <div className="text-xs uppercase tracking-[0.2em] text-slate">Ultima risposta</div>
          <pre className="mt-4 overflow-auto rounded-2xl bg-white/70 p-4 text-xs">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </div>
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Elimina richiesta API"
        message={`Vuoi eliminare "${confirmName}"?`}
        confirmText="Elimina"
        onCancel={() => { setConfirmId(null); setConfirmName(""); }}
        onConfirm={remove}
      />
    </section>
  );
}
