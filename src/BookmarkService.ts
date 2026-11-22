import { Bookmark, BookmarkFolder, BookmarksData } from './BookmarkTypes'
import { PortalMarker } from '../types/Types'
import { BookmarkStore } from './BookmarkStore'

export class BookmarkService {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    refreshBkmrks: () => void = () => {}

    constructor(private store: BookmarkStore) {}

    findByGuid = (guid: string): { id_folder: string; id_bookmark: string } | undefined => {
        const list = this.store.bkmrksObj.portals
        for (const idFolders in list) {
            for (const idBkmrk in list[idFolders].bkmrk) {
                if (guid === list[idFolders].bkmrk[idBkmrk].guid) {
                    return { id_folder: idFolders, id_bookmark: idBkmrk }
                }
            }
        }
        return undefined
    }

    updateStarPortal = (): void => {
        const guid = window.selectedPortal
        $('.bkmrksStar').removeClass('favorite')
        $('.bkmrk a.bookmarksLink.selected').removeClass('selected')

        if (guid && (localStorage[this.store.KEY_STORAGE] as string).includes(guid)) {
            const bkmrkData = this.findByGuid(guid)
            if (bkmrkData) {
                $(`.bkmrk#${bkmrkData.id_bookmark} a.bookmarksLink`).addClass('selected')
                $('.bkmrksStar').addClass('favorite')
            }
        }
    }

    switchStarPortal = (guid?: string): void => {
        const portalGuid = guid ?? window.selectedPortal ?? ''
        const bkmrkData = this.findByGuid(portalGuid)
        if (bkmrkData) {
            const list = this.store.bkmrksObj.portals
            Reflect.deleteProperty(list[bkmrkData.id_folder].bkmrk, bkmrkData.id_bookmark)
            $(`.bkmrk#${bkmrkData.id_bookmark}`).remove()
            this.store.saveStorage()
            this.updateStarPortal()
            window.runHooks('pluginBkmrksEdit', { target: 'portal', action: 'remove', folder: bkmrkData.id_folder, id: bkmrkData.id_bookmark, guid: portalGuid })
            console.log(`BOOKMARKS: removed portal (${bkmrkData.id_bookmark} situated in ${bkmrkData.id_folder} folder)`)
        } else {
            this.addPortalBookmarkByGuid(portalGuid, true)
        }
    }

    addPortalBookmarkByMarker = (marker: PortalMarker, doPostProcess: boolean): void => {
        const guid = marker.options.guid
        const label = marker.options.data.title
        const ll = marker.getLatLng()
        const latlng = `${ll.lat},${ll.lng}`
        const ID = this.store.generateID()

        this.store.bkmrksObj.portals[this.store.KEY_OTHER_BKMRK].bkmrk[ID] = { guid, latlng, label }

        if (doPostProcess) {
            this.store.saveStorage()
            this.refreshBkmrks()
            window.runHooks('pluginBkmrksEdit', { target: 'portal', action: 'add', id: ID, guid })
            console.log(`BOOKMARKS: added portal ${ID}`)
        }
    }

    addPortalBookmarkByGuid = (guid: string, doPostProcess: boolean): void => {
        const marker = window.portals[guid]
        if (marker) {
            this.addPortalBookmarkByMarker(marker, doPostProcess)
        } else {
            throw new Error(`Could not find portal information for guid "${guid}"`)
        }
    }

    /** @deprecated */
    addPortalBookmark = (guid: string, latlng: string, label: string): void => {
        const ID = this.store.generateID()
        this.store.bkmrksObj.portals[this.store.KEY_OTHER_BKMRK].bkmrk[ID] = { guid, latlng, label }
        this.store.saveStorage()
        this.refreshBkmrks()
        window.runHooks('pluginBkmrksEdit', { target: 'portal', action: 'add', id: ID, guid })
        console.log('BOOKMARKS: added portal ' + ID)
    }

    addElement = (element: Element, type: string): void => {
        const ID = this.store.generateID()
        const typeList = $(element).parent().parent('div').attr('id') ?? ''
        const input = `#${typeList} .addForm input`
        let label = $(input).val() as string
        label = this.store.escapeHtml(label)
        $(input).val('')

        if (type === 'map') {
            const c = window.map.getCenter()
            const lat = Math.round(c.lat * 1e6) / 1e6
            const lng = Math.round(c.lng * 1e6) / 1e6
            const latlng = `${lat},${lng}`
            const zoom = parseInt(String(window.map.getZoom()))
            this.store.bkmrksObj.maps[this.store.KEY_OTHER_BKMRK].bkmrk[ID] = { label, latlng, z: zoom }
        } else {
            const labelOrDefault = label === '' ? 'Folder' : label
            const shortType = typeList.replace('bkmrk_', '') as 'maps' | 'portals'
            this.store.bkmrksObj[shortType][ID] = { label: labelOrDefault, state: 1, bkmrk: {} }
        }

        this.store.saveStorage()
        this.refreshBkmrks()
        window.runHooks('pluginBkmrksEdit', { target: type, action: 'add', id: ID })
        console.log(`BOOKMARKS: added ${type} ${ID}`)
    }

