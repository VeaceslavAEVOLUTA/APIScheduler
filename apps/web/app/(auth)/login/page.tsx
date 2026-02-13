"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../components/auth-provider";

export default function LoginPage() {
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) window.location.href = "/dashboard";
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ token: string; userId: string; workspaceId: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth({ token: res.token, userId: res.userId, workspaceId: res.workspaceId });
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Accesso non riuscito");
    }
  };

  return (
    <main className="min-h-screen bg-fog text-ink flex items-center justify-center px-6">
      <div className="glass w-full max-w-md rounded-3xl p-8 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Accesso</div>
        <h1 className="mt-2 text-2xl font-semibold">Accedi</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input className="w-full rounded-xl border border-ink/10 px-4 py-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-xl border border-ink/10 px-4 py-3" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="text-sm text-rose">{error}</div>}
          <button className="w-full rounded-xl bg-ink px-4 py-3 text-fog">Entra</button>
        </form>
        <div className="mt-4 text-sm text-slate">
          Non hai un account? <Link className="underline" href="/register">Crea workspace</Link>
        </div>
      </div>
    </main>
  );
}
