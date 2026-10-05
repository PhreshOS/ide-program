import { context, system } from "@phreshos/server"
import { build } from "esbuild"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

/** What the Client sends to run: the built Program's name, and its code. */
type Run = Readonly<{ name: string, source: string }>

/** Either the built Program now running, or what the bundler reported. */
type Outcome = Readonly<{ ran: true, identity: string }> | Readonly<{ ran: false, errors: string[] }>

const program = await context.program()

// The libraries a built Program imports are the ones installed beside this Server.
const libraries = join(import.meta.dirname, "node_modules")

/**
 * Builds one Program from its code and runs it: its files are written into this Program's data,
 * created in the System under its own identity, and one Process starts. Running it again replaces
 * the earlier one, whose Processes end first.
 */
context.answer("run", async ({ payload }): Promise<Outcome> => {
    const { name, source } = payload as Run
    const identity = identityOf(name)
    const folder = join(await program.data.path(), "programs", identity)
    const client = join(folder, "client")

    // Nothing is removed first: a failed build writes nothing, so the running Program keeps its files.
    await mkdir(join(folder, "source"), { recursive: true })
    await mkdir(join(folder, "storage"), { recursive: true })
    await writeFile(join(folder, "source", "app.tsx"), source)
    await writeFile(join(folder, "source", "main.tsx"), entry)

    const result = await build({
        entryPoints: [join(folder, "source", "main.tsx")],
        outfile: join(client, "main.js"),
        bundle: true,
        format: "esm",
        jsx: "automatic",
        minify: true,
        nodePaths: [libraries],
        define: { "process.env.NODE_ENV": "\"production\"" },
        logLevel: "silent"
    }).catch((error: { errors?: { text: string, location?: { line: number, column: number } | null }[] }) => error)

    if ("errors" in result && result.errors?.length) {
        return { ran: false, errors: result.errors.map(error => error.location ? `${error.location.line}:${error.location.column} ${error.text}` : error.text) }
    }

    await writeFile(join(client, "index.html"), page(name))

    const built = await system.program.forceCreate({
        identity,
        name,
        storage: join(folder, "storage"),
        client: { location: client, title: name, size: { width: 480, height: 360 } }
    })

    await built.createProcess()

    return { ran: true, identity }
})

/** A Program identity from its name: kebab-case, so "My Counter" is "my-counter". */
function identityOf(name: string) {
    const identity = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    if (!identity) throw new Error("The Program needs a name with letters or digits")
    return identity
}

/** Every built Program starts the same way: its App, in the System's Appearance and the Desktop's preferences. */
const entry = `import client from "react-dom/client"
import { desktop, system } from "@phreshos/client"
import { DesktopProvider, SystemProvider, useDesktopPreferences, useSystemAppearance } from "@phreshos/react"
import { DocumentTheme, UIProvider } from "@phreshos/react-ui"
import App from "./app"

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

function page(name: string) {
    const title = name.replace(/[<&]/g, character => character === "<" ? "&lt;" : "&amp;")
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script type="module" src="./main.js"></script>
</head>
<body></body>
</html>
`
}
