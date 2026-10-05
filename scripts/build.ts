import packageConfig from "@/package.json"
import { rm, writeFile } from "node:fs/promises"

process.env.NODE_ENV = "production"

const { build } = await import("vite")

await rm("dist", { recursive: true, force: true })

// The bundler, and every library a built Program may import, are installed beside the Server.
const { esbuild, react, "react-dom": reactDom, "@phreshos/client": client, "@phreshos/react": phreshReact, "@phreshos/react-ui": reactUi } = packageConfig.dependencies
const dependencies = { esbuild, react, "react-dom": reactDom, "@phreshos/client": client, "@phreshos/react": phreshReact, "@phreshos/react-ui": reactUi }

await build({ configFile: "vite.config.ts", ssr: { external: ["esbuild"], noExternal: true } })
await build({ configFile: "vite.client.ts" })
await writeFile("dist/server/package.json", JSON.stringify({ type: "module", dependencies }))
