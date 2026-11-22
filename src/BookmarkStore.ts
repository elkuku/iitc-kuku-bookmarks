import { BookmarkFolderList, BookmarksData, LocalMapping, StatusBox } from './BookmarkTypes'

export class BookmarkStore {
    readonly KEY_OTHER_BKMRK = 'idOthers'
    KEY_STORAGE = 'plugin-bookmarks'
    readonly KEY_STATUS_BOX = 'plugin-bookmarks-box'

    KEY = { key: 'plugin-bookmarks', field: 'bkmrksObj' }
    IsDefaultStorageKey = true
    readonly UPDATE_QUEUE: LocalMapping = { key: 'plugin-bookmarks-queue', field: 'updateQueue' }
    readonly UPDATING_QUEUE: LocalMapping = { key: 'plugin-bookmarks-updating-queue', field: 'updatingQueue' }

    bkmrksObj: BookmarksData = { maps: {}, portals: {} }
    statusBox: StatusBox = { show: 1, page: 0, pos: { x: 100, y: 100 } }
    updateQueue: Record<string, unknown> = {}
    updatingQueue: Record<string, unknown> = {}

    private IDcount = 0

    generateID = (): string => {
        const d = new Date()
        const ID = `${d.getTime()}${this.IDcount}${Math.floor(Math.random() * 99) + 1}`
        this.IDcount++
        return `id${ID}`
    }

    escapeHtml = (text: string): string =>
        text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\//g, '&#47;')
            .replace(/\\/g, '&#92;')

    escapeUnicode = (str: string): string => {
        let result = ''
        for (let index = 0; index < str.length; index++) {
            const codePoint = str.codePointAt(index) ?? 0
            result += (codePoint & 127) === codePoint ? str[index] : '\\u' + ('0000' + codePoint.toString(16)).slice(-4);
        }
        return result
    }

    saveStorage = (): void => {
        localStorage[this.KEY_STORAGE] = JSON.stringify(this.bkmrksObj)
    }

    loadStorage = (): void => {
        this.bkmrksObj = JSON.parse(localStorage[this.KEY_STORAGE] as string) as BookmarksData
    }

    saveStorageBox = (): void => {
        localStorage[this.KEY_STATUS_BOX] = JSON.stringify(this.statusBox)
    }

    loadStorageBox = (): void => {
        this.statusBox = JSON.parse(localStorage[this.KEY_STATUS_BOX] as string) as StatusBox
    }

    upgradeToNewStorage = (): void => {
        if (localStorage['plugin-bookmarks-portals-data'] && localStorage['plugin-bookmarks-maps-data']) {
            const oldStor1 = JSON.parse(localStorage['plugin-bookmarks-maps-data'] as string) as { bkmrk_maps: BookmarkFolderList }
            const oldStor2 = JSON.parse(localStorage['plugin-bookmarks-portals-data'] as string) as { bkmrk_portals: BookmarkFolderList }
            this.bkmrksObj = { maps: {}, portals: {} }
            this.bkmrksObj.maps = oldStor1.bkmrk_maps
            this.bkmrksObj.portals = oldStor2.bkmrk_portals
            this.saveStorage()
            localStorage.removeItem('plugin-bookmarks-maps-data')
            localStorage.removeItem('plugin-bookmarks-portals-data')
            localStorage.removeItem('plugin-bookmarks-status-box')
        }
    }

    createStorage = (): void => {
        if (!localStorage[this.KEY_STORAGE]) {
            this.bkmrksObj = {
                maps: { idOthers: { label: 'Others', state: 1, bkmrk: {} } },
                portals: { idOthers: { label: 'Others', state: 1, bkmrk: {} } },
            }
            this.saveStorage()
        }
        if (!localStorage[this.KEY_STATUS_BOX]) {
            this.statusBox = { show: 1, page: 0, pos: { x: 100, y: 100 } }
            this.saveStorageBox()
        }
    }

    storeLocal = (mapping: LocalMapping): void => {
        const value = (this as unknown as Record<string, unknown>)[mapping.field]
        if (value !== undefined && value !== null) {
            localStorage[mapping.key] = JSON.stringify(value)
        } else {
            localStorage.removeItem(mapping.key)
        }
    }

    loadLocal = (mapping: LocalMapping): void => {
        const objectJSON = localStorage[mapping.key] as string | null | undefined
        if (!objectJSON) return
        const parsed = JSON.parse(objectJSON) as unknown
        ;(this as unknown as Record<string, unknown>)[mapping.field] = mapping.convertFunc ? mapping.convertFunc(parsed) : parsed
    }
}
