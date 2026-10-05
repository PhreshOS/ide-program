/** The two files of the app being written: its Server, which runs in Node.js, and its Client. */
export const files = ["server.ts", "client.tsx"] as const

export type File = typeof files[number]

export type Project = Readonly<Record<File, string>>

/** Either the app now running, or what the bundler reported, each line with its file. */
export type Outcome = Readonly<{ ran: true }> | Readonly<{ ran: false, errors: readonly string[] }>

/** Whether the app has a Process now. */
export type AppState = Readonly<{ running: boolean }>

/** The app the IDE builds, under this identity and name. */
export const app = { identity: "my-app", name: "My App" } as const

/** The one IDE Server every IDE window reaches by this name: it holds the project and runs the app. */
export const ideServer = { name: "ide", server: true, client: false } as const
