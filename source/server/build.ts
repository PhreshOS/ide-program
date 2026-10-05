import { build, type BuildFailure, type BuildOptions } from "esbuild"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { Project } from "@shared/project"

// The libraries the app imports are the ones installed beside this Server.
const libraries = join(import.meta.dirname, "node_modules")

/**
 * Builds the app into one folder, as a Program's files: `server/main.js`, a Node.js worker, and
 * `client/`, a page. Returns what the bundler reported, or nothing when both built. A failed build
 * writes nothing, so the app that is running keeps its files.
 */
export default async function buildApp(project: Project, folder: string): Promise<readonly string[]> {
    const source = join(folder, "source")
    await mkdir(source, { recursive: true })
    await writeFile(join(source, "server.ts"), project["server.ts"])
    await writeFile(join(source, "client.tsx"), project["client.tsx"])
    await writeFile(join(source, "main.tsx"), entry)

    const shared: BuildOptions = { bundle: true, format: "esm", nodePaths: [libraries], logLevel: "silent", write: false }
    const results = await Promise.all([
        build({ ...shared, entryPoints: [join(source, "server.ts")], platform: "node", outfile: join(folder, "server", "main.js") }).catch(failed),
        build({ ...shared, entryPoints: [join(source, "main.tsx")], platform: "browser", jsx: "automatic", minify: true, define: { "process.env.NODE_ENV": "\"production\"" }, outfile: join(folder, "client", "main.js") }).catch(failed)
    ])

    const errors = results.flatMap(result => "problems" in result ? result.problems : [])
    if (errors.length) return errors

    await mkdir(join(folder, "server"), { recursive: true })
    await mkdir(join(folder, "client"), { recursive: true })
    await mkdir(join(folder, "storage"), { recursive: true })
    for (const result of results) if ("outputFiles" in result) for (const file of result.outputFiles ?? []) await writeFile(file.path, file.contents)
    await writeFile(join(folder, "server", "package.json"), JSON.stringify({ type: "module" }))
    await writeFile(join(folder, "client", "index.html"), page)
    return []
}

/** The bundler's errors, each with its file, line, and column. */
function failed(failure: BuildFailure) {
    if (!failure.errors) throw failure
    return { problems: failure.errors.map(error => error.location
        ? `${error.location.file.split("/").at(-1)} ${error.location.line}:${error.location.column}  ${error.text}`
        : error.text) }
}

/** The Client starts its App in the System's Appearance and the Desktop's preferences, as every Program does. */
const entry = `import client from "react-dom/client"
import { desktop, system } from "@phreshos/client"
import { DesktopProvider, SystemProvider, useDesktopPreferences, useSystemAppearance } from "@phreshos/react"
import { DocumentTheme, UIProvider } from "@phreshos/react-ui"
import App from "./client"

function Themed() {
    return <UIProvider appearance={useSystemAppearance()} preferences={useDesktopPreferences()}>
        <DocumentTheme />
        <App />
    </UIProvider>
}

client.createRoot(document.body).render(<SystemProvider system={system}>
    <DesktopProvider desktop={desktop}><Themed /></DesktopProvider>
</SystemProvider>)
`

const page = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
        :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        html, body { margin: 0; background: transparent; }
    </style>
    <script type="module" src="./main.js"></script>
</head>
<body></body>
</html>
`
