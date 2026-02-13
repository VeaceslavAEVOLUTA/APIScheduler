"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Me = {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  isSuperAdmin?: boolean;
};

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passStatus, setPassStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>("/users/me")
      .then((u) => {
        setEmail(u.email || "");
        setName(u.name || "");
        setFirstName(u.firstName || "");
        setLastName(u.lastName || "");
      })
      .catch(() => undefined);
  }, []);

  const saveProfile = async () => {
    setStatus(null);
    if (!email) {
      setStatus("Email obbligatoria.");
      return;
    }
    await apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ email, name: name || undefined, firstName: firstName || undefined, lastName: lastName || undefined }),
    });
    setStatus("Profilo aggiornato.");
  };

  const changePassword = async () => {
    setPassStatus(null);
    if (newPassword.length < 8) {
      setPassStatus("La nuova password deve avere almeno 8 caratteri.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassStatus("Le password non coincidono.");
      return;
    }
    await apiFetch("/users/me/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPassStatus("Password aggiornata.");
  };

  return (
    <section className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-edge grid gap-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Profilo</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="field">
            <div className="label">Nome <span className="help" data-tip="Nome personale">?</span></div>
            <input className="input" placeholder="Mario" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Cognome <span className="help" data-tip="Cognome personale">?</span></div>
            <input className="input" placeholder="Rossi" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Nome visualizzato <span className="help" data-tip="Nome mostrato nelle liste">?</span></div>
            <input className="input" placeholder="Mario Rossi" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Email <span className="help" data-tip="Email di accesso">?</span></div>
            <input className="input" placeholder="email@azienda.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        {status && <div className="text-sm text-slate">{status}</div>}
        <button className="rounded-xl bg-ink px-4 py-3 text-fog" onClick={saveProfile}>Salva profilo</button>
      </div>

      <div className="glass rounded-3xl p-6 shadow-edge grid gap-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">Sicurezza</div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="field">
            <div className="label">Password attuale <span className="help" data-tip="Password corrente">?</span></div>
            <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Nuova password <span className="help" data-tip="Minimo 8 caratteri">?</span></div>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Conferma password <span className="help" data-tip="Ripeti la nuova password">?</span></div>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        {passStatus && <div className="text-sm text-slate">{passStatus}</div>}
        <button className="rounded-xl bg-ink px-4 py-3 text-fog" onClick={changePassword}>Aggiorna password</button>
      </div>
    </section>
  );
}
