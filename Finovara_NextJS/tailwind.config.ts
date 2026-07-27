import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        navy: "#102A43",
        emerald: "#087F5B",
        gold: "#C8A45D",
      },
    },
  },
  plugins: [],
};

export default config;
