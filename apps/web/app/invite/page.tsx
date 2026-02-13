"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "../lib/api";

export default function InvitePage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const accept = async () => {
    if (!token || !password) return;
    try {
      await apiFetch("/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token, password, name: name || undefined }),
      });
      setStatus("Invito accettato. Ora puoi fare login.");
    } catch (err: any) {
      setStatus(err.message || "Errore accettazione invito");
    }
  };

  return (
    <main className="min-h-screen bg-fog text-ink flex items-center justify-center px-6">
      <div className="glass w-full max-w-md rounded-3xl p-8 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Invito</div>
        <h1 className="mt-2 text-2xl font-semibold">Accetta invito</h1>
        <div className="mt-4 text-sm text-slate">Token: {token || "mancante"}</div>
        <div className="mt-6 space-y-4">
          <input className="w-full rounded-xl border border-ink/10 px-4 py-3" placeholder="Nome (opzionale)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-xl border border-ink/10 px-4 py-3" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="w-full rounded-xl bg-ink px-4 py-3 text-fog" onClick={accept}>Accetta</button>
          {status && <div className="text-sm text-slate">{status}</div>}
        </div>
      </div>
    </main>
  );
}
