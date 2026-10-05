import { desktop, system } from "@phreshos/client"
import { DesktopProvider, SystemProvider, useDesktopPreferences, useSystemAppearance } from "@phreshos/react"
import { DocumentTheme, Loading, UIProvider } from "@phreshos/react-ui"
import IDE from "./ide"
import "./style.css"

/** The IDE in the Desktop's Appearance and preferences. It appears whole, once the project has arrived. */
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
        <Loading><IDE /></Loading>
    </UIProvider>
}
