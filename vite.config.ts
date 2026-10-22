import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Server-side only: the pipeline key is read from the dev/preview host's environment and
// injected into proxied requests. It is never exposed to the browser bundle (no VITE_ prefix).
// The key is a regex: a plain "/pipeline" prefix would also swallow the SPA route "/pipelines".
const pipelineProxy = {
  "^/pipeline/": {
    target: process.env.PIPELINE_PROXY_TARGET ?? "http://localhost:8011",
    changeOrigin: true,
    headers: process.env.PIPELINE_API_KEY ? { "X-API-Key": process.env.PIPELINE_API_KEY } : undefined,
    rewrite: (requestPath: string) => requestPath.replace(/^\/pipeline/, ""),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    proxy: pipelineProxy,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      ...pipelineProxy,
      // Must precede "/poseidon": Vite matches proxy keys by prefix in declaration order.
      "/poseidon-auth": {
        target: "http://localhost:8001",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/poseidon-auth/, ""),
      },
      "/poseidon": {
        target: "http://localhost:8001",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/poseidon/, ""),
      },
      "/triton": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/triton/, ""),
      },
      "/thalassa": {
        target: "http://192.168.31.241:8001",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/thalassa/, ""),
      },
    },
  },
});
