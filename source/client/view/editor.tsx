import { useEffect, useMemo, useRef } from "react"
import { ScrollArea, useAppearance, useColor, usePreferences, useThemedValue } from "@phreshos/react-ui"
import { EditorState, type Extension } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view"
import { bracketMatching, HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language"
import { javascript } from "@codemirror/lang-javascript"
import { tags } from "@lezer/highlight"

/**
 * One file of the project, as TypeScript with JSX: line numbers, highlighting, and its own undo
 * history. Each change is handed on as it is typed. Its colors are the Appearance colors.
 */
export default function Editor({ text, onChange, hidden }: Readonly<{ text: string, onChange: (text: string) => void, hidden: boolean }>) {
    const host = useRef<HTMLDivElement>(null)
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
                    look
                ]
            })
        })
        return () => view.destroy()
    }, [look])

    // A hidden file keeps its editor, and with it its undo history and where its cursor stands.
    return <div className="editor" hidden={hidden}><ScrollArea className="editor-scroll"><div ref={host} /></ScrollArea></div>
}

/** The editor's colors and type, from the Appearance: the same look as a text file in Files. */
function useLook(): Extension {
    const colors = useThemedValue(useAppearance().colors)
    const dark = usePreferences().theme === "dark"
    const primary = useColor("primary")
    const foreground = useColor("foreground")
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
            ".cm-matchingBracket": { backgroundColor: primary.subtle, outline: "none" }
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
    ], [colors, primary, foreground, dark, selection])
}
