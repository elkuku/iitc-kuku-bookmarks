export interface Bookmark {
    label: string
    latlng: string
    guid?: string
    z?: number
}

export interface BookmarkFolder {
    label: string
    state: number
    bkmrk: Record<string, Bookmark>
}

export type BookmarkFolderList = Record<string, BookmarkFolder>

export interface BookmarksData {
    maps: BookmarkFolderList
    portals: BookmarkFolderList
}

export interface StatusBox {
    show: number
    page: number
    pos: { x: number; y: number }
}

export interface LocalMapping {
    key: string
    field: string
    convertFunc?: (data: unknown) => unknown
}
