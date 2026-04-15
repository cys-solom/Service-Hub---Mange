// vite.config.js
import { defineConfig } from "file:///D:/New%20folder%20(4)/node_modules/vite/dist/node/index.js";
import react from "file:///D:/New%20folder%20(4)/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import viteCompression from "file:///D:/New%20folder%20(4)/node_modules/vite-plugin-compression/dist/index.mjs";
import { visualizer } from "file:///D:/New%20folder%20(4)/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "D:\\New folder (4)";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: "brotliCompress",
      // الأفضل (Brotli)
      ext: ".br",
      deleteOriginFile: false
      // يخلي الملف الأصلي موجود كمان
    }),
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      deleteOriginFile: false
    }),
    visualizer({ open: false, filename: "stats.html" })
  ],
  base: "/",
  build: {
    target: "esnext",
    minify: "esbuild",
    // ضغط JS & CSS (مدمج مع Vite)
    cssCodeSplit: true,
    // يعمل Code Splitting للـ CSS
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          // يفصل React في ملف لوحده
          vendor: ["swiper", "lucide-react"]
          // يفصل المكتبات التقيلة
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxOZXcgZm9sZGVyICg0KVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcTmV3IGZvbGRlciAoNClcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L05ldyUyMGZvbGRlciUyMCg0KS92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnXHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXHJcbmltcG9ydCB2aXRlQ29tcHJlc3Npb24gZnJvbSAndml0ZS1wbHVnaW4tY29tcHJlc3Npb24nIC8vIFx1MDYzNlx1MDYzQVx1MDYzNyBHemlwL0Jyb3RsaVxyXG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJyAvLyBcdTA2NDRcdTA2MkFcdTA2MkRcdTA2NDRcdTA2NEFcdTA2NDQgXHUwNjJEXHUwNjJDXHUwNjQ1IFx1MDYyN1x1MDY0NFx1MDYyOFx1MDYyN1x1MDY0Nlx1MDYyRlx1MDY0NFxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgICByZWFjdCgpLFxyXG4gICAgICAgIHZpdGVDb21wcmVzc2lvbih7XHJcbiAgICAgICAgICAgIGFsZ29yaXRobTogJ2Jyb3RsaUNvbXByZXNzJywgLy8gXHUwNjI3XHUwNjQ0XHUwNjIzXHUwNjQxXHUwNjM2XHUwNjQ0IChCcm90bGkpXHJcbiAgICAgICAgICAgIGV4dDogJy5icicsXHJcbiAgICAgICAgICAgIGRlbGV0ZU9yaWdpbkZpbGU6IGZhbHNlLCAvLyBcdTA2NEFcdTA2MkVcdTA2NDRcdTA2NEEgXHUwNjI3XHUwNjQ0XHUwNjQ1XHUwNjQ0XHUwNjQxIFx1MDYyN1x1MDY0NFx1MDYyM1x1MDYzNVx1MDY0NFx1MDY0QSBcdTA2NDVcdTA2NDhcdTA2MkNcdTA2NDhcdTA2MkYgXHUwNjQzXHUwNjQ1XHUwNjI3XHUwNjQ2XHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdml0ZUNvbXByZXNzaW9uKHtcclxuICAgICAgICAgICAgYWxnb3JpdGhtOiAnZ3ppcCcsXHJcbiAgICAgICAgICAgIGV4dDogJy5neicsXHJcbiAgICAgICAgICAgIGRlbGV0ZU9yaWdpbkZpbGU6IGZhbHNlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIHZpc3VhbGl6ZXIoeyBvcGVuOiBmYWxzZSwgZmlsZW5hbWU6ICdzdGF0cy5odG1sJyB9KVxyXG4gICAgXSxcclxuICAgIGJhc2U6ICcvJyxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnZXNuZXh0JyxcclxuICAgICAgICBtaW5pZnk6ICdlc2J1aWxkJywgLy8gXHUwNjM2XHUwNjNBXHUwNjM3IEpTICYgQ1NTIChcdTA2NDVcdTA2MkZcdTA2NDVcdTA2MkMgXHUwNjQ1XHUwNjM5IFZpdGUpXHJcbiAgICAgICAgY3NzQ29kZVNwbGl0OiB0cnVlLCAvLyBcdTA2NEFcdTA2MzlcdTA2NDVcdTA2NDQgQ29kZSBTcGxpdHRpbmcgXHUwNjQ0XHUwNjQ0XHUwNjQwIENTU1xyXG4gICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgICAgICAgICAgICByZWFjdDogWydyZWFjdCcsICdyZWFjdC1kb20nXSwgLy8gXHUwNjRBXHUwNjQxXHUwNjM1XHUwNjQ0IFJlYWN0IFx1MDY0MVx1MDY0QSBcdTA2NDVcdTA2NDRcdTA2NDEgXHUwNjQ0XHUwNjQ4XHUwNjJEXHUwNjJGXHUwNjQ3XHJcbiAgICAgICAgICAgICAgICAgICAgdmVuZG9yOiBbJ3N3aXBlcicsICdsdWNpZGUtcmVhY3QnXSwgLy8gXHUwNjRBXHUwNjQxXHUwNjM1XHUwNjQ0IFx1MDYyN1x1MDY0NFx1MDY0NVx1MDY0M1x1MDYyQVx1MDYyOFx1MDYyN1x1MDYyQSBcdTA2MjdcdTA2NDRcdTA2MkFcdTA2NDJcdTA2NEFcdTA2NDRcdTA2MjlcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgIH0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgICAgYWxpYXM6IHtcclxuICAgICAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGV4dGVuc2lvbnM6IFsnLm1qcycsICcuanMnLCAnLnRzJywgJy5qc3gnLCAnLnRzeCcsICcuanNvbiddLFxyXG4gICAgfSxcclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2TyxTQUFTLG9CQUFvQjtBQUMxUSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8scUJBQXFCO0FBQzVCLFNBQVMsa0JBQWtCO0FBSjNCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVM7QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGdCQUFnQjtBQUFBLE1BQ1osV0FBVztBQUFBO0FBQUEsTUFDWCxLQUFLO0FBQUEsTUFDTCxrQkFBa0I7QUFBQTtBQUFBLElBQ3RCLENBQUM7QUFBQSxJQUNELGdCQUFnQjtBQUFBLE1BQ1osV0FBVztBQUFBLE1BQ1gsS0FBSztBQUFBLE1BQ0wsa0JBQWtCO0FBQUEsSUFDdEIsQ0FBQztBQUFBLElBQ0QsV0FBVyxFQUFFLE1BQU0sT0FBTyxVQUFVLGFBQWEsQ0FBQztBQUFBLEVBQ3REO0FBQUEsRUFDQSxNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsSUFDSCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUE7QUFBQSxJQUNSLGNBQWM7QUFBQTtBQUFBLElBQ2QsZUFBZTtBQUFBLE1BQ1gsUUFBUTtBQUFBLFFBQ0osY0FBYztBQUFBLFVBQ1YsT0FBTyxDQUFDLFNBQVMsV0FBVztBQUFBO0FBQUEsVUFDNUIsUUFBUSxDQUFDLFVBQVUsY0FBYztBQUFBO0FBQUEsUUFDckM7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLE9BQU87QUFBQSxNQUNILEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN4QztBQUFBLElBQ0EsWUFBWSxDQUFDLFFBQVEsT0FBTyxPQUFPLFFBQVEsUUFBUSxPQUFPO0FBQUEsRUFDOUQ7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
