import type ts from "typescript-service"

/** Where the project's files stand in the TypeScript environment, beside its `node_modules`. */
export const paths = { "server.ts": "/server.ts", "client.tsx": "/client.tsx" } as const

/**
 * How the app's code is understood while it is written: the way it is built, a Server in Node.js
 * and a Client in the browser, with JSX for React.
 */
export function compilerOptions(typescript: typeof ts): ts.CompilerOptions {
    return {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.ESNext,
        moduleResolution: typescript.ModuleResolutionKind.Bundler,
        jsx: typescript.JsxEmit.ReactJSX,
        strict: true,
        skipLibCheck: true,
        lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
        types: ["node"],
        typeRoots: ["/node_modules/@types"]
    }
}

/** What a written app may import, so its types are known while it is written. */
export const libraries = ["@phreshos/server", "@phreshos/client", "@phreshos/core", "@phreshos/react", "@phreshos/react-ui", "@phreshos/react-ui/icons", "react"] as const
