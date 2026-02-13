"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    setStatus(null);
    if (!token) {
      setStatus("Token mancante.");
      return;
    }
    if (password.length < 8) {
      setStatus("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setStatus("Le password non coincidono.");
      return;
    }
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setStatus("Password aggiornata. Ora puoi accedere.");
    } catch (err: any) {
      setStatus(err.message || "Errore reset password");
    }
  };

  return (
    <main className="min-h-screen bg-fog text-ink flex items-center justify-center px-6">
      <div className="glass w-full max-w-md rounded-3xl p-8 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Reimposta password</div>
        <h1 className="mt-2 text-2xl font-semibold">Imposta nuova password</h1>
        <div className="mt-6 space-y-4">
          <input className="w-full rounded-xl border border-ink/10 px-4 py-3" type="password" placeholder="Nuova password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="w-full rounded-xl border border-ink/10 px-4 py-3" type="password" placeholder="Conferma password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="w-full rounded-xl bg-ink px-4 py-3 text-fog" onClick={submit}>Aggiorna</button>
          {status && <div className="text-sm text-slate">{status}</div>}
          <div className="text-sm text-slate">
            <Link className="underline" href="/login">Torna al login</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
