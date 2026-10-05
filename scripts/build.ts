import { readFile, rm, writeFile } from "node:fs/promises"
import writeTypes from "./types"

process.env.NODE_ENV = "production"

const { build } = await import("vite")

await rm("dist", { recursive: true, force: true })

// The bundler, and every library the app may import, are installed beside the Server, at exactly the
// versions here, so the app is built with the same libraries whose types the IDE knows.
const installed = ["esbuild", "react", "react-dom", "@phreshos/server", "@phreshos/client", "@phreshos/react", "@phreshos/react-ui"]
const dependencies = Object.fromEntries(await Promise.all(installed.map(async name =>
    [name, JSON.parse(await readFile(`node_modules/${name}/package.json`, "utf8")).version as string])))

await build({ configFile: "vite.config.ts", ssr: { external: ["esbuild"], noExternal: true } })
await build({ configFile: "vite.client.ts" })
await writeFile("dist/server/package.json", JSON.stringify({ type: "module", dependencies }))
writeTypes("dist/client/types.json")
