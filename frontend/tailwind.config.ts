import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kanad-derived lab palette
        void: "#060607",
        panel: "#0e0e11",
        panel2: "#131318",
        edge: "#24242a",
        edge2: "#34343c",
        ink: "#eceae4",
        dim: "#8a8a92",
        faint: "#6c6c72",
        // Emerald gloss ramp (reference: premium card / quantum branding)
        ember: {
          50: "#e9fbf0",
          200: "#b7f65c",
          300: "#7ceb6d",
          400: "#3ee06e",
          500: "#34d97b",
          600: "#1fae60",
          700: "#0f7a3d",
          900: "#0b3b24",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        pixel: ["var(--font-pixel)", "monospace"],
      },
      borderRadius: {
        card: "1.25rem",
      },
      boxShadow: {
        deep: "0 4px 12px rgba(0,0,0,.6), 0 20px 52px rgba(0,0,0,.72)",
        glow: "0 0 0 1px rgba(62,224,110,.25), 0 8px 40px rgba(62,224,110,.12)",
        "glow-lg": "0 0 0 1px rgba(62,224,110,.35), 0 12px 60px rgba(62,224,110,.22)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0,0) rotate(0deg) scale(1)" },
          "33%": { transform: "translate(4%, -6%) rotate(8deg) scale(1.08)" },
          "66%": { transform: "translate(-5%, 4%) rotate(-6deg) scale(0.96)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        pan: {
          from: { backgroundPosition: "0% 50%" },
          to: { backgroundPosition: "200% 50%" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        rise: "rise .7s cubic-bezier(.22,1,.36,1) both",
        drift: "drift 22s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        pan: "pan 8s linear infinite",
        pulseGlow: "pulseGlow 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
