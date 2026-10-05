import * as Comlink from "comlink"
import type { WorkerShape } from "@valtown/codemirror-ts/worker"
import type { Project } from "@shared/project"
import type { TypeScriptWorker } from "./typescript-worker"
import workerUrl from "./typescript-worker?worker&url"

/**
 * Starts TypeScript in a Worker for this window, with the declarations served beside the IDE's
 * Client. A Program's page has an opaque origin, which may not start a Worker from an address, so
 * the Worker's code is read and started from a Blob, which belongs to the page.
 */
export async function startTypeScript(project: Project): Promise<WorkerShape> {
    const [code, types] = await Promise.all([
        fetch(new URL(workerUrl, import.meta.url)).then(response => response.text()),
        fetch(new URL("./types.json", document.baseURI)).then(response => response.json() as Promise<Record<string, string>>)
    ])
    const address = URL.createObjectURL(new Blob([code], { type: "text/javascript" }))
    const worker = Comlink.wrap<TypeScriptWorker>(new Worker(address))
    URL.revokeObjectURL(address)
    await worker.load(types, project)
    await worker.initialize()
    return worker as unknown as WorkerShape
}
