import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "./components/auth-provider";

export const metadata: Metadata = {
  title: "APIScheduler",
  description: "API scheduler, monitor, and workgroup platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
