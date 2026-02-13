"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const REFRESH_SECONDS = 300;

export default function RefreshCountdown() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REFRESH_SECONDS);

  useEffect(() => {
    const tick = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          router.refresh();
          return REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [router]);

  const minutes = Math.floor(seconds / 60);
  const secs = `${seconds % 60}`.padStart(2, "0");

  return (
    <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70">
      Aggiornamento tra {minutes}:{secs}
    </div>
  );
}
