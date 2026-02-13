"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { resolveActiveWorkspaceId } from "../../lib/workspace";

type JobRun = {
  id: string;
  status: string;
  responseMs?: number;
  finishedAt?: string;
  response?: any;
  schedule: { name: string };
};

type MonitorCheck = {
  id: string;
  status: string;
  responseMs?: number;
  checkedAt?: string;
  error?: string;
  monitor: { name: string };
};

function LineChart({
  values,
  color,
  labels,
  names,
}: {
  values: number[];
  color: string;
  labels: string[];
  names?: string[];
}) {
  const [hover, setHover] = useState<{ x: number; y: number; v: number; label: string; name?: string } | null>(null);
  const width = 520;
  const height = 120;
  const max = Math.max(1, ...values);

  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * (width - 10) + 5;
    const y = height - (v / max) * (height - 10) - 5;
    return { x, y, v, label: labels[i] || "", name: names?.[i] };
  });

  const hoverLeft = hover ? (hover.x / width) * 100 : 0;
  const hoverTop = hover ? (hover.y / height) * 100 : 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points.map((p) => `${p.x},${p.y}`).join(" ")} />
        <line x1="0" y1={height - 5} x2={width} y2={height - 5} stroke="rgba(0,0,0,0.08)" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover?.x === p.x && hover?.y === p.y ? 4 : 2.5}
              fill={color}
              stroke="white"
              strokeWidth="1"
              onMouseEnter={() => setHover(p)}
              onMouseMove={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-ink/10 bg-white/95 px-3 py-2 text-[11px] shadow"
          style={{ left: `${hoverLeft}%`, top: `${hoverTop}%`, transform: "translate(-50%, -120%)" }}
        >
          <div className="font-medium text-ink">{hover.v} ms</div>
          {hover.name && <div className="text-ink/70">{hover.name}</div>}
          <div className="text-slate">{hover.label || "—"}</div>
        </div>
      )}
    </div>
  );
}

