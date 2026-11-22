import { BookmarkService } from './BookmarkService'
import { BookmarkStore } from './BookmarkStore'

export class MapLayerManager {
    starLayers: Record<string, L.Marker> = {}
    starLayerGroup: L.LayerGroup<L.Marker> | undefined = undefined

    constructor(private store: BookmarkStore, private service: BookmarkService) {}

    addStar = (guid: string, latlng: L.LatLngExpression, lbl: string): void => {
        const star = new L.Marker(latlng, {
            title: lbl,
            icon: new L.Icon({
                iconUrl: '@include_img:images/marker-star.png@',
                iconAnchor: [15, 40],
                iconSize: [30, 40],
            }),
        })
        window.registerMarkerForOMS(star)
        star.on('spiderfiedclick', () => { window.renderPortalDetails(guid) })
        this.starLayers[guid] = star
        this.starLayerGroup!.addLayer(star)
    }

    addAllStars = (): void => {
        const list = this.store.bkmrksObj.portals
        for (const idFolders in list) {
            for (const idBkmrks in list[idFolders].bkmrk) {
                const bkmrk = list[idFolders].bkmrk[idBkmrks]
                const latlng = bkmrk.latlng.split(',').map(Number) as [number, number]
                this.addStar(bkmrk.guid ?? '', latlng, bkmrk.label)
            }
        }
    }

    resetAllStars = (): void => {
        for (const guid in this.starLayers) {
            this.starLayerGroup?.removeLayer(this.starLayers[guid])
            Reflect.deleteProperty(this.starLayers, guid)
        }
        this.addAllStars()
        console.log('resetAllStars done')
    }

    editStar = (data: Record<string, unknown>): void => {
        if (data.target === 'portal') {
            const guid = data.guid as string
            if (data.action === 'add' && guid) {
                const portal = window.portals[guid]
                if (portal) {
                    const latlng = portal.getLatLng()
                    const lbl = portal.options.data.title
                    this.addStar(guid, latlng, lbl)
                }
            } else if (data.action === 'remove' && guid) {
                this.starLayerGroup?.removeLayer(this.starLayers[guid])
                Reflect.deleteProperty(this.starLayers, guid)
            }
        } else if (
            (data.target === 'all' && (data.action === 'import' || data.action === 'reset')) ||
            (data.target === 'folder' && data.action === 'remove')
        ) {
            this.resetAllStars()
        }
    }

    highlight = (data: { portal: L.CircleMarker & { options: { ent: string[] } } }): void => {
        const guid = data.portal.options.ent[0]
        if (this.service.findByGuid(guid)) {
            data.portal.setStyle({ fillColor: 'red' })
        }
    }

    highlightRefresh = (data: Record<string, unknown>): void => {
        // eslint-disable-next-line no-underscore-dangle
        if (window._current_highlighter === 'Bookmarked Portals') {
            if (
                data.action === 'sync' ||
                data.target === 'portal' ||
                (data.target === 'folder' && data.action === 'remove') ||
                (data.target === 'all' && data.action === 'import') ||
                (data.target === 'all' && data.action === 'reset') ||
                (data.target === 'all' && data.action === 'MPEswitch')
            ) {
                window.changePortalHighlights('Bookmarked Portals')
            }
        }
    }
}
