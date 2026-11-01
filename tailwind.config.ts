import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#8CBF9F",
          50: "#F3F9F4",
          100: "#EAF4EC",
          200: "#D3E8D8",
          300: "#B5D7BF",
          400: "#9FCBAE",
          500: "#8CBF9F",
          600: "#6FA986",
          700: "#5A8B6D",
          800: "#486F57",
          900: "#3B5A47",
        },
        background: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        success: "#4D9A69",
        warning: "#E6A34B",
        danger: "#D96B6B",
        line: "rgb(var(--line) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "var(--font-nunito)",
          "Nunito",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(48, 54, 48, 0.04), 0 8px 24px rgba(48, 54, 48, 0.06)",
        card: "0 1px 3px rgba(48, 54, 48, 0.05), 0 12px 32px rgba(48, 54, 48, 0.05)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
