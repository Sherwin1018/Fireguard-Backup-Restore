import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || "/Fireguard/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large dependencies into separate chunks
          html2canvas: ["html2canvas"],
          emailjs: ["@emailjs/browser"],
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/database",
          ],
          // Split routes into lazy-loaded chunks
          dashboard: ["./src/pages/Dashboard.jsx"],
          logs: ["./src/pages/LogsPage.jsx"],
          analytics: ["./src/pages/AnalyticsPage.jsx"],
          users: ["./src/pages/UsersPage.jsx"],
          settings: ["./src/pages/SettingsPage.jsx"],
        },
      },
    },
    chunkSizeWarningLimit: 750, // Adjusted limit to account for Firebase + html2canvas
  },
});
