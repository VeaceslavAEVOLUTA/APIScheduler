import { API_URL } from "../../lib/api";
import RefreshCountdown from "./refresh-countdown";

type HistoryPoint = {
  ok: boolean;
  status: string;
  timestamp?: string | null;
  responseMs?: number | null;
  statusCode?: number | null;
  response?: unknown;
  error?: string | null;
};

type StatusResponse = {
  workspace: { id: string; name: string; slug: string; statusTitle: string; statusDescription?: string | null };
  monitors: Array<{
    id: string;
    name: string;
    lastStatus: string;
    lastCheckedAt?: string | null;
    uptimePct: number;
    history: HistoryPoint[];
  }>;
  schedules: Array<{
    id: string;
    name: string;
    lastStatus: string;
    lastFinishedAt?: string | null;
    uptimePct: number;
    history: HistoryPoint[];
  }>;
};

function formatDetail(item: HistoryPoint) {
  const ts = item.timestamp ? new Date(item.timestamp).toLocaleString("it-IT") : "n/d";
  const responseRaw = item.response != null ? JSON.stringify(item.response) : item.error || "nessuna risposta";
  const responseShort = responseRaw.length > 180 ? `${responseRaw.slice(0, 180)}...` : responseRaw;
  const code = item.statusCode != null ? ` · HTTP ${item.statusCode}` : "";
  const ms = item.responseMs != null ? ` · ${item.responseMs}ms` : "";
  return `${item.status}${code}${ms}\n${ts}\n${responseShort}`;
}

function HistoryBar({ items }: { items: HistoryPoint[] }) {
  return (
    <div className="flex items-center gap-1">
      {items.map((item, i) => (
        <span
          key={i}
          className={`h-3 w-2 rounded-full ${item.ok ? "bg-emerald-400" : "bg-rose-400"}`}
          title={formatDetail(item)}
        />
      ))}
    </div>
  );
}

export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await fetch(`${API_URL}/public/status/${slug}`, { cache: "no-store" });
  if (!res.ok) {
    return (
      <main className="min-h-screen bg-[#0b0b0f] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-2xl font-semibold">Status non disponibile</div>
          <div className="mt-2 text-white/60">La pagina non è pubblica o non esiste.</div>
        </div>
      </main>
    );
  }
  const data = (await res.json()) as StatusResponse;

  const allOk =
    data.monitors.every((m) => m.lastStatus === "SUCCESS" || m.lastStatus === "UNKNOWN") &&
    data.schedules.every((s) => s.lastStatus === "SUCCESS" || s.lastStatus === "UNKNOWN");

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">Status</div>
            <div className="mt-2 text-2xl font-semibold">{data.workspace.statusTitle}</div>
            {data.workspace.statusDescription && <div className="text-sm text-white/60">{data.workspace.statusDescription}</div>}
          </div>
        </header>

        <div className={`rounded-2xl px-5 py-4 ${allOk ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${allOk ? "bg-emerald-400" : "bg-rose-400"}`} />
            <div className="text-sm">{allOk ? "Tutti i sistemi sono operativi" : "Alcuni sistemi hanno problemi"}</div>
          </div>
        </div>

        {data.monitors.length > 0 && (
          <section className="space-y-3">
            <div className="text-sm uppercase tracking-[0.2em] text-white/50">Monitor</div>
            <div className="space-y-3">
              {data.monitors.map((m) => (
                <div key={m.id} className="rounded-2xl bg-white/5 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-white/60">Ultimo stato: {m.lastStatus}</div>
                    </div>
                    <div className="text-sm text-white/70">{m.uptimePct}%</div>
                  </div>
                  <div className="mt-3">
                    <HistoryBar items={m.history.slice().reverse()} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.schedules.length > 0 && (
          <section className="space-y-3">
            <div className="text-sm uppercase tracking-[0.2em] text-white/50">Pianificazioni</div>
            <div className="space-y-3">
              {data.schedules.map((s) => (
                <div key={s.id} className="rounded-2xl bg-white/5 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-white/60">Ultimo stato: {s.lastStatus}</div>
                    </div>
                    <div className="text-sm text-white/70">{s.uptimePct}%</div>
                  </div>
                  <div className="mt-3">
                    <HistoryBar items={s.history.slice().reverse()} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <RefreshCountdown />
    </main>
  );
}
