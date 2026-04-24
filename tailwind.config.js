/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"]
      },
      colors: {
        app: {
          bg: "#f6f8fb",
          surface: "#ffffff",
          muted: "#eef2f7",
          border: "#e5eaf1",
          primary: "#1463ff",
          text: "#111827",
          soft: "#667085"
        }
      },
      boxShadow: {
        app: "0 12px 30px rgba(15, 23, 42, 0.08)",
        soft: "0 8px 20px rgba(15, 23, 42, 0.06)"
      },
      borderRadius: {
        app: "1.25rem"
      }
    }
  }
};
