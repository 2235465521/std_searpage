/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface": "#f8f9fa",
        "on-surface": "#191c1d",
        "on-surface-variant": "#414755",
        "primary": "#0058bc",
        "primary-container": "#0070eb",
        "surface-container-low": "#f3f4f5",
        "surface-container-high": "#e7e8e9",
        "outline-variant": "#c1c6d7",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        display: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