    removeElement = (element: Element, type: string): void => {
        if (type === 'maps' || type === 'portals') {
            const typeList = $(element).parent().parent().parent().parent().parent('div').attr('id') ?? ''
            const ID = $(element).parent('li').attr('id') ?? ''
            const IDfold = $(element).parent().parent().parent('li').attr('id') ?? ''
            const shortType = typeList.replace('bkmrk_', '') as 'maps' | 'portals'
            const guid = this.store.bkmrksObj[shortType][IDfold].bkmrk[ID].guid
            Reflect.deleteProperty(this.store.bkmrksObj[shortType][IDfold].bkmrk, ID)
            $(element).parent('li').remove()

            if (type === 'portals') {
                this.updateStarPortal()
                this.store.saveStorage()
                window.runHooks('pluginBkmrksEdit', { target: 'portal', action: 'remove', folder: IDfold, id: ID, guid })
                console.log(`BOOKMARKS: removed portal (${ID} situated in ${IDfold} folder)`)
            } else {
                this.store.saveStorage()
                window.runHooks('pluginBkmrksEdit', { target: 'map', action: 'remove', id: ID })
                console.log(`BOOKMARKS: removed map ${ID}`)
            }
        } else if (type === 'folder') {
            const typeList = $(element).parent().parent().parent().parent('div').attr('id') ?? ''
            const ID = $(element).parent().parent('li').attr('id') ?? ''
            const shortType = typeList.replace('bkmrk_', '') as 'maps' | 'portals'
            Reflect.deleteProperty(this.store.bkmrksObj[shortType], ID)
            $(element).parent().parent('li').remove()
            this.store.saveStorage()
            this.updateStarPortal()
            window.runHooks('pluginBkmrksEdit', { target: 'folder', action: 'remove', id: ID })
            console.log(`BOOKMARKS: removed folder ${ID}`)
        }
    }

    openFolder = (element: Element): void => {
        $(element).parent().parent('li').toggleClass('open')
        const typeList = ($(element).parent().parent().parent().parent('div').attr('id') ?? '').replace('bkmrk_', '')
        const ID = $(element).parent().parent('li').attr('id') ?? ''
        const flag = this.store.bkmrksObj[typeList as keyof BookmarksData][ID].state
        const newFlag = flag ? 0 : 1
        this.store.bkmrksObj[typeList as keyof BookmarksData][ID].state = newFlag
        this.store.saveStorage()
        window.runHooks('pluginBkmrksEdit', { target: 'folder', action: newFlag ? 'open' : 'close', id: ID })
    }

    onSearch = (query: { term: string; addResult: (result: Record<string, unknown>) => void }): void => {
        const term = query.term.toLowerCase()

        $.each(this.store.bkmrksObj.maps, (_id: string, folder: BookmarkFolder) => {
            $.each(folder.bkmrk, (_id: string, bookmark: Bookmark) => {
                if (!bookmark.label.toLowerCase().includes(term)) return
                query.addResult({
                    title: window.escapeHtmlSpecialChars(bookmark.label),
                    description: `Map in folder "${window.escapeHtmlSpecialChars(folder.label)}"`,
                    icon: '@include_img:images/icon-bookmark-map.png@',
                    position: new L.LatLng(...(bookmark.latlng.split(',').map(Number) as [number, number])),
                    zoom: bookmark.z,
                    onSelected: this.onSearchResultSelected,
                })
            })
        })

        $.each(this.store.bkmrksObj.portals, (_id: string, folder: BookmarkFolder) => {
            $.each(folder.bkmrk, (_id: string, bookmark: Bookmark) => {
                if (!bookmark.label.toLowerCase().includes(term)) return
                query.addResult({
                    title: window.escapeHtmlSpecialChars(bookmark.label),
                    description: `Bookmark in folder "${window.escapeHtmlSpecialChars(folder.label)}"`,
                    icon: '@include_img:images/icon-bookmark.png@',
                    position: new L.LatLng(...(bookmark.latlng.split(',').map(Number) as [number, number])),
                    guid: bookmark.guid,
                    onSelected: this.onSearchResultSelected,
                })
            })
        })
    }

    onSearchResultSelected = (result: { guid?: string; position: L.LatLng; zoom?: number }, event: { type: string }): boolean => {
        if (result.guid) {
            const guid = result.guid
            if (event.type === 'dblclick') {
                window.zoomToAndShowPortal(guid, result.position)
            } else if (window.portals[guid]) {
                window.renderPortalDetails(guid)
            } else {
                window.selectPortalByLatLng(result.position)
            }
        } else if (result.zoom) {
            window.map.setView(result.position, result.zoom)
        }
        return true
    }
}
