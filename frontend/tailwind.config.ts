import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f2",
          100: "#dcece0",
          500: "#2f9e5b",
          600: "#1f8049",
          700: "#14653b",
          900: "#0b3a22",
        },
      },
    },
  },
  plugins: [],
};

export default config;
