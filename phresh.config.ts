import { defineConfig } from "@phreshos/core"

export default defineConfig({
  identity: "ide",
  name: "IDE",
  description: "Write a PhreshOS app, its Server and its Client, and run it beside the IDE.",
  version: "0.0.1",
  categories: ["Development"],
  buildCommand: "vite-node scripts/build.ts",
  // Creating the app is the System-wide power `all`: a definition grants the app what it declares.
  permissions: { all: true },
  // One Server holds the project and runs the app, in the Process named "ide"; windows are Clients that reach it.
  server: {
    location: "dist/server",
    start: false,
    worker: "main.js",
    // The bundler, and the libraries a built Program imports, are installed beside the Server.
    installCommand: "npm install --omit=dev --no-audit"
  },
  client: {
    location: "dist/client",
    title: "IDE",
    size: { width: 760, height: 560 }
  }
})
