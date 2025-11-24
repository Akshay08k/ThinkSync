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
        name: "Thinksync",
        short_name: "Thinksync",
        description:
          "A Platform for Syncing Thoughts, Amplifying Ideas, and Transforming the Future.",
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
