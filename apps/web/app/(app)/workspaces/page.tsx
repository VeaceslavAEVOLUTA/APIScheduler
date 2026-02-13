"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { setActiveWorkspaceId } from "../../lib/workspace";
import ConfirmModal from "../../components/confirm-modal";

type Workspace = { id: string; name: string; slug: string; role: string; statusPageEnabled?: boolean };
type Membership = { id: string; role: string; user: { id: string; email: string; name?: string } };
type Me = { id: string; email: string; name?: string; firstName?: string; lastName?: string; isSuperAdmin?: boolean };
type Invite = { id: string; email: string; role: string; status: string; token: string };

export default function WorkspacesPage() {
  const [items, setItems] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [statusLink, setStatusLink] = useState<string | null>(null);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Workspace | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [pendingInvite, setPendingInvite] = useState<Invite | null>(null);

  const load = async () => {
    const res = await apiFetch<Workspace[]>("/workspaces");
    setItems(res);
    if (!activeWorkspaceId && res[0]?.id) {
      setActiveWorkspaceIdState(res[0].id);
      setActiveWorkspaceId(res[0].id);
    }
  };

  const loadMembers = async (workspaceId: string) => {
    const [m, i] = await Promise.all([
      apiFetch<Membership[]>(`/members/${workspaceId}`),
      apiFetch<Invite[]>(`/invitations/${workspaceId}`),
    ]);
    setMembers(m);
    setInvites(i);
  };

  useEffect(() => {
    load().catch(() => undefined);
    apiFetch<Me>("/users/me").then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) loadMembers(activeWorkspaceId).catch(() => undefined);
  }, [activeWorkspaceId]);

  useEffect(() => {
    const ws = items.find((w) => w.id === activeWorkspaceId) || items[0];
    if (ws) {
      setStatusLink(`${window.location.origin}/status/${ws.slug}`);
      setStatusEnabled(ws.statusPageEnabled !== false);
    }
  }, [items, activeWorkspaceId]);

  const toggleStatus = async (enabled: boolean) => {
    if (!activeWorkspaceId) return;
    await apiFetch(`/workspaces/${activeWorkspaceId}`, {
      method: "PATCH",
      body: JSON.stringify({ statusPageEnabled: enabled }),
    });
    setStatusEnabled(enabled);
    load();
  };

  const create = async () => {
    if (!name) return;
    await apiFetch("/workspaces", { method: "POST", body: JSON.stringify({ name }) });
    setName("");
    load();
    window.dispatchEvent(new Event("workspaces:changed"));
  };

  const askDelete = (ws: Workspace) => {
    setPendingDelete(ws);
    setConfirmName(ws.name);
    setConfirmInput("");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (confirmInput.trim() !== confirmName) return;
    await apiFetch(`/workspaces/${pendingDelete.id}`, { method: "DELETE" });
    setPendingDelete(null);
    setConfirmName("");
    setConfirmInput("");
    load();
    window.dispatchEvent(new Event("workspaces:changed"));
  };

  const sendInvite = async () => {
    if (!activeWorkspaceId) return;
    await apiFetch("/invitations", {
      method: "POST",
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, workspaceId: activeWorkspaceId }),
    });
    setInviteEmail("");
    loadMembers(activeWorkspaceId);
  };

  const updateRole = async (membershipId: string, role: string) => {
    await apiFetch(`/members/${membershipId}`, { method: "PATCH", body: JSON.stringify({ role }) });
    if (activeWorkspaceId) loadMembers(activeWorkspaceId);
  };

  const removeMember = async (membershipId: string) => {
    await apiFetch(`/members/${membershipId}`, { method: "DELETE" });
    if (activeWorkspaceId) loadMembers(activeWorkspaceId);
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/invite?token=${token}`;
    await navigator.clipboard.writeText(url);
    alert("Link invito copiato");
  };

  const askRevokeInvite = (invite: Invite) => {
    setPendingInvite(invite);
  };

  const confirmRevokeInvite = async () => {
    if (!pendingInvite) return;
    await apiFetch(`/invitations/${pendingInvite.id}`, { method: "DELETE" });
    if (activeWorkspaceId) loadMembers(activeWorkspaceId);
    setPendingInvite(null);
  };

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="flex items-center gap-3">
          <input className="flex-1 rounded-xl border border-ink/10 px-4 py-3" placeholder="Nuovo workspace" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="rounded-xl bg-ink px-4 py-3 text-fog" onClick={create}>Crea</button>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Workspace</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveWorkspaceIdState(row.id);
                  setActiveWorkspaceId(row.id);
                }}
                className={`rounded-full px-4 py-2 text-xs ${activeWorkspaceId === row.id ? "bg-ink text-fog" : "bg-white/70"}`}
              >
                {row.name} ({row.role})
              </button>
              <button className="rounded-full border border-ink/10 px-3 py-2 text-[11px]" onClick={() => askDelete(row)}>
                Elimina
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-ink/10 bg-white/70 px-4 py-3 text-xs">
          <div>Status pubblico</div>
          <select
            className="rounded-lg border border-ink/10 px-3 py-1 text-xs"
            value={statusEnabled ? "true" : "false"}
            onChange={(e) => toggleStatus(e.target.value === "true")}
          >
            <option value="true">Abilitato</option>
            <option value="false">Disabilitato</option>
          </select>
        </div>
        {statusLink && (
          <div className="mt-4 rounded-2xl border border-ink/10 bg-white/70 px-4 py-3 text-xs">
            Status pubblico: <a className="underline" href={statusLink} target="_blank" rel="noreferrer">{statusLink}</a>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-3xl p-6 shadow-edge">
          <div className="text-xs uppercase tracking-[0.2em] text-slate">Membri</div>
          <div className="mt-4 space-y-3 text-sm">
            {([
              ...members,
              ...(me && me.isSuperAdmin && !members.find((m) => m.user.id === me.id)
                ? [
                    {
                      id: "me-superadmin",
                      role: "SUPERADMIN",
                      user: { id: me.id, email: me.email, name: me.name || `${me.firstName || ""} ${me.lastName || ""}`.trim() },
                      _virtual: true,
                    } as any,
                  ]
                : []),
            ] as Array<Membership & { _virtual?: boolean }>).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <div>
                  <div className="font-medium">{m.user.name || m.user.email}</div>
                  <div className="text-xs text-slate">{m.user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {m._virtual ? (
                    <span className="rounded-full bg-ink/5 px-3 py-1 text-xs">SUPER ADMIN</span>
                  ) : (
                    <>
                      <select className="rounded-lg border border-ink/10 px-2 py-1 text-xs" value={m.role} onChange={(e) => updateRole(m.id, e.target.value)}>
                        {['OWNER','ADMIN','EDITOR','VIEWER'].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-ink/10 px-2 py-1 text-xs" onClick={() => removeMember(m.id)}>
                        Rimuovi
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-6 shadow-edge">
          <div className="text-xs uppercase tracking-[0.2em] text-slate">Inviti</div>
          <div className="mt-4 space-y-3 text-sm">
            {invites.map((i) => (
              <div key={i.id} className="rounded-2xl bg-white/70 px-4 py-3">
                <div className="font-medium">{i.email}</div>
                <div className="text-xs text-slate">{i.role} · {i.status}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button className="rounded-lg border border-ink/10 px-2 py-1 text-xs" onClick={() => copyInviteLink(i.token)}>
                    Copia link invito
                  </button>
                  <button className="rounded-lg border border-rose/20 px-2 py-1 text-xs text-rose" onClick={() => askRevokeInvite(i)}>
                    Elimina invito
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <input className="rounded-xl border border-ink/10 px-4 py-3" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <select className="rounded-xl border border-ink/10 px-4 py-3" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {['OWNER','ADMIN','EDITOR','VIEWER'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button className="rounded-xl bg-ink px-4 py-3 text-fog" onClick={sendInvite}>Invita</button>
          </div>
        </div>
      </div>

      {pendingDelete && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="modal-panel glass w-full max-w-md rounded-3xl p-6 shadow-edge">
            <div className="text-xs uppercase tracking-[0.2em] text-slate">Conferma eliminazione</div>
            <div className="mt-2 text-sm text-slate">Scrivi "{confirmName}" per confermare.</div>
            <input
              className="mt-4 w-full rounded-xl border border-ink/10 px-4 py-3 text-sm"
              placeholder={confirmName}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
            />
            <div className="mt-2 text-[11px] text-slate">Il nome deve combaciare per confermare.</div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-xl border border-ink/10 px-4 py-2 text-sm" onClick={() => { setPendingDelete(null); setConfirmInput(""); }}>
                Annulla
              </button>
              <button
                className="rounded-xl bg-ink px-4 py-2 text-sm text-fog"
                onClick={confirmDelete}
                disabled={confirmInput.trim() !== confirmName}
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingInvite && (
        <ConfirmModal
          open={!!pendingInvite}
          title="Elimina invito"
          message={`Vuoi eliminare l'invito a "${pendingInvite.email}"?`}
          confirmText="Elimina"
          onCancel={() => setPendingInvite(null)}
          onConfirm={confirmRevokeInvite}
        />
      )}
    </section>
  );
}
