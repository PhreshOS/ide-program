import type { File } from "@shared/project"

/** TypeScript's own blue, which TS and TSX files are known by. */
const blue = "#3178c6"

/**
 * A file's kind as it is commonly known: TypeScript's "TS" badge for the Server, and for the Client,
 * which also holds JSX, React's atom in TypeScript's blue.
 */
export default function FileIcon({ file }: Readonly<{ file: File }>) {
    return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ flex: "none" }}>
        {file.endsWith(".tsx")
            ? <g fill="none" stroke={blue} strokeWidth="1.1">
                <ellipse cx="8" cy="8" rx="7" ry="2.7" />
                <ellipse cx="8" cy="8" rx="7" ry="2.7" transform="rotate(60 8 8)" />
                <ellipse cx="8" cy="8" rx="7" ry="2.7" transform="rotate(120 8 8)" />
                <circle cx="8" cy="8" r="1.4" fill={blue} stroke="none" />
            </g>
            : <>
                <rect width="16" height="16" rx="3" fill={blue} />
                <text x="8" y="11.4" textAnchor="middle" fill="#fff" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="700" fontSize="7.6" letterSpacing="-0.2">TS</text>
            </>}
    </svg>
}
