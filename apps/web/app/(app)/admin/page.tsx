"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type AdminStats = {
  users: number;
  workspaces: number;
  workgroups: number;
  requests: number;
  schedules: number;
  monitors: number;
  notifications: number;
};

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  workspaceId?: string;
  createdAt: string;
  metadata?: any;
  actor?: { id: string; email: string; name?: string; firstName?: string; lastName?: string };
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats>({
    users: 0,
    workspaces: 0,
    workgroups: 0,
    requests: 0,
    schedules: 0,
    monitors: 0,
    notifications: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [tokenMap, setTokenMap] = useState<Record<string, string>>({});
  const [meId, setMeId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const [users, workspaces, workgroups, requests, schedules, monitors, notifications, me, audit] = await Promise.all([
        apiFetch<any[]>("/admin/users"),
        apiFetch<any[]>("/admin/workspaces"),
        apiFetch<any[]>("/admin/workgroups"),
        apiFetch<any[]>("/admin/requests"),
        apiFetch<any[]>("/admin/schedules"),
        apiFetch<any[]>("/admin/monitors"),
        apiFetch<any[]>("/admin/notifications"),
        apiFetch<any>("/users/me"),
        apiFetch<AuditRow[]>("/admin/audit?limit=50"),
      ]);
      setStats({
        users: users.length,
        workspaces: workspaces.length,
        workgroups: workgroups.length,
        requests: requests.length,
        schedules: schedules.length,
        monitors: monitors.length,
        notifications: notifications.length,
      });
      setMeId(me?.id || null);
      setUsers(users);
      setAudit(audit);
    };
    load().catch(() => undefined);
  }, []);

  const saveUser = async (user: any) => {
    await apiFetch(`/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        email: user.email,
        name: user.name || undefined,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        isSuperAdmin: !!user.isSuperAdmin,
      }),
    });
  };

  const generateReset = async (userId: string) => {
    const res = await apiFetch<{ token: string; expiresAt: string }>(`/admin/users/${userId}/reset-token`, {
      method: "POST",
    });
    setTokenMap((prev) => ({ ...prev, [userId]: res.token }));
  };

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge grid gap-4 md:grid-cols-3">
        {([
          { key: "users", label: "Utenti" },
          { key: "workspaces", label: "Workspace" },
          { key: "workgroups", label: "Workgroup" },
          { key: "requests", label: "Richieste API" },
          { key: "schedules", label: "Pianificazioni" },
          { key: "monitors", label: "Monitor" },
          { key: "notifications", label: "Notifiche" },
        ] as Array<{ key: keyof AdminStats; label: string }>).map((m) => (
          <div key={m.key} className="rounded-2xl border border-ink/10 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate">{m.label}</div>
            <div className="mt-2 text-2xl font-semibold">{stats[m.key]}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Utenti</div>
        <div className="mt-4 space-y-4 text-sm">
          {users.filter((u) => u.id !== meId).map((u) => (
            <div key={u.id} className="rounded-2xl bg-white/70 p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="field">
                  <div className="label">Nome</div>
                  <input className="input" value={u.firstName || ""} onChange={(e) => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, firstName: e.target.value } : x))} />
                </div>
                <div className="field">
                  <div className="label">Cognome</div>
                  <input className="input" value={u.lastName || ""} onChange={(e) => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, lastName: e.target.value } : x))} />
                </div>
                <div className="field">
                  <div className="label">Nome visualizzato</div>
                  <input className="input" value={u.name || ""} onChange={(e) => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, name: e.target.value } : x))} />
                </div>
                <div className="field">
                  <div className="label">Email</div>
                  <input className="input" value={u.email || ""} onChange={(e) => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, email: e.target.value } : x))} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!u.isSuperAdmin}
                    onChange={(e) => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isSuperAdmin: e.target.checked } : x))}
                  />
                  Super admin
                </label>
                <button className="rounded-xl border border-ink/10 px-3 py-1 text-xs" onClick={() => saveUser(u)}>
                  Salva
                </button>
                <button className="rounded-xl border border-ink/10 px-3 py-1 text-xs" onClick={() => generateReset(u.id)}>
                  Genera reset password
                </button>
                {tokenMap[u.id] && (
                  <span className="text-xs text-slate break-all">
                    Token reset: {tokenMap[u.id]} · Link: {typeof window !== "undefined" ? `${window.location.origin}/reset-password?token=${tokenMap[u.id]}` : ""}
                  </span>
                )}
              </div>
            </div>
          ))}
          {users.filter((u) => u.id !== meId).length === 0 && <div className="text-slate">Nessun altro utente.</div>}
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Audit log</div>
        <div className="mt-4 space-y-2 text-sm">
          {audit.map((row) => (
            <div key={row.id} className="rounded-2xl bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{row.action}</div>
                  <div className="text-xs text-slate">
                    {row.entityType}{row.entityId ? ` · ${row.entityId}` : ""}
                  </div>
                  <div className="text-[11px] text-slate">
                    {row.actor?.email || "system"} · {row.createdAt?.slice(0, 19)}
                  </div>
                </div>
                {row.workspaceId && <span className="rounded-full bg-ink/5 px-3 py-1 text-xs">WS {row.workspaceId}</span>}
              </div>
            </div>
          ))}
          {audit.length === 0 && <div className="text-slate">Nessuna azione registrata.</div>}
        </div>
      </div>
    </section>
  );
}
