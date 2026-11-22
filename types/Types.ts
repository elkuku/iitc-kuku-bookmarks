
export interface HelperHandlebars {
    compile: (templateString: unknown) => Handlebars.TemplateDelegate
    registerHelper: (name: Handlebars.HelperDeclareSpec) => void
}

interface PortalData {
    title: string
}

export interface PortalOptions {
    guid: string
    data: PortalData
    ent: string[]
}

export type PortalMarker = L.CircleMarker & {
    options: PortalOptions
}

interface PortalListField {
    title: string
    value: (portal: PortalMarker) => unknown
    sort?: (a: unknown, b: unknown) => number
    format?: (cell: Element, portal: PortalMarker, value: unknown) => void
}

declare global {
    interface Window {
        plugin: {
            HelperHandlebars: HelperHandlebars
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bookmarks: any
            drawTools?: {
                lineOptions: L.PathOptions
                polygonOptions: L.PathOptions
                drawnItems: L.FeatureGroup<L.Marker>
            }
            portalslist?: {
                fields: PortalListField[]
            }
            sync?: {
                registerMapForSync(name: string, field: string, callback: Function, initCallback: Function): void
                updateMap(name: string, field: string, keys: string[]): void
            }
            mpe?: {
                setMultiProjects(options: Record<string, unknown>): void
            }
        }
        isApp: boolean
        useAppPanes?(): boolean
        app?: {
            addPane(id: string, name: string, icon: string): void
            shareString(data: string): void
        }
        formatDistance(distance: number): string
        addPortalHighlighter(name: string, callback: (data: { portal: PortalMarker }) => void): void
        _current_highlighter?: string
        changePortalHighlights(name: string): void
    }

    // Augment LayerChooser to support the 3-argument addOverlay used by IITC plugins
    interface LayerChooser {
        addOverlay(layer: L.ILayer, name: string, options?: LayerEntryOption): LayerChooser
    }

    namespace L {
        function geodesicPolyline(latlngs: L.LatLngExpression[], options?: L.PolylineOptions): L.Polyline
        function geodesicPolygon(latlngs: L.LatLngExpression[], options?: L.PolylineOptions): L.Polygon
        namespace FileListLoader {
            function loadFiles(options: { accept: string }): {
                on(event: 'load', callback: (e: { reader: FileReader }) => void): void
            }
        }
    }
}
