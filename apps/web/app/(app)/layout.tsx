"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../components/auth-provider";
import { apiFetch } from "../lib/api";
import { getActiveWorkspaceId, resolveActiveWorkspaceId, setActiveWorkspaceId } from "../lib/workspace";

const nav = [
  { href: "/dashboard", label: "Cruscotto" },
  { href: "/workspaces", label: "Workspace" },
  { href: "/requests", label: "Richieste API" },
  { href: "/schedules", label: "Pianificazioni" },
  { href: "/monitors", label: "Monitor" },
  { href: "/notifications", label: "Notifiche" },
  { href: "/logs", label: "Log" },
  { href: "/admin", label: "Amministrazione" },
];

type Workspace = { id: string; name: string; role: string };
type Me = { id: string; email: string; name?: string; firstName?: string; lastName?: string };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(getActiveWorkspaceId());
  const pathname = usePathname();

  const refreshWorkspaces = () => {
    apiFetch<Workspace[]>("/workspaces")
      .then((list) => {
        setWorkspaces(list);
        const resolved = resolveActiveWorkspaceId(list);
        if (resolved) {
          setActiveWorkspaceId(resolved);
          setActiveWorkspaceIdState(resolved);
        }
      })
      .catch(() => setWorkspaces([]));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    apiFetch<Me>("/users/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [pathname]);

  useEffect(() => {
    const onChanged = () => refreshWorkspaces();
    window.addEventListener("workspaces:changed", onChanged as EventListener);
    window.addEventListener("focus", onChanged as EventListener);
    window.addEventListener("workspace:active", onChanged as EventListener);
    return () => {
      window.removeEventListener("workspaces:changed", onChanged as EventListener);
      window.removeEventListener("focus", onChanged as EventListener);
      window.removeEventListener("workspace:active", onChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-profile-menu]")) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const initials = (() => {
    const first = me?.firstName?.[0] || me?.name?.[0] || "";
    const last = me?.lastName?.[0] || "";
    const fallback = me?.email?.[0] || "";
    return (first + last || fallback || "U").toUpperCase();
  })();

  return (
    <div className="min-h-screen bg-fog text-ink">
      <div className="mx-auto grid max-w-7xl grid-cols-[260px_1fr] items-start gap-6 px-6 py-6">
        <aside className="glass self-start rounded-3xl p-6 shadow-edge">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-ink text-fog flex items-center justify-center font-semibold">
              AS
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate">APIScheduler</div>
              <div className="text-sm text-slate/70">Centro di controllo</div>
            </div>
          </div>

          <nav className="mt-8 space-y-2 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 hover:bg-ink/5"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 space-y-2 text-xs text-slate">
            <div className="uppercase tracking-[0.2em]">Workspace</div>
            <div className="space-y-2">
              {workspaces.slice(0, 5).map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setActiveWorkspaceId(w.id);
                    setActiveWorkspaceIdState(w.id);
                  }}
                  className={`w-full text-left rounded-xl border px-3 py-2 ${activeWorkspaceId === w.id ? "border-ink/20 bg-ink/5" : "border-ink/10"}`}
                >
                  <div className="font-medium text-ink">{w.name}</div>
                  <div className="text-[11px]">{w.role}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <header className="glass relative z-50 flex items-center justify-between rounded-3xl px-6 py-4 shadow-edge">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate">Panoramica</div>
              <div className="text-lg font-semibold">APIScheduler</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative" data-profile-menu>
                <button
                  className="h-10 w-10 rounded-full bg-ink text-fog flex items-center justify-center text-sm font-semibold"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Menu profilo"
                >
                  {initials}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-ink/10 bg-white/95 p-3 shadow-edge z-[999]">
                    <div className="px-2 py-2 text-sm">
                      <div className="font-semibold">{me?.name || `${me?.firstName || ""} ${me?.lastName || ""}`.trim() || me?.email}</div>
                      <div className="text-xs text-slate">{me?.email}</div>
                    </div>
                    <div className="my-2 h-px bg-ink/10" />
                    <Link className="block rounded-xl px-3 py-2 text-sm hover:bg-ink/5" href="/profile" onClick={() => setMenuOpen(false)}>
                      Profilo
                    </Link>
                    <Link className="block rounded-xl px-3 py-2 text-sm hover:bg-ink/5" href="/invites" onClick={() => setMenuOpen(false)}>
                      I miei inviti
                    </Link>
                    <Link className="block rounded-xl px-3 py-2 text-sm hover:bg-ink/5" href="/workspaces" onClick={() => setMenuOpen(false)}>
                      Invita
                    </Link>
                    <button
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-ink/5"
                      onClick={() => {
                        logout();
                        window.location.href = "/login";
                      }}
                    >
                      Esci
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div key={pathname} className="page-transition">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
