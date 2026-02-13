"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { resolveActiveWorkspaceId } from "../../lib/workspace";

export default function DashboardPage() {
  const [stats, setStats] = useState({ monitors: 0, schedules: 0, requests: 0 });

  useEffect(() => {
    const load = async () => {
      const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
      const workspaceId = resolveActiveWorkspaceId(workspaces);
      if (!workspaceId) return;
      const [monitors, schedules, requests] = await Promise.all([
        apiFetch<any[]>(`/monitors/${workspaceId}`),
        apiFetch<any[]>(`/schedules/${workspaceId}`),
        apiFetch<any[]>(`/requests/${workspaceId}`),
      ]);
      setStats({ monitors: monitors.length, schedules: schedules.length, requests: requests.length });
    };
    load().catch(() => undefined);
    const onActive = () => load().catch(() => undefined);
    window.addEventListener("workspace:active", onActive as EventListener);
    return () => window.removeEventListener("workspace:active", onActive as EventListener);
  }, []);

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Stato sistema</div>
        <div className="mt-2 text-2xl font-semibold">Stato piattaforma</div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { label: "Monitor attivi", value: stats.monitors },
            { label: "Pianificazioni attive", value: stats.schedules },
            { label: "Richieste API", value: stats.requests },
            { label: "Allarmi", value: "-" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-ink/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate">{kpi.label}</div>
              <div className="mt-2 text-2xl font-semibold">{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Allarmi</div>
        <div className="mt-2 text-lg font-semibold">Incidenti recenti</div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-slate">Nessun incidente.</div>
        </div>
      </div>
    </section>
  );
}
