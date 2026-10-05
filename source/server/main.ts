import { context, system } from "@phreshos/server"
import type { Position, Program, Size } from "@phreshos/core"
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

// This is the one IDE Server, shared by every IDE window. It holds the app as the System has it, and
// announces its state whenever one of its Processes starts or ends, such as when its window is closed.
let built: Program | null = await system.program.find(app.identity)
let stopFollowing = follow(built)

context.answer("project.read", () => read())

context.answer("project.save", async ({ payload }) => {
    const { file, text } = payload as { file: File, text: string }
    if (!files.includes(file)) throw new Error(`The project has no file ${file}`)
    await writeFile(join(projectFolder, file), text)
})

context.answer("app.state", async () => await state())

/**
 * Builds the app and runs it: created in the System from its files, with one Process. Starting it
 * while it runs restarts it: the earlier app's Processes end first, and its window keeps its place.
 */
context.answer("app.start", async ({ payload }): Promise<Outcome> => {
    const { beside } = (payload ?? {}) as { beside?: Position }
    const errors = await buildApp(await read(), appFolder)
    if (errors.length) return { ran: false, errors }

    const place = await currentPlace() ?? (beside ? { position: beside } : {})

    built = await system.program.forceCreate({
        identity: app.identity,
        name: app.name,
        storage: join(appFolder, "storage"),
        server: { location: join(appFolder, "server"), worker: "main.js" },
        client: { location: join(appFolder, "client"), title: app.name, size: { width: 420, height: 380 } }
    })
    stopFollowing()
    stopFollowing = follow(built)
    await built.createProcess({ client: place })
    return { ran: true }
})

context.answer("app.stop", async () => {
    for (const process of await processes()) await process.exit()
})

async function read(): Promise<Project> {
    return Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(join(projectFolder, file), "utf8")]))) as Project
}

/** The app's Processes now, or none while the System has no app. */
async function processes() {
    return await built?.processes() ?? []
}

async function state(): Promise<AppState> {
    return { running: (await processes()).length > 0 }
}

/** Announces the app's state each time one of its Processes starts or ends. */
function follow(current: Program | null) {
    if (!current) return () => undefined
    const announce = () => void state().then(value => context.publish("app.state", value))
    const stopCreate = current.subscribe("processCreate", announce)
    const stopExit = current.subscribe("processExit", announce)
    return () => { stopCreate(); stopExit() }
}

/** Where the running app's window stands, and its size, so a restarted app opens in the same place. */
async function currentPlace(): Promise<{ position: Position, size: Size } | null> {
    const [process] = await processes()
    if (!process) return null
    const window = process.client.window
    return await Promise.all([window.position(), window.size()]).then(([position, size]) => ({ position, size })).catch(() => null)
}
