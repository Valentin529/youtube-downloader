import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import VueRouter from "unplugin-vue-router/vite";
import AutoImport from "unplugin-auto-import/vite";
import { VueRouterAutoImports } from "unplugin-vue-router";

import Components from "unplugin-vue-components/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    VueRouter({
      routesFolder: "src/ui/pages",
      watch: false,
    }),
    Components({
      /* options */
      dirs: ["./src/ui/components/**"],
    }),
    AutoImport({
      include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/, /\.md$/],
      imports: [
        "vue",
        VueRouterAutoImports,
        {
          pinia: ["defineStore", "storeToRefs", "acceptHMRUpdate"],
        },
        {
          "vue-meta": ["useMeta"],
        },
      ],
      dts: "./src/auto-imports.d.ts",
      viteOptimizeDeps: true,
      dirs: ["./src/ui/stores/**", "./src/ui/composables/**"],
    }),
    vue(),
  ],
  build: {
    outDir: "dist-vue",
  },
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
