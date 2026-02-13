import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        body: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: "#0b0b0f",
        fog: "#f5f4f2",
        neon: "#1cf2c7",
        amber: "#ffb000",
        rose: "#ff5c8a",
        slate: "#1b1f2a",
      },
      boxShadow: {
        glow: "0 0 40px rgba(28,242,199,0.25)",
        edge: "0 0 0 1px rgba(255,255,255,0.08)",
      },
      backgroundImage: {
        "mesh": "radial-gradient(circle at 10% 10%, rgba(28,242,199,0.25), transparent 35%), radial-gradient(circle at 90% 20%, rgba(255,92,138,0.20), transparent 40%), radial-gradient(circle at 40% 90%, rgba(255,176,0,0.20), transparent 45%)"
      }
    },
  },
  plugins: [],
};

export default config;
