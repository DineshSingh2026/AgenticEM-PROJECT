import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx}", "./content/**/*.{ts,mdx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    extend: {
      colors: {
        bg: v("bg"), "bg-elev": v("bg-elev"), "bg-elev-2": v("bg-elev-2"),
        line: v("line"), "line-strong": v("line-strong"),
        text: v("text"), "text-dim": v("text-dim"), "text-faint": v("text-faint"),
        copper: v("copper"), "copper-soft": v("copper-soft"), steel: v("steel"),
        "data-blue": v("data-blue"), "data-red": v("data-red"), "data-green": v("data-green"), "data-gold": v("data-gold"),
        ivory: v("ivory"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: { content: "1280px", prose: "64ch" },
      spacing: { 18: "72px", 30: "120px", 40: "160px" },
      transitionTimingFunction: { out: "cubic-bezier(0.22,1,0.36,1)" },
      borderRadius: { btn: "2px" },
    },
  },
  plugins: [],
};
export default config;
