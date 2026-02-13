"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { resolveActiveWorkspaceId } from "../../lib/workspace";

type Channel = { id: string; name: string; type: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Channel[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("EMAIL");
  const [config, setConfig] = useState("{}" as string);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
    const workspaceId = resolveActiveWorkspaceId(workspaces);
    if (!workspaceId) return;
    const res = await apiFetch<Channel[]>(`/notifications/${workspaceId}`);
    setItems(res);
  };

  useEffect(() => {
    load().catch(() => undefined);
    const onActive = () => load().catch(() => undefined);
    window.addEventListener("workspace:active", onActive as EventListener);
    return () => window.removeEventListener("workspace:active", onActive as EventListener);
  }, []);

  const create = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("Nome: minimo 2 caratteri.");
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(config);
    } catch {
      setError("Config JSON non valido.");
      return;
    }
    const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
    const workspaceId = resolveActiveWorkspaceId(workspaces);
    if (!workspaceId) return;
    await apiFetch("/notifications", {
      method: "POST",
      body: JSON.stringify({ name, type, config: parsed, workspaceId }),
    });
    setName("");
    setConfig("{}");
    load();
  };

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge grid gap-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="field">
            <div className="label">Nome <span className="help" data-tip="Nome canale">?</span></div>
            <input className="input" placeholder="temp@exampe.it" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Tipo <span className="help" data-tip="Provider notifiche">?</span></div>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              {['EMAIL','SLACK','TELEGRAM','DISCORD','TEAMS','WEBHOOK'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <div className="label">Config JSON <span className="help" data-tip="Impostazioni provider in JSON">?</span></div>
            <textarea
              className="textarea h-12"
              rows={1}
              style={{ minHeight: 0, height: 48 }}
              placeholder='{"to":"alerts@company.com"}'
              value={config}
              onChange={(e) => setConfig(e.target.value)}
            />
          </div>
        </div>
        <div className="hint">
          Esempio EMAIL: {`{"to":"alerts@company.com"}`} · Slack: {`{"webhookUrl":"https://hooks.slack.com/..."}`} · Discord/Teams simile
        </div>
        {error && <div className="text-sm text-rose">{error}</div>}
        <button className="rounded-xl bg-ink px-4 py-3 text-fog" onClick={create}>Crea</button>
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Canali di notifica</div>
        <div className="mt-4 space-y-3 text-sm">
          {items.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-slate">{row.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
