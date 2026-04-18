import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0f0f0f",
        card: "#1a1a1a",
        elevated: "#242424",
        border: "#2a2a2a",
        accent: "#e8323c",
        "accent-hover": "#c9272f",
        "accent-muted": "rgba(232,50,60,0.12)",
        primary: "#ffffff",
        secondary: "#888888",
        muted: "#555555",
        success: "#22c55e",
        warning: "#f97316",
        danger: "#e8323c",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.5)",
        accent: "0 0 20px rgba(232,50,60,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
