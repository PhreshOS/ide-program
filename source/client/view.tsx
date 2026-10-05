import { context, desktop, system } from "@phreshos/client"
import { DesktopProvider, SystemProvider, useDesktopPreferences, useSystemAppearance } from "@phreshos/react"
import { Button, Code, DocumentTheme, Flex, Input, Text, Textarea, UIProvider } from "@phreshos/react-ui"
import { useState } from "react"

type Outcome = Readonly<{ ran: true, identity: string }> | Readonly<{ ran: false, errors: string[] }>

const sample = `import { Button, Flex, Heading } from "@phreshos/react-ui"
import { useState } from "react"

export default function App() {
    const [count, setCount] = useState(0)
    return <Flex direction="column" align="center" justify="center" gap={16} style={{ height: "100vh" }}>
        <Heading>{count}</Heading>
        <Button color="primary" onPress={() => setCount(count + 1)}>Add one</Button>
    </Flex>
}
`

export default function View() {
    return <SystemProvider system={system}>
        <DesktopProvider desktop={desktop}>
            <Themed />
        </DesktopProvider>
    </SystemProvider>
}

function Themed() {
    return <UIProvider appearance={useSystemAppearance()} preferences={useDesktopPreferences()}>
        <DocumentTheme />
        <Editor />
    </UIProvider>
}

/** One Program's name and code, and Start: it is built and runs in the System. */
function Editor() {
    const [name, setName] = useState("Counter")
    const [source, setSource] = useState(sample)
    const [running, setRunning] = useState(false)
    const [outcome, setOutcome] = useState<Outcome | null>(null)

    async function start() {
        setRunning(true)
        try { setOutcome(await context.server.timeout(120_000).ask<Outcome>("run", { name, source })) }
        catch (error) { setOutcome({ ran: false, errors: [error instanceof Error ? error.message : String(error)] }) }
        finally { setRunning(false) }
    }

    return <Flex direction="column" gap={12} style={{ height: "100vh", padding: 16, boxSizing: "border-box" }}>
        <Flex gap={8} align="end">
            <Input label="Name" value={name} onChange={setName} style={{ flex: 1 }} />
            <Button color="primary" pending={running} onPress={() => void start()}>Start</Button>
        </Flex>
        <Textarea aria-label="Code" value={source} onChange={setSource} rows={18} style={{ flex: 1 }} />
        {outcome && (outcome.ran
            ? <Text>{outcome.identity} is running.</Text>
            : <Code style={{ whiteSpace: "pre-wrap" }}>{outcome.errors.join("\n")}</Code>)}
    </Flex>
}
