"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { resolveActiveWorkspaceId } from "../../lib/workspace";
import ConfirmModal from "../../components/confirm-modal";

type Schedule = { id: string; name: string; type: string; cron?: string; intervalMs?: number };
type ApiRequestItem = { id: string; name: string; method: string; url: string };

export default function SchedulesPage() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [requests, setRequests] = useState<ApiRequestItem[]>([]);
  const [step, setStep] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Schedule | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("CRON");
  const [cron, setCron] = useState("*/5 * * * *");
  const [intervalMs, setIntervalMs] = useState(60000);
  const [apiRequestId, setApiRequestId] = useState("");
  const [maxRetries, setMaxRetries] = useState(0);
  const [backoffMs, setBackoffMs] = useState(0);
  const [failureThreshold, setFailureThreshold] = useState(1);
  const [circuitBreakerThreshold, setCircuitBreakerThreshold] = useState(0);
  const [circuitBreakerDurationMs, setCircuitBreakerDurationMs] = useState(0);
  const [alertOnRecovery, setAlertOnRecovery] = useState(true);
  const [showOnStatus, setShowOnStatus] = useState(true);
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");
  const [activeTimezone, setActiveTimezone] = useState("");
  const [conditions, setConditions] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [editSchedule, setEditSchedule] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = async () => {
    const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
    const workspaceId = resolveActiveWorkspaceId(workspaces);
    if (!workspaceId) return;
    const [schedules, reqs] = await Promise.all([
      apiFetch<Schedule[]>(`/schedules/${workspaceId}`),
      apiFetch<ApiRequestItem[]>(`/requests/${workspaceId}`),
    ]);
    setItems(schedules);
    setRequests(reqs);
    if (!apiRequestId && reqs[0]?.id) setApiRequestId(reqs[0].id);
  };

  useEffect(() => {
    load().catch(() => undefined);
    const onActive = () => load().catch(() => undefined);
    window.addEventListener("workspace:active", onActive as EventListener);
    return () => window.removeEventListener("workspace:active", onActive as EventListener);
  }, []);

  const create = async () => {
    setError(null);
    try {
      if (name.trim().length < 2) {
        setError("Nome: minimo 2 caratteri.");
        return;
      }
      const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
      const workspaceId = resolveActiveWorkspaceId(workspaces);
      if (!workspaceId || !apiRequestId) {
        setError("Seleziona una API request.");
        return;
      }
      const parsedConditions = conditions ? JSON.parse(conditions) : undefined;
      await apiFetch("/schedules", {
        method: "POST",
        body: JSON.stringify({
          name,
          type,
          cron: type === "CRON" ? cron : undefined,
          intervalMs: type === "INTERVAL" ? intervalMs : undefined,
          workspaceId,
          apiRequestId,
          activeFrom: activeFrom || undefined,
          activeTo: activeTo || undefined,
          activeTimezone: activeTimezone || undefined,
          maxRetries,
          backoffMs,
          failureThreshold,
          circuitBreakerThreshold,
          circuitBreakerDurationMs,
          alertOnRecovery,
          showOnStatus,
          conditions: parsedConditions,
        }),
      });
      setName("");
      setStep(1);
      load();
    } catch (err: any) {
      setError(err.message || "Errore durante la creazione.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await apiFetch(`/schedules/${pendingDelete.id}`, { method: "DELETE" });
    setPendingDelete(null);
    load();
  };

  const openEdit = (s: any) => {
    setEditSchedule(s);
    setEditForm({
      name: s.name,
      type: s.type,
      cron: s.cron || "*/5 * * * *",
      intervalMs: s.intervalMs || 60000,
      apiRequestId: s.apiRequestId || "",
      activeFrom: s.activeFrom || "",
      activeTo: s.activeTo || "",
      activeTimezone: s.activeTimezone || "",
      maxRetries: s.maxRetries || 0,
      backoffMs: s.backoffMs || 0,
      failureThreshold: s.failureThreshold || 1,
      circuitBreakerThreshold: s.circuitBreakerThreshold || 0,
      circuitBreakerDurationMs: s.circuitBreakerDurationMs || 0,
      alertOnRecovery: s.alertOnRecovery ?? true,
      enabled: s.enabled ?? true,
      showOnStatus: s.showOnStatus ?? true,
      conditions: s.conditions ? JSON.stringify(s.conditions) : "{}",
    });
  };

  const saveEdit = async () => {
    if (!editSchedule) return;
    const payload: any = {
      name: editForm.name,
      type: editForm.type,
      cron: editForm.type === "CRON" ? editForm.cron : undefined,
      intervalMs: editForm.type === "INTERVAL" ? Number(editForm.intervalMs) : undefined,
      apiRequestId: editForm.apiRequestId || undefined,
      activeFrom: editForm.activeFrom || undefined,
      activeTo: editForm.activeTo || undefined,
      activeTimezone: editForm.activeTimezone || undefined,
      maxRetries: Number(editForm.maxRetries),
      backoffMs: Number(editForm.backoffMs),
      failureThreshold: Number(editForm.failureThreshold),
      circuitBreakerThreshold: Number(editForm.circuitBreakerThreshold),
      circuitBreakerDurationMs: Number(editForm.circuitBreakerDurationMs),
      alertOnRecovery: !!editForm.alertOnRecovery,
      enabled: !!editForm.enabled,
      showOnStatus: !!editForm.showOnStatus,
      conditions: editForm.conditions ? JSON.parse(editForm.conditions) : undefined,
    };
    await apiFetch(`/schedules/${editSchedule.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    setEditSchedule(null);
    load();
  };

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge grid gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate">Wizard pianificazione</div>
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
          <div key="step-1" className="grid gap-3 page-transition">
            <div className="grid gap-3 md:grid-cols-[1fr_160px_1fr]">
              <div className="field">
                <div className="label">Nome <span className="help" data-tip="Nome della pianificazione">?</span></div>
                <input className="input" placeholder="Esempio" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">Tipo <span className="help" data-tip="CRON, INTERVAL o ONE_SHOT">?</span></div>
                <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="CRON">CRON</option>
                  <option value="INTERVAL">INTERVAL</option>
                  <option value="ONE_SHOT">ONE_SHOT</option>
                </select>
              </div>
              <div className="field">
                <div className="label">Timing <span className="help" data-tip="Espressione CRON o intervallo ms">?</span></div>
                {type === "CRON" ? (
                  <input className="input" placeholder="*/5 * * * *" value={cron} onChange={(e) => setCron(e.target.value)} />
                ) : (
                  <input className="input" placeholder="60000" type="number" value={intervalMs} onChange={(e) => setIntervalMs(Number(e.target.value))} />
                )}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
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
              <div className="hint md:col-span-3">Se lasci vuoto “Attivo da” o “Attivo fino a”, la pianificazione è sempre attiva.</div>
            </div>
            <div className="field">
              <div className="label">Richiesta API <span className="help" data-tip="Request da eseguire">?</span></div>
              <select className="select" value={apiRequestId} onChange={(e) => setApiRequestId(e.target.value)}>
                <option value="">Seleziona richiesta API</option>
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} · {r.method} {r.url}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="grid gap-3 md:grid-cols-3 page-transition">
            <div className="field">
              <div className="label">Max tentativi <span className="help" data-tip="Tentativi dopo fallimento">?</span></div>
              <input className="input" placeholder="0" type="number" value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} />
            </div>
            <div className="field">
              <div className="label">Backoff (ms) <span className="help" data-tip="Pausa tra retry">?</span></div>
              <input className="input" placeholder="0" type="number" value={backoffMs} onChange={(e) => setBackoffMs(Number(e.target.value))} />
            </div>
            <div className="field">
              <div className="label">Soglia fallimenti <span className="help" data-tip="Alert dopo N errori consecutivi">?</span></div>
              <input className="input" placeholder="1" type="number" value={failureThreshold} onChange={(e) => setFailureThreshold(Number(e.target.value))} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="grid gap-3 page-transition">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="field">
                <div className="label">Soglia circuito <span className="help" data-tip="Apri circuito dopo N errori">?</span></div>
                <input className="input" placeholder="0" type="number" value={circuitBreakerThreshold} onChange={(e) => setCircuitBreakerThreshold(Number(e.target.value))} />
              </div>
              <div className="field">
                <div className="label">Durata circuito (ms) <span className="help" data-tip="Durata circuito aperto">?</span></div>
                <input className="input" placeholder="0" type="number" value={circuitBreakerDurationMs} onChange={(e) => setCircuitBreakerDurationMs(Number(e.target.value))} />
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-3 text-sm">
              <input type="checkbox" checked={alertOnRecovery} onChange={(e) => setAlertOnRecovery(e.target.checked)} />
              Avvisa al recupero
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-3 text-sm">
              <input type="checkbox" checked={showOnStatus} onChange={(e) => setShowOnStatus(e.target.checked)} />
              Mostra in status
            </label>
            <div className="field">
              <div className="label">Condizioni JSON <span className="help" data-tip="Condizioni opzionali">?</span></div>
              <textarea className="textarea" placeholder='{"requiresLastStatus":"SUCCESS"}' value={conditions} onChange={(e) => setConditions(e.target.value)} />
              <div className="hint">Esempio: {"{\"minMinutesSinceLastRun\":10}"}</div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-rose">{error}</div>}

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Pianificazioni</div>
        <div className="mt-4 space-y-3 text-sm">
          {items.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-slate">{row.type} · {row.cron || row.intervalMs}</div>
              </div>
              <div className="flex items-center gap-2">
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
        message={`Eliminare lo schedule "${pendingDelete?.name}"?`}
        confirmText="Elimina"
        cancelText="Annulla"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      {editSchedule && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="modal-panel glass w-full max-w-3xl rounded-3xl p-6 shadow-edge">
            <div className="text-xs uppercase tracking-[0.2em] text-slate">Opzioni pianificazione</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="field md:col-span-2">
                <div className="label">Nome</div>
                <input className="input" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Tipo</div>
                <select className="select" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                  <option value="CRON">CRON</option>
                  <option value="INTERVAL">INTERVAL</option>
                  <option value="ONE_SHOT">ONE_SHOT</option>
                </select>
              </div>
              <div className="field md:col-span-3">
                <div className="label">Timing</div>
                {editForm.type === "CRON" ? (
                  <input className="input" value={editForm.cron || ""} onChange={(e) => setEditForm({ ...editForm, cron: e.target.value })} />
                ) : (
                  <input className="input" type="number" value={editForm.intervalMs || 0} onChange={(e) => setEditForm({ ...editForm, intervalMs: e.target.value })} />
                )}
              </div>
              <div className="field">
                <div className="label">Attivo da</div>
                <input className="input" type="time" value={editForm.activeFrom || ""} onChange={(e) => setEditForm({ ...editForm, activeFrom: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Attivo fino a</div>
                <input className="input" type="time" value={editForm.activeTo || ""} onChange={(e) => setEditForm({ ...editForm, activeTo: e.target.value })} />
              </div>
              <div className="field md:col-span-3">
                <div className="label">Timezone</div>
                <input className="input" placeholder="Europe/Rome" value={editForm.activeTimezone || ""} onChange={(e) => setEditForm({ ...editForm, activeTimezone: e.target.value })} />
              </div>
              <div className="field md:col-span-3">
                <div className="label">Richiesta API</div>
                <select className="select" value={editForm.apiRequestId || ""} onChange={(e) => setEditForm({ ...editForm, apiRequestId: e.target.value })}>
                  <option value="">Seleziona richiesta API</option>
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} · {r.method} {r.url}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <div className="label">Max tentativi</div>
                <input className="input" type="number" value={editForm.maxRetries || 0} onChange={(e) => setEditForm({ ...editForm, maxRetries: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Backoff (ms)</div>
                <input className="input" type="number" value={editForm.backoffMs || 0} onChange={(e) => setEditForm({ ...editForm, backoffMs: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Soglia fallimenti</div>
                <input className="input" type="number" value={editForm.failureThreshold || 1} onChange={(e) => setEditForm({ ...editForm, failureThreshold: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Soglia circuito</div>
                <input className="input" type="number" value={editForm.circuitBreakerThreshold || 0} onChange={(e) => setEditForm({ ...editForm, circuitBreakerThreshold: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Durata circuito (ms)</div>
                <input className="input" type="number" value={editForm.circuitBreakerDurationMs || 0} onChange={(e) => setEditForm({ ...editForm, circuitBreakerDurationMs: e.target.value })} />
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
              <div className="field md:col-span-3">
                <label className="flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-3 text-sm">
                  <input type="checkbox" checked={!!editForm.alertOnRecovery} onChange={(e) => setEditForm({ ...editForm, alertOnRecovery: e.target.checked })} />
                  Avvisa al recupero
                </label>
              </div>
              <div className="field md:col-span-3">
                <div className="label">Condizioni JSON</div>
                <textarea className="textarea" value={editForm.conditions || "{}"} onChange={(e) => setEditForm({ ...editForm, conditions: e.target.value })} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-xl border border-ink/10 px-4 py-2 text-sm" onClick={() => setEditSchedule(null)}>
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
