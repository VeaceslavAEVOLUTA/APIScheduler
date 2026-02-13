import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-fog text-ink flex items-center justify-center px-6">
          <div className="text-sm text-slate">Caricamento reset password...</div>
        </main>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
