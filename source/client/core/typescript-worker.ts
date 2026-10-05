import * as Comlink from "comlink"
import ts from "typescript-service"
import { createSystem, createVirtualTypeScriptEnvironment } from "@typescript/vfs"
import { createWorker } from "@valtown/codemirror-ts/worker"
import { compilerOptions, paths } from "@shared/typescript"
import type { Project } from "@shared/project"

let provide!: (value: { types: Record<string, string>, project: Project }) => void
const loaded = new Promise<{ types: Record<string, string>, project: Project }>(resolve => { provide = resolve })

/**
 * TypeScript for the project's two files, away from the window: it completes, reports, and describes
 * the code as it is typed, from the declarations of every library the app may import.
 */
const worker = createWorker(async () => {
    const { types, project } = await loaded
    const files = new Map(Object.entries(types))
    files.set(paths["server.ts"], project["server.ts"])
    files.set(paths["client.tsx"], project["client.tsx"])
    // The environment runs on the TypeScript it is handed; its declarations name the package
    // "typescript", which to the checker is the native TypeScript that checks the IDE itself.
    const typescript = ts as unknown as Parameters<typeof createVirtualTypeScriptEnvironment>[2]
    return createVirtualTypeScriptEnvironment(createSystem(files), Object.values(paths), typescript, compilerOptions(ts) as Parameters<typeof createVirtualTypeScriptEnvironment>[3])
})

Comlink.expose({
    ...worker,
    /** The declarations, and the project as it was read; TypeScript starts once they are here. */
    load(types: Record<string, string>, project: Project) { provide({ types, project }) }
})

export type TypeScriptWorker = typeof worker & { load(types: Record<string, string>, project: Project): void }
