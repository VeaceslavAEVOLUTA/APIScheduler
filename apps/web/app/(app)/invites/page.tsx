"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

type Invite = { id: string; email: string; role: string; token: string; workspaceId: string };

export default function InvitesPage() {
  const [items, setItems] = useState<Invite[]>([]);

  useEffect(() => {
    apiFetch<Invite[]>("/invitations/user/me")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">I miei inviti</div>
        <div className="mt-4 space-y-3 text-sm">
          {items.length === 0 && <div className="text-slate">Nessun invito pendente.</div>}
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
              <div>
                <div className="font-medium">Ruolo: {i.role}</div>
                <div className="text-xs text-slate">Invito per {i.email}</div>
              </div>
              <Link className="rounded-xl border border-ink/10 px-3 py-1 text-xs" href={`/invite?token=${i.token}`}>
                Accetta
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
