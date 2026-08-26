import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Adlib brand palette — kept for the AdlibHeader parity with the other
        // apps (scorecard / lens).
        adlib: {
          primary:     "#0055CC",
          primarydark: "#00409A",
          accent:      "#2E7DE0",
          light:       "#E8F1FE",
          rule:        "#E4E8F0",
          muted:       "#5B667A",
          ink:         "#0F1729",
          good:        "#16A34A",
          warn:        "#D97706",
        },
        // RevOS Accounts workspace palette — the blue-and-white LIGHT-ONLY tokens
        // from the approved mock (revos_ui_mock.html). One source of truth for the
        // deep-dive so cards, pills, and signal dots stay consistent.
        revos: {
          ground:   "#F2F5FA",
          panel:    "#FFFFFF",
          card:     "#F4F6FB",
          line:     "#E4E8F0",
          line2:    "#D4DBE8",
          ink:      "#0F1729",
          ink2:     "#57627A",
          ink3:     "#93A0B5",
          brand:    "#0055CC",
          brand2:   "#2E7DE0",
          wash:     "#E8F1FE",
          crit:     "#D64545",
          critwash: "#FBE9E9",
          warn:     "#C77A12",
          warnwash: "#FBF0DD",
          good:     "#1F9D57",
          goodwash: "#E0F3E8",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,41,.05),0 8px 22px -14px rgba(15,23,41,.22)",
        ask: "0 6px 20px -12px rgba(0,85,204,.4)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
