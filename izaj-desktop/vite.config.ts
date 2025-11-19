import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  
  define: {
    'process.env': '{}',
    global: 'globalThis',
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,

  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 3000,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 3000,
          strictPort: true
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // 4. Add PostCSS config
  css: {
    postcss: './postcss.config.mjs',
  },

  // 5. Optimize bundle size with manual chunking
  build: {
    // Increase chunk size warning limit to 1000 KB (1 MB)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['antd', '@iconify/react', 'lucide-react'],
          'chart-vendor': ['echarts', 'echarts-for-react'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'dnd-vendor': ['react-beautiful-dnd'],
          'tauri-vendor': ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-deep-link'],
        },
      },
    },
  },
}));
