import { defineConfig } from "@phreshos/core"

export default defineConfig({
  identity: "ide",
  name: "IDE",
  description: "Write a Program and run it in the System at once.",
  version: "0.0.1",
  categories: ["Development"],
  buildCommand: "vite-node scripts/build.ts",
  // Creating and replacing the Programs it builds is the System-wide power `all`.
  permissions: { all: true },
  server: {
    location: "dist/server",
    worker: "main.js",
    // The bundler, and the libraries a built Program imports, are installed beside the Server.
    installCommand: "npm install --omit=dev --no-audit"
  },
  client: {
    location: "dist/client",
    title: "IDE",
    size: { width: 900, height: 620 }
  }
})
