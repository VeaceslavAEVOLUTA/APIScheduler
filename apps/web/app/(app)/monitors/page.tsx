"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { resolveActiveWorkspaceId } from "../../lib/workspace";
import ConfirmModal from "../../components/confirm-modal";

type Monitor = { id: string; name: string; type: string; url?: string; host?: string };

export default function MonitorsPage() {
  const [items, setItems] = useState<Monitor[]>([]);
  const [step, setStep] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Monitor | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("HTTP");
  const [target, setTarget] = useState("");
  const [intervalMs, setIntervalMs] = useState(60000);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [failureThreshold, setFailureThreshold] = useState(1);
  const [alertOnRecovery, setAlertOnRecovery] = useState(true);
  const [showOnStatus, setShowOnStatus] = useState(true);
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");
  const [activeTimezone, setActiveTimezone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editMonitor, setEditMonitor] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = async () => {
    const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
    const workspaceId = resolveActiveWorkspaceId(workspaces);
    if (!workspaceId) return;
    const res = await apiFetch<Monitor[]>(`/monitors/${workspaceId}`);
    setItems(res);
  };

  useEffect(() => {
    load().catch(() => undefined);
    const onActive = () => load().catch(() => undefined);
    window.addEventListener("workspace:active", onActive as EventListener);
    return () => window.removeEventListener("workspace:active", onActive as EventListener);
  }, []);

  useEffect(() => {
    if (!editMonitor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditMonitor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMonitor]);

  const create = async () => {
    setError(null);
    try {
      if (name.trim().length < 2) {
        setError("Nome: minimo 2 caratteri.");
        return;
      }
      if (!target.trim()) {
        setError("Target richiesto.");
        return;
      }
      let normalizedTarget = target.trim();
      if (type === "HTTP") {
        if (!/^https?:\/\//i.test(normalizedTarget)) {
          normalizedTarget = `https://${normalizedTarget}`;
        }
        try {
          new URL(normalizedTarget);
        } catch {
          setError("URL non valido. Usa https://...");
          return;
        }
      }
      const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
      const workspaceId = resolveActiveWorkspaceId(workspaces);
      if (!workspaceId) return;
      const payload: any = {
        name,
        type,
        intervalMs,
        timeoutMs,
        expectedStatus: type === "HTTP" ? expectedStatus : undefined,
        failureThreshold,
        alertOnRecovery,
        showOnStatus,
        activeFrom: activeFrom || undefined,
        activeTo: activeTo || undefined,
        activeTimezone: activeTimezone || undefined,
        workspaceId,
      };
      if (type === "HTTP") payload.url = normalizedTarget;
      else payload.host = normalizedTarget;
      await apiFetch("/monitors", { method: "POST", body: JSON.stringify(payload) });
      setName("");
      setTarget("");
      setStep(1);
      load();
    } catch (err: any) {
      setError(err.message || "Errore durante la creazione.");
    }
  };

  const run = async (id: string) => {
    await apiFetch(`/monitors/run/${id}`, { method: "POST" });
    alert("Checked");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await apiFetch(`/monitors/${pendingDelete.id}`, { method: "DELETE" });
    setPendingDelete(null);
    load();
  };

  const openEdit = (m: any) => {
    setEditMonitor(m);
    setEditForm({
      name: m.name,
      type: m.type,
      target: m.url || m.host || "",
      intervalMs: m.intervalMs || 60000,
      timeoutMs: m.timeoutMs || 10000,
      expectedStatus: m.expectedStatus || 200,
      failureThreshold: m.failureThreshold || 1,
      alertOnRecovery: m.alertOnRecovery ?? true,
      enabled: m.enabled ?? true,
      showOnStatus: m.showOnStatus ?? true,
      activeFrom: m.activeFrom || "",
      activeTo: m.activeTo || "",
      activeTimezone: m.activeTimezone || "",
    });
  };

  const saveEdit = async () => {
    if (!editMonitor) return;
    const payload: any = {
      name: editForm.name,
      type: editForm.type,
      intervalMs: Number(editForm.intervalMs),
      timeoutMs: Number(editForm.timeoutMs),
      expectedStatus: editForm.type === "HTTP" ? Number(editForm.expectedStatus) : undefined,
      failureThreshold: Number(editForm.failureThreshold),
      alertOnRecovery: !!editForm.alertOnRecovery,
      enabled: !!editForm.enabled,
      showOnStatus: !!editForm.showOnStatus,
      activeFrom: editForm.activeFrom || undefined,
      activeTo: editForm.activeTo || undefined,
      activeTimezone: editForm.activeTimezone || undefined,
    };
    if (editForm.type === "HTTP") payload.url = editForm.target;
    else payload.host = editForm.target;
    await apiFetch(`/monitors/${editMonitor.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    setEditMonitor(null);
    load();
  };

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge grid gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate">Procedura monitor</div>
            <div className="text-lg font-semibold">Passo {step} / 3</div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl border border-ink/10 px-4 py-2 text-sm" onClick={() => setStep(Math.max(1, step - 1))}>Indietro</button>
            {step < 3 ? (
              <button className="rounded-xl bg-ink px-4 py-2 text-sm text-fog" onClick={() => setStep(step + 1)}>Avanti</button>
            ) : (
              <button className="rounded-xl bg-ink px-4 py-2 text-sm text-fog" onClick={create}>Crea</button>
            )}
          </div>
        </div>

        {step === 1 && (
          <div key="step-1" className="grid gap-3 md:grid-cols-[1fr_160px_1fr] page-transition">
            <div className="field">
              <div className="label">Nome <span className="help" data-tip="Nome del monitor">?</span></div>
              <input className="input" placeholder="Monitor esempio" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <div className="label">Tipo <span className="help" data-tip="HTTP, PING, TCP o TLS">?</span></div>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="HTTP">HTTP</option>
                <option value="PING">PING</option>
                <option value="TCP">TCP</option>
                <option value="TLS">TLS</option>
              </select>
            </div>
            <div className="field">
              <div className="label">Destinazione <span className="help" data-tip="URL o host da controllare">?</span></div>
              <input className="input" placeholder="https://api.example.com" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="grid gap-3 md:grid-cols-3 page-transition">
            <div className="field">
              <div className="label">Intervallo (ms) <span className="help" data-tip="Frequenza controllo">?</span></div>
              <input className="input" placeholder="60000" type="number" value={intervalMs} onChange={(e) => setIntervalMs(Number(e.target.value))} />
            </div>
            <div className="field">
              <div className="label">Timeout (ms) <span className="help" data-tip="Tempo massimo attesa">?</span></div>
              <input className="input" placeholder="10000" type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
            </div>
            <div className="field">
              <div className="label">Status atteso <span className="help" data-tip="Status HTTP atteso">?</span></div>
              <input className="input" placeholder="200" type="number" value={expectedStatus} onChange={(e) => setExpectedStatus(Number(e.target.value))} />
            </div>
            <div className="field">
              <div className="label">Attivo da <span className="help" data-tip="Ora di inizio (HH:mm)">?</span></div>
              <input className="input" type="time" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} />
            </div>
            <div className="field">
              <div className="label">Attivo fino a <span className="help" data-tip="Ora di fine (HH:mm)">?</span></div>
              <input className="input" type="time" value={activeTo} onChange={(e) => setActiveTo(e.target.value)} />
            </div>
            <div className="field">
              <div className="label">Timezone <span className="help" data-tip="Es. Europe/Rome">?</span></div>
              <input className="input" placeholder="Europe/Rome" value={activeTimezone} onChange={(e) => setActiveTimezone(e.target.value)} />
            </div>
            <div className="hint md:col-span-3">Se lasci vuoto “Attivo da” o “Attivo fino a”, il monitor è sempre attivo.</div>
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="grid gap-3 md:grid-cols-2 page-transition">
            <div className="field">
              <div className="label">Soglia fallimenti <span className="help" data-tip="Alert dopo N errori">?</span></div>
              <input className="input" placeholder="1" type="number" value={failureThreshold} onChange={(e) => setFailureThreshold(Number(e.target.value))} />
            </div>
            <div className="field">
              <div className="label">Avvisa al recupero <span className="help" data-tip="Invia notifica al ritorno in OK">?</span></div>
              <div className="flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-3 text-sm">
                <input type="checkbox" checked={alertOnRecovery} onChange={(e) => setAlertOnRecovery(e.target.checked)} />
                Abilita
              </div>
            </div>
            <div className="field md:col-span-2">
              <div className="label">Mostra in status <span className="help" data-tip="Visibile nella pagina pubblica">?</span></div>
              <div className="flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-3 text-sm">
                <input type="checkbox" checked={showOnStatus} onChange={(e) => setShowOnStatus(e.target.checked)} />
                Abilita
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-rose">{error}</div>}

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Monitor</div>
        <div className="mt-4 space-y-3 text-sm">
          {items.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-slate">{row.type} · {row.url || row.host}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-xl border border-ink/10 px-3 py-1 text-xs" onClick={() => run(row.id)}>
                  Esegui
                </button>
                <button className="rounded-xl border border-ink/10 px-3 py-1 text-xs" onClick={() => openEdit(row)}>
                  Opzioni
                </button>
                <button className="rounded-xl border border-ink/10 px-3 py-1 text-xs" onClick={() => setPendingDelete(row)}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="Conferma eliminazione"
        message={`Eliminare il monitor "${pendingDelete?.name}"?`}
        confirmText="Elimina"
        cancelText="Annulla"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      {editMonitor && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setEditMonitor(null)}>
          <div className="modal-panel glass w-full max-w-2xl rounded-3xl p-6 shadow-edge" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs uppercase tracking-[0.2em] text-slate">Opzioni monitor</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="field">
                <div className="label">Nome</div>
                <input className="input" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Tipo</div>
                <select className="select" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                  <option value="HTTP">HTTP</option>
                  <option value="PING">PING</option>
                  <option value="TCP">TCP</option>
                  <option value="TLS">TLS</option>
                </select>
              </div>
              <div className="field md:col-span-2">
                <div className="label">Destinazione</div>
                <input className="input" value={editForm.target || ""} onChange={(e) => setEditForm({ ...editForm, target: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Intervallo (ms)</div>
                <input className="input" type="number" value={editForm.intervalMs} onChange={(e) => setEditForm({ ...editForm, intervalMs: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Timeout (ms)</div>
                <input className="input" type="number" value={editForm.timeoutMs} onChange={(e) => setEditForm({ ...editForm, timeoutMs: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Status atteso</div>
                <input className="input" type="number" value={editForm.expectedStatus} onChange={(e) => setEditForm({ ...editForm, expectedStatus: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Attivo da</div>
                <input className="input" type="time" value={editForm.activeFrom || ""} onChange={(e) => setEditForm({ ...editForm, activeFrom: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Attivo fino a</div>
                <input className="input" type="time" value={editForm.activeTo || ""} onChange={(e) => setEditForm({ ...editForm, activeTo: e.target.value })} />
              </div>
              <div className="field md:col-span-2">
                <div className="label">Timezone</div>
                <input className="input" placeholder="Europe/Rome" value={editForm.activeTimezone || ""} onChange={(e) => setEditForm({ ...editForm, activeTimezone: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Soglia fallimenti</div>
                <input className="input" type="number" value={editForm.failureThreshold} onChange={(e) => setEditForm({ ...editForm, failureThreshold: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Abilitato</div>
                <select className="select" value={editForm.enabled ? "true" : "false"} onChange={(e) => setEditForm({ ...editForm, enabled: e.target.value === "true" })}>
                  <option value="true">Si</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="field">
                <div className="label">Mostra in status</div>
                <select className="select" value={editForm.showOnStatus ? "true" : "false"} onChange={(e) => setEditForm({ ...editForm, showOnStatus: e.target.value === "true" })}>
                  <option value="true">Si</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="field md:col-span-2">
                <label className="flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-3 text-sm">
                  <input type="checkbox" checked={!!editForm.alertOnRecovery} onChange={(e) => setEditForm({ ...editForm, alertOnRecovery: e.target.checked })} />
                  Avvisa al recupero
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-xl border border-ink/10 px-4 py-2 text-sm" onClick={() => setEditMonitor(null)}>
                Chiudi
              </button>
              <button className="rounded-xl bg-ink px-4 py-2 text-sm text-fog" onClick={saveEdit}>
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
