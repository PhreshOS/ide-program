import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import { defineConfig } from "vite"
import { resolve } from "node:path"

export default defineConfig({
    root: "source/client",
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    base: process.env.PHRESHOS_CLIENT_BASE ?? "./",
    resolve: {
        tsconfigPaths: true,
        // Linked SDKs must consume the Program's renderer instance.
        dedupe: ["react", "react-dom"],
        // In the browser, "typescript" is the TypeScript that runs in JavaScript: the editor's
        // TypeScript libraries import it by that name, while the IDE itself is checked by the native one.
        alias: { typescript: "typescript-service" }
    },
    server: {
        // The address `phresh dev` chose, so it and the System reach this server.
        host: process.env.PHRESHOS_CLIENT_HOST,
        port: Number(process.env.PHRESHOS_CLIENT_PORT ?? "5200"),
        strictPort: true
    },
    build: {
        emptyOutDir: true,
        outDir: resolve(import.meta.dirname, "dist/client"),
        chunkSizeWarningLimit: 700
    }
})