export default function LogsPage() {
  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [monitorChecks, setMonitorChecks] = useState<MonitorCheck[]>([]);
  const [jobPage, setJobPage] = useState(1);
  const [monPage, setMonPage] = useState(1);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [expandedMonId, setExpandedMonId] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    const load = async () => {
      const workspaces = await apiFetch<Array<{ id: string }>>("/workspaces");
      const workspaceId = resolveActiveWorkspaceId(workspaces);
      if (!workspaceId) return;
      const res = await apiFetch<{ jobRuns: JobRun[]; monitorChecks: MonitorCheck[] }>(`/logs/${workspaceId}`);
      setJobRuns(res.jobRuns);
      setMonitorChecks(res.monitorChecks);
    };
    load().catch(() => undefined);
    const onActive = () => load().catch(() => undefined);
    window.addEventListener("workspace:active", onActive as EventListener);
    return () => window.removeEventListener("workspace:active", onActive as EventListener);
  }, []);

  const jobStats = useMemo(() => {
    const ok = jobRuns.filter((r) => r.status === "SUCCESS").length;
    const fail = jobRuns.filter((r) => r.status !== "SUCCESS").length;
    return { ok, fail };
  }, [jobRuns]);

  const monitorStats = useMemo(() => {
    const ok = monitorChecks.filter((r) => r.status === "SUCCESS").length;
    const fail = monitorChecks.filter((r) => r.status !== "SUCCESS").length;
    return { ok, fail };
  }, [monitorChecks]);

  const jobLatencySeries = useMemo(() => jobRuns.slice(0, 24).map((r) => r.responseMs || 0).reverse(), [jobRuns]);
  const monitorLatencySeries = useMemo(() => monitorChecks.slice(0, 24).map((r) => r.responseMs || 0).reverse(), [monitorChecks]);
  const jobLabels = useMemo(() => jobRuns.slice(0, 24).map((r) => r.finishedAt || "").reverse(), [jobRuns]);
  const monitorLabels = useMemo(() => monitorChecks.slice(0, 24).map((r) => r.checkedAt || "").reverse(), [monitorChecks]);
  const jobNames = useMemo(() => jobRuns.slice(0, 24).map((r) => r.schedule?.name || "").reverse(), [jobRuns]);
  const monitorNames = useMemo(() => monitorChecks.slice(0, 24).map((r) => r.monitor?.name || "").reverse(), [monitorChecks]);

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate">Esecuzioni job</div>
          <div className="mt-2 text-2xl font-semibold">Successi vs Falliti</div>
          <div className="mt-4 h-2 w-full rounded-full bg-ink/10">
            <div
              className="h-2 rounded-full bg-neon"
              style={{ width: `${(jobStats.ok / Math.max(1, jobStats.ok + jobStats.fail)) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-slate">OK {jobStats.ok} · Falliti {jobStats.fail}</div>
          <div className="mt-4">
            <LineChart values={jobLatencySeries.length ? jobLatencySeries : [0]} labels={jobLabels} names={jobNames} color="#1cf2c7" />
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate">Controlli monitor</div>
          <div className="mt-2 text-2xl font-semibold">Successi vs Falliti</div>
          <div className="mt-4 h-2 w-full rounded-full bg-ink/10">
            <div
              className="h-2 rounded-full bg-amber"
              style={{ width: `${(monitorStats.ok / Math.max(1, monitorStats.ok + monitorStats.fail)) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-slate">OK {monitorStats.ok} · Falliti {monitorStats.fail}</div>
          <div className="mt-4">
            <LineChart values={monitorLatencySeries.length ? monitorLatencySeries : [0]} labels={monitorLabels} names={monitorNames} color="#ffb000" />
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Esecuzioni job recenti</div>
        <div className="mt-4 space-y-3 text-sm">
          {jobRuns.slice((jobPage - 1) * pageSize, jobPage * pageSize).map((row) => (
            <div key={row.id} className="rounded-2xl bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{row.schedule?.name}</div>
                  <div className="text-xs text-slate">{row.status} · {row.responseMs ?? "-"}ms</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-ink/5 px-3 py-1 text-xs">{row.finishedAt?.slice(0, 19) || ""}</span>
                  <button
                    className="rounded-lg border border-ink/10 px-3 py-1 text-xs"
                    onClick={() => setExpandedJobId((prev) => (prev === row.id ? null : row.id))}
                  >
                    Dettagli
                  </button>
                </div>
              </div>
              {expandedJobId === row.id && (
                <pre className="mt-3 overflow-auto rounded-xl bg-white/80 p-3 text-xs">
                  {JSON.stringify(row.response || row, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <button className="rounded-lg border border-ink/10 px-3 py-1" disabled={jobPage === 1} onClick={() => setJobPage((p) => Math.max(1, p - 1))}>
            Prec
          </button>
          <span className="text-slate">Pagina {jobPage}</span>
          <button className="rounded-lg border border-ink/10 px-3 py-1" disabled={jobPage * pageSize >= jobRuns.length} onClick={() => setJobPage((p) => p + 1)}>
            Succ
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Controlli monitor recenti</div>
        <div className="mt-4 space-y-3 text-sm">
          {monitorChecks.slice((monPage - 1) * pageSize, monPage * pageSize).map((row) => (
            <div key={row.id} className="rounded-2xl bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{row.monitor?.name}</div>
                  <div className="text-xs text-slate">{row.status} · {row.responseMs ?? "-"}ms</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-ink/5 px-3 py-1 text-xs">{row.checkedAt?.slice(0, 19) || ""}</span>
                  <button
                    className="rounded-lg border border-ink/10 px-3 py-1 text-xs"
                    onClick={() => setExpandedMonId((prev) => (prev === row.id ? null : row.id))}
                  >
                    Dettagli
                  </button>
                </div>
              </div>
              {expandedMonId === row.id && (
                <pre className="mt-3 overflow-auto rounded-xl bg-white/80 p-3 text-xs">
                  {JSON.stringify(row, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <button className="rounded-lg border border-ink/10 px-3 py-1" disabled={monPage === 1} onClick={() => setMonPage((p) => Math.max(1, p - 1))}>
            Prec
          </button>
          <span className="text-slate">Pagina {monPage}</span>
          <button className="rounded-lg border border-ink/10 px-3 py-1" disabled={monPage * pageSize >= monitorChecks.length} onClick={() => setMonPage((p) => p + 1)}>
            Succ
          </button>
        </div>
      </div>

    </section>
  );
}
