import { context } from "@phreshos/client"
import { parseRelativeValue, type Position, type Process, type Value } from "@phreshos/core"
import { ideServer, type AppState } from "@shared/project"

let shared: Promise<Process> | undefined

const stateFollowers = new Set<(state: AppState) => void>()

/** The one IDE Server every window uses; a window that finds it gone starts it again. */
function server() {
    shared ??= (async () => {
        const process = await (await context.program()).findOrCreateProcess(ideServer)
        await process.server.waitReady()
        process.server.subscribe("app.state", payload => { for (const follow of stateFollowers) follow(payload as AppState) })
        return process
    })().catch(error => { shared = undefined; throw error })
    return shared
}

/**
 * Asks the IDE Server; when its Process has ended since, starts it again and asks once more.
 * Building the app can take a moment, so it waits longer than usual.
 */
export async function ask<Result>(event: string, payload?: unknown): Promise<Result> {
    for (let attempt = 0; ; attempt++) {
        const process = await server()
        try {
            return await process.server.timeout(120_000).ask<Result>(event, payload)
        }
        catch (error) {
            const ended = await process.exited().catch(() => true)
            if (attempt > 0 || !ended) throw error
            shared = undefined
        }
    }
}

/** Follows the app's state as the IDE Server announces it. */
export function followAppState(follow: (state: AppState) => void) {
    stateFollowers.add(follow)
    void server().catch(() => undefined)
    return () => { stateFollowers.delete(follow) }
}
/** How far the app's window stands from the IDE's. */
const gap = 16

/**
 * The place just right of this window, for the app's window: its left edge one gap past this
 * window's right edge, its top level with this window's. Positions and sizes may be in pixels or
 * in views, such as "50% - 200"; each part adds to its own kind.
 */
export async function besideThisWindow(): Promise<Position | null> {
    const [position, size] = await Promise.all([context.window.position(), context.window.size()])
    const x = sum(position.x, size.width, gap)
    return x === null ? null : { x, y: position.y }
}

function sum(...values: Value[]): Value | null {
    let relative = 0, pixels = 0
    for (const value of values) {
        const parsed = parseRelativeValue(value)
        if (!parsed) return null
        relative += parsed.relative
        pixels += parsed.pixels
    }
    if (relative === 0) return pixels
    const share = `${relative * 100}%`
    return pixels === 0 ? share : `${share} ${pixels < 0 ? "-" : "+"} ${Math.abs(pixels)}`
}
