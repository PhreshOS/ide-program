import packageConfig from "@/package.json"
import { rm, writeFile } from "node:fs/promises"

process.env.NODE_ENV = "production"

const { build } = await import("vite")

await rm("dist", { recursive: true, force: true })

// The bundler, and every library the app may import, its Server's and its Client's, are installed beside the Server.
const installed = ["esbuild", "react", "react-dom", "@phreshos/server", "@phreshos/client", "@phreshos/react", "@phreshos/react-ui"] as const
const dependencies = Object.fromEntries(installed.map(name => [name, packageConfig.dependencies[name]]))

await build({ configFile: "vite.config.ts", ssr: { external: ["esbuild"], noExternal: true } })
await build({ configFile: "vite.client.ts" })
await writeFile("dist/server/package.json", JSON.stringify({ type: "module", dependencies }))
