import { context, system } from "@phreshos/server"
import type { Launch, Position, Process, Program, Size } from "@phreshos/core"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { app, files, type AppState, type File, type Outcome, type Project } from "@shared/project"
import buildApp from "./build"
import { template } from "./templates"

const program = await context.program()
const data = await program.data.path()
const projectFolder = join(data, "project")
const appFolder = join(data, "app")

await mkdir(projectFolder, { recursive: true })
for (const file of files) await writeFile(join(projectFolder, file), template[file], { flag: "wx" }).catch(() => undefined)

/*
 * This is the one IDE Server, shared by every IDE window, and the app lives within it: the app runs
 * as long as this Server runs it, and this Server runs as long as an IDE window is open. The System
 * holds the app to that, ending it with this Server however this Server ends.
 */
const self = await context.process()

// An app left running without this Server, from an earlier IDE, ends.
for (const process of await (await system.program.find(app.identity))?.processes() ?? []) await process.exit()

// The app's run, and its Process once started: leaving the run ends the app. What this Server knows
// of the app comes from the run itself, never from asking about a Program that may have been replaced.
let run: AbortController | null = null
let running: Process | null = null

// The windows are this Program's other Processes; once the last one has closed, the IDE ends.
program.subscribe("processExit", () => void endWithoutWindows())
await endWithoutWindows()

context.answer("project.read", () => read())

context.answer("project.save", async ({ payload }) => {
    const { file, text } = payload as { file: File, text: string }
    if (!files.includes(file)) throw new Error(`The project has no file ${file}`)
    await writeFile(join(projectFolder, file), text)
})

context.answer("app.state", () => state())

/**
 * Builds the app and runs it: created in the System from its files, with one Process that belongs
 * to this Server. Starting it while it runs restarts it: the earlier app ends first, and its window
 * keeps its place.
 */
context.answer("app.start", async ({ payload }): Promise<Outcome> => {
    const { beside } = (payload ?? {}) as { beside?: Position }
    const errors = await buildApp(await read(), appFolder)
    if (errors.length) return { ran: false, errors }

    const place = await currentPlace() ?? (beside ? { position: beside } : {})

    // The earlier run is let go first, so its ending, as it is replaced, does not read as a stop.
    run = null
    try {
        const built = await system.program.forceCreate({
            identity: app.identity,
            name: app.name,
            storage: join(appFolder, "storage"),
            server: { location: join(appFolder, "server"), worker: "main.js" },
            client: { location: join(appFolder, "client"), title: app.name, size: { width: 420, height: 380 } }
        })
        await runApp(built, { client: place })
    }
    catch (error) {
        running = null
        announce()
        throw error
    }
    return { ran: true }
})

context.answer("app.stop", () => { run?.abort() })

/** Runs the app until its run is left, its window is closed, or this Server ends; resolves once it has started. */
function runApp(app: Program, launch: Launch) {
    const current = new AbortController()
    run = current
    return new Promise<void>((started, failed) => void (async () => {
        try {
            for await (const event of app.runProcess(launch, { signal: current.signal })) {
                if (event.event !== "started" || run !== current) continue
                running = event.process
                announce()
                started()
            }
        }
        catch (error) { failed(error) }
        finally {
            // A restart's earlier run ends after the new one began; only the current run's end stops the app.
            if (run === current) {
                run = null
                running = null
                announce()
            }
            started()
        }
    })())
}

/** Ends the IDE once no window of it is open. */
async function endWithoutWindows() {
    const windows = (await program.processes()).filter(process => process.identity !== self.identity)
    if (!windows.length) await self.exit()
}

async function read(): Promise<Project> {
    return Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(join(projectFolder, file), "utf8")]))) as Project
}

function state(): AppState {
    return { running: running !== null }
}

/** Tells every IDE window whether the app runs now. */
function announce() {
    void context.publish("app.state", state())
}

/** Where the running app's window stands, and its size, so a restarted app opens in the same place. */
async function currentPlace(): Promise<{ position: Position, size: Size } | null> {
    if (!running) return null
    const window = running.client.window
    return await Promise.all([window.position(), window.size()]).then(([position, size]) => ({ position, size })).catch(() => null)
}
