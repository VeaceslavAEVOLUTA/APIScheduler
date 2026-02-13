import { Suspense } from "react";
import InviteClient from "./invite-client";

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-fog text-ink flex items-center justify-center px-6">
          <div className="text-sm text-slate">Caricamento invito...</div>
        </main>
      }
    >
      <InviteClient />
    </Suspense>
  );
}
