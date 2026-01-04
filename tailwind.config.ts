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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          100: "#fef9c3", // yellow-100
          500: "#eab308", // yellow-500
          600: "#ca8a04", // yellow-600 (default primary)
          700: "#a16207", // yellow-700
          800: "#854d0e", // yellow-800
        },
      },
    },
  },
  plugins: [],
};
export default config;

