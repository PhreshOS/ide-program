# IDE

A small demonstration that a PhreshOS Program can write, build, and run
another Program inside the System: two files, a Start button, and the app
opens beside it.

It is not the way to develop PhreshOS apps. Apps are developed in any editor,
with the `phresh` command line: `phresh create`, then `phresh dev`. See
[Project commands](https://phreshos.com/docs/sdks/cli/project-commands).

[Programs](https://phreshos.com/docs/program/programs) ·
[Communication](https://phreshos.com/docs/program/communication) ·
[Source](https://github.com/PhreshOS/ide-program)

## Role

The IDE holds one app of two files: `server.ts`, a Server Endpoint that runs as
a Node.js worker, and `client.tsx`, a Client Endpoint written with React and
React UI. Each file is saved as it is typed.

Start builds both files with esbuild and creates the app in the System, then
opens its window beside the IDE. Restart builds it again and puts it in the same
place; Stop ends it. The app lives within the IDE: one IDE Server, shared by
every IDE window, runs it, and that Server ends once the last IDE window
closes, which ends the app with it.

While the code is written, TypeScript completes it, underlines what is wrong,
and describes what the pointer rests on, from the declarations of every library
the app may import.

Creating the app is the System-wide `all` permission: a Program's definition
grants it what it declares.

## Installation

```sh
phresh install ide --run
```

Installation brings the bundler and the libraries the app imports beside the
IDE's Server, at the versions the IDE was built with.

## Development

```sh
bun install --frozen-lockfile
bun run verify
bun run start
```

`verify` checks the types and builds both Endpoints and the declarations the
editor knows. Package a release with `bun run pack`.

## Related repositories

- [PhreshOS System](https://github.com/PhreshOS/system) owns Endpoint execution
  and the Desktop Window hosting the IDE and the app.
- [`@phreshos/core`](https://github.com/PhreshOS/core) owns the Program,
  Endpoint, and communication contracts.
- [`@phreshos/client`](https://github.com/PhreshOS/client) and
  [`@phreshos/server`](https://github.com/PhreshOS/server) provide the IDE's
  runtime boundaries, and the app's.
- [`@phreshos/react-ui`](https://github.com/PhreshOS/react-ui) draws the IDE and
  the app.

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Zohayr SLILEH.
