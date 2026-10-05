import ts from "typescript-service"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { compilerOptions, libraries } from "@shared/typescript"

/**
 * The declarations a written app reaches, and nothing else: TypeScript follows the imports of every
 * library the app may use and of Node.js, and only the files it reads are kept, with each package's
 * package.json so its exports resolve. They become one file beside the Client.
 */
export default function writeTypes(outfile: string) {
    const modules = resolve("node_modules")
    // Inside the project, so its imports resolve from the project's node_modules.
    const folder = mkdtempSync(resolve("dist", ".types-"))
    try {
        const entry = join(folder, "entry.ts")
        writeFileSync(entry, libraries.map(name => `import "${name}"`).join("\n"))
        const options = { ...compilerOptions(ts), typeRoots: [join(modules, "@types")] }
        const program = ts.createProgram([entry], options, ts.createCompilerHost(options))

        const unresolved = ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
        if (unresolved.length) throw new Error(`The types of the app's libraries did not resolve:\n${unresolved.join("\n")}`)

        const files: Record<string, string> = {}
        for (const file of program.getSourceFiles()) {
            if (file.fileName === entry) continue
            if (file.fileName.includes("/node_modules/typescript-service/lib/")) files[`/${basename(file.fileName)}`] = file.text
            else files[`/node_modules/${file.fileName.split("/node_modules/").pop()}`] = file.text
        }
        for (const path of Object.keys(files)) {
            if (!path.startsWith("/node_modules/")) continue
            const parts = path.slice("/node_modules/".length).split("/")
            const name = parts[0]!.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!
            const manifest = join(modules, name, "package.json")
            if (existsSync(manifest)) files[`/node_modules/${name}/package.json`] = readFileSync(manifest, "utf8")
        }
        writeFileSync(outfile, JSON.stringify(files))
    }
    finally { rmSync(folder, { recursive: true, force: true }) }
}
