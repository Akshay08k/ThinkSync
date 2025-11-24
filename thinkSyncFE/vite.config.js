import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico"],
      manifest: {
        name: "My React App",
        short_name: "ReactApp",
        description: "A React Vite PWA app",
        theme_color: "#ffffff",
        icons: [
          {
            src: "icon192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
