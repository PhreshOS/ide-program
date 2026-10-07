import type { Project } from "@shared/project"

/** The app a new project starts from: a Server that reads the machine with Node.js, and a Client that shows it. */
export const template: Project = {
    "server.ts": `import { context } from "@phreshos/server"
import os from "node:os"

// The Server runs in Node.js, so it can read the machine it runs on.
context.answer("machine", () => ({
    hostname: os.hostname(),
    system: \`\${os.type()} \${os.release()}\`,
    processors: os.cpus().length,
    memory: \`\${Math.round(os.totalmem() / 2 ** 30)} GB\`,
    uptime: \`\${Math.round(os.uptime() / 3600)} hours\`
}))
`,
    "client.tsx": `import { context } from "@phreshos/client"
import { Flex, Heading, Text } from "@phreshos/react-ui"
import { useEffect, useState } from "react"

type Machine = Record<string, string | number>

// The Client asks its Server, and shows the answer.
export default function App() {

    const [machine, setMachine] = useState<Machine | null>(null)

    useEffect(() => {

        context.server.ask<Machine>("machine").then(setMachine)
    }, [])

    return <Flex direction="column" gap={12} style={{ padding: 20 }}>
        <Heading>This machine</Heading>
        {machine && Object.entries(machine).map(([name, value]) =>
            <Text key={name}>{name}: {value}</Text>)}
    </Flex>
}
`
}
