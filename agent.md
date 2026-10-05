# IDE

The IDE holds one app of two files, `server.ts` (a Node.js worker Server) and
`client.tsx` (a React Client that default-exports `App`), and runs it in the
System as the Program `my-app`, "My App".

Everything lives in one Server: the Process named `ide`, Server only. IDE
windows are Client-only Processes that reach it. It ends once no IDE window is
open, and the app ends with it.

Reach it with:

```sh
phresh endpoint ask --program ide --process ide --endpoint server --event project.read --json
```

## Write and run the app

1. `project.read` returns `{ "server.ts": text, "client.tsx": text }`.
2. `project.save` `{ file, text }` replaces one file. An open IDE window keeps
   the text it read, so edit while no window is open, or in the window.
3. `app.start` `{ beside?: { x, y } }` builds both files and runs the app. It
   answers `{ ran: true }`, or `{ ran: false, errors }` with each bundler error
   as `file line:column text`. Starting a running app restarts it in place.
4. `app.stop` ends the app. `app.state` answers `{ running }`, and the Server
   announces `app.state` whenever it changes.

The app may import `@phreshos/server` (in `server.ts`), `@phreshos/client`,
`@phreshos/react`, `@phreshos/react-ui`, `@phreshos/react-ui/icons`, `react`,
and any Node.js module in the Server.
