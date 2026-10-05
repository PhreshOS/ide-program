import { useEffect, useMemo, useRef } from "react"
import { ScrollArea, useAppearance, useColor, usePreferences, useSurfaceColor, useThemedValue } from "@phreshos/react-ui"
import { Compartment, EditorState, type Extension } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view"
import { bracketMatching, HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language"
import { javascript } from "@codemirror/lang-javascript"
import { autocompletion } from "@codemirror/autocomplete"
import { tags } from "@lezer/highlight"
import { tsAutocompleteWorker, tsFacetWorker, tsHoverWorker, tsLinterWorker, tsSyncWorker } from "@valtown/codemirror-ts"
import type { WorkerShape } from "@valtown/codemirror-ts/worker"

type EditorProperties = Readonly<{
    path: string
    text: string
    onChange: (text: string) => void
    hidden: boolean
    typescript: WorkerShape | null
}>

/**
 * One file of the project, as TypeScript with JSX: line numbers, highlighting, and its own undo
 * history. Once TypeScript has started, it also completes what is typed, underlines what is wrong,
 * and describes what the pointer rests on. Each change is handed on as it is typed. Its colors are
 * the Appearance colors.
 */
export default function Editor({ path, text, onChange, hidden, typescript }: EditorProperties) {
    const host = useRef<HTMLDivElement>(null)
    const editor = useRef<EditorView | null>(null)
    const language = useRef(new Compartment())
    const look = useLook()
    const changed = useRef(onChange)
    changed.current = onChange
    const initial = useRef(text)

    useEffect(() => {
        const parent = host.current
        if (!parent) return
        const view = new EditorView({
            parent,
            state: EditorState.create({
                doc: initial.current,
                extensions: [
                    history(),
                    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
                    EditorView.updateListener.of(update => { if (update.docChanged) { initial.current = update.state.doc.toString(); changed.current(initial.current) } }),
                    indentUnit.of("    "),
                    lineNumbers(),
                    highlightActiveLineGutter(),
                    drawSelection(),
                    highlightActiveLine(),
                    bracketMatching(),
                    javascript({ typescript: true, jsx: true }),
                    language.current.of([]),
                    look
                ]
            })
        })
        editor.current = view
        return () => { editor.current = null; view.destroy() }
    }, [look])

    // TypeScript arrives after the window is shown; the editor takes it in place, keeping its text.
    useEffect(() => {
        editor.current?.dispatch({ effects: language.current.reconfigure(typescript ? understanding(typescript, path) : []) })
    }, [typescript, path, look])

    // A hidden file keeps its editor, and with it its undo history and where its cursor stands.
    return <div className="editor" hidden={hidden}><ScrollArea className="editor-scroll"><div ref={host} /></ScrollArea></div>
}

/** What TypeScript adds to the editor: the file kept in step, completion, problems, and descriptions. */
function understanding(worker: WorkerShape, path: string): Extension {
    return [
        tsFacetWorker.of({ worker, path }),
        tsSyncWorker(),
        tsLinterWorker(),
        autocompletion({ override: [tsAutocompleteWorker()] }),
        tsHoverWorker()
    ]
}

/** The editor's colors and type, from the Appearance: the same look as a text file in Files. */
function useLook(): Extension {
    const colors = useThemedValue(useAppearance().colors)
    const dark = usePreferences().theme === "dark"
    const primary = useColor("primary")
    const foreground = useColor("foreground")
    const surface = useSurfaceColor("background", "raised")
    // The soft primary is too close to a dark background to see; there the primary itself shows through.
    const selection = dark ? `color-mix(in oklab, ${colors.primary} 45%, transparent)` : primary.soft
    return useMemo(() => [
        EditorView.theme({
            "&": { color: colors.foreground, backgroundColor: "transparent", fontSize: "0.8125rem" },
            "&.cm-focused": { outline: "none" },
            ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: "1.55" },
            ".cm-content": { caretColor: colors.foreground },
            ".cm-cursor, .cm-dropCursor": { borderLeftColor: colors.foreground },
            ".cm-gutters": { backgroundColor: "transparent", color: foreground.soft, border: "none" },
            ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
            "&.cm-focused .cm-activeLine, &.cm-focused .cm-activeLineGutter": { backgroundColor: `color-mix(in oklab, ${colors.foreground} 6%, transparent)` },
            "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection": { backgroundColor: selection },
            ".cm-matchingBracket": { backgroundColor: primary.subtle, outline: "none" },
            // Completions, problems, and descriptions float over the text on the window's own surface.
            ".cm-tooltip": { backgroundColor: surface, color: colors.foreground, border: `1px solid ${foreground.subtle}`, borderRadius: "8px", overflow: "hidden", fontSize: "0.8125rem" },
            ".cm-tooltip-autocomplete > ul": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", maxHeight: "16em" },
            ".cm-tooltip-autocomplete > ul > li": { padding: "2px 8px" },
            ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: selection, color: colors.foreground },
            ".cm-completionDetail": { color: foreground.soft, fontStyle: "normal", marginInlineStart: "0.75em" },
            ".cm-completionMatchedText": { textDecoration: "none", color: primary.strong },
            ".cm-tooltip-hover, .cm-tooltip-lint": { padding: "6px 10px", maxWidth: "36rem" },
            ".cm-tooltip-hover": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", whiteSpace: "pre-wrap" },
            ".cm-diagnostic": { padding: "2px 0", borderInlineStart: "none" },
            ".cm-diagnostic-error": { color: colors.danger },
            ".cm-diagnostic-warning": { color: colors.warning },
            ".cm-lintRange-error": { backgroundImage: "none", textDecoration: `underline wavy ${colors.danger}`, textUnderlineOffset: "3px" },
            ".cm-lintRange-warning": { backgroundImage: "none", textDecoration: `underline wavy ${colors.warning}`, textUnderlineOffset: "3px" }
        }, { dark }),
        syntaxHighlighting(HighlightStyle.define([
            { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: colors.secondary },
            { tag: [tags.string, tags.special(tags.string), tags.regexp], color: colors.success },
            { tag: [tags.number, tags.bool, tags.null, tags.atom], color: colors.warning },
            { tag: [tags.comment, tags.meta], color: foreground.soft, fontStyle: "italic" },
            { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: colors.info },
            { tag: [tags.typeName, tags.className, tags.tagName], color: primary.strong, fontWeight: "600" },
            { tag: [tags.propertyName, tags.attributeName], color: colors.info },
            { tag: tags.invalid, color: colors.danger }
        ]))
    ], [colors, primary, foreground, dark, selection, surface])
}
