import { defineConfig } from "@phreshos/core"

export default defineConfig({
  identity: "ide",
  name: "IDE",
  description: "A small demonstration: write a two-file PhreshOS app and run it beside the editor.",
  version: "0.3.0",
  // Drawn from icon.svg: an apricot frame, and on its dark soil a code tag whose slash is a sprout.
  icon: "icon.png",
  categories: ["Development"],
  keywords: ["ide", "editor", "code", "typescript", "react"],
  website: "https://github.com/PhreshOS/ide-program",
  agent: "agent.md",
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
