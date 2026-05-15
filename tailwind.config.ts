import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      animation: {
        blink: "blink 1s steps(2, start) infinite",
        flicker: "flicker 3s linear infinite",
      },
      keyframes: {
        blink: { to: { visibility: "hidden" } },
        flicker: {
          "0%,19.999%,22%,62.999%,64%,64.999%,70%,100%": { opacity: "1" },
          "20%,21.999%,63%,63.999%,65%,69.999%": { opacity: "0.85" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
