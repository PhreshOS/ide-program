import { Alert, Button, SegmentedControl, Surface, Text } from "@phreshos/react-ui"
import { Play, RotateCw, Square } from "@phreshos/react-ui/icons"
import { useEffect, useRef, useState } from "react"
import { app, files, type AppState, type File, type Outcome, type Project } from "@shared/project"
import { ask, besideThisWindow, followAppState } from "@client/core/ide-server"
import { startTypeScript } from "@client/core/typescript"
import { paths } from "@shared/typescript"
import type { WorkerShape } from "@valtown/codemirror-ts/worker"
import { useFirstArrival } from "./readiness"
import Editor from "./editor"
import FileIcon from "./file-icon"

/** How long typing rests before a file is saved. */
const saveDelay = 400

/**
 * The project's two files, and the app's lifecycle: Start builds it and opens it beside this window,
 * Restart builds it again in its place, and Stop ends it. What the bundler reports shows below.
 */
export default function IDE() {
    const [project, setProject] = useState<Project | null>(null)
    const [state, setState] = useState<AppState | null>(null)
    const [file, setFile] = useState<File>("client.tsx")
    const [busy, setBusy] = useState(false)
    const [errors, setErrors] = useState<readonly string[]>([])
    const [typescript, setTypescript] = useState<WorkerShape | null>(null)
    const texts = useRef<Partial<Record<File, string>>>({})
    const pending = useRef<Partial<Record<File, ReturnType<typeof setTimeout>>>>({})

    useEffect(() => {
        const stop = followAppState(setState)
        void ask<Project>("project.read").then(setProject)
        void ask<AppState>("app.state").then(setState)
        return stop
    }, [])

    useFirstArrival(project !== null && state !== null)

    // Everything is saved as it is typed, so the save keys do nothing, rather than the browser's
    // own save of the page.
    useEffect(() => {
        const ignoreSave = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") event.preventDefault() }
        document.addEventListener("keydown", ignoreSave)
        return () => document.removeEventListener("keydown", ignoreSave)
    }, [])

    // TypeScript starts once the project is here, and joins the editors when it is ready; the
    // window does not wait for it.
    const started = project !== null
    useEffect(() => {
        if (!project) return
        let current = true
        void startTypeScript(project).then(worker => { if (current) setTypescript(() => worker) }).catch(() => undefined)
        return () => { current = false }
        // Only the project as first read: what is typed afterwards reaches TypeScript from the editors.
    }, [started])

    function edit(file: File, text: string) {
        texts.current[file] = text
        clearTimeout(pending.current[file])
        pending.current[file] = setTimeout(() => void save(file), saveDelay)
    }

    async function save(file: File) {
        clearTimeout(pending.current[file])
        delete pending.current[file]
        const text = texts.current[file]
        if (text !== undefined) await ask("project.save", { file, text })
    }

    async function start() {
        setBusy(true)
        try {
            await Promise.all(files.map(save))
            const beside = await besideThisWindow().catch(() => null)
            const outcome = await ask<Outcome>("app.start", beside ? { beside } : {})
            setErrors(outcome.ran ? [] : outcome.errors)
        }
        catch (error) { setErrors([error instanceof Error ? error.message : String(error)]) }
        finally { setBusy(false) }
    }

    async function stop() {
        setBusy(true)
        try { await ask("app.stop"); setErrors([]) }
        catch (error) { setErrors([error instanceof Error ? error.message : String(error)]) }
        finally { setBusy(false) }
    }

    if (!project || !state) return null

    return <div className="ide">
        <div className="ide-bar">
            <SegmentedControl aria-label="File" size="small" value={file} onChange={value => setFile(value as File)}>
                {files.map(name => <SegmentedControl.Item key={name} id={name}><FileIcon file={name} /> {name}</SegmentedControl.Item>)}
            </SegmentedControl>
            <Text size="small" tone="secondary" className="ide-status">{app.name} · {state.running ? "running" : "stopped"}</Text>
            {state.running
                ? <>
                    <Button size="small" pending={busy} onPress={() => void start()}><RotateCw /> Restart</Button>
                    <Button size="small" disabled={busy} onPress={() => void stop()}><Square /> Stop</Button>
                </>
                : <Button size="small" color="primary" pending={busy} onPress={() => void start()}><Play /> Start</Button>}
        </div>
        <Surface depth="recessed" className="ide-files">
            {files.map(name => <Editor key={name} path={paths[name]} text={project[name]} hidden={name !== file} typescript={typescript} onChange={text => edit(name, text)} />)}
        </Surface>
        {errors.length > 0 && <Alert color="danger" title="The app did not build" className="ide-errors">
            <div className="ide-error-lines">{errors.join("\n")}</div>
        </Alert>}
    </div>
}
