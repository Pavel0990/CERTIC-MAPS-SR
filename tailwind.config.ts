import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F7F5",
        foreground: "#161616",
        surface: "#FFFFFF",
        border: "#EFEFEA",
        muted: {
          DEFAULT: "#EFEFEA",
          foreground: "#6F6F6A",
        },
        primary: {
          DEFAULT: "#2563EB", // Azul navegación / GPS / primaria
          foreground: "#FFFFFF",
        },
        territory: {
          nature: "#16A34A",   // Verde turismo / comercios / verificado
          mission: "#D97706",  // Ámbar misiones / recompensas
          alert: "#DC2626",    // Rojo incidencias críticas / emergencias
          neutral: "#6F6F6A",  // Gris institucional
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        display: ["var(--font-space-grotesk)", "Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
      boxShadow: {
        floating: "0 8px 30px rgba(0, 0, 0, 0.08)",
        subtle: "0 2px 10px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
