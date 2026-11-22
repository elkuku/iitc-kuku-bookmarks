import { BookmarkStore } from './BookmarkStore'

export class SyncManager {
    readonly SYNC_DELAY = 5000
    enableSync = false
    private syncTimer: ReturnType<typeof setTimeout> | undefined = undefined

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onRefresh: () => void = () => {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onResetStars: () => void = () => {}

    constructor(private store: BookmarkStore) {}

    registerFieldForSyncing = (): void => {
        if (!window.plugin.sync) return
        window.plugin.sync.registerMapForSync('bookmarks', this.store.KEY.field, this.syncCallback, this.syncInitialized)
    }

    delaySync = (): void => {
        if (!this.enableSync || !this.store.IsDefaultStorageKey) return
        if (this.syncTimer !== undefined) clearTimeout(this.syncTimer)
        this.syncTimer = setTimeout(() => {
            this.syncTimer = undefined
            this.syncNow()
        }, this.SYNC_DELAY)
    }

    syncNow = (): void => {
        if (!this.enableSync || !this.store.IsDefaultStorageKey) return
        $.extend(this.store.updatingQueue, this.store.updateQueue)
        this.store.updateQueue = {}
        this.store.storeLocal(this.store.UPDATING_QUEUE)
        this.store.storeLocal(this.store.UPDATE_QUEUE)
        window.plugin.sync?.updateMap('bookmarks', this.store.KEY.field, Object.keys(this.store.updatingQueue))
    }

    syncBkmrks = (): void => {
        this.store.loadLocal(this.store.KEY)
        this.store.updateQueue = this.store.bkmrksObj as unknown as Record<string, unknown>
        this.store.storeLocal(this.store.UPDATE_QUEUE)
        this.delaySync()
        this.store.loadLocal(this.store.KEY)
    }

    syncCallback = (_pluginName: string, fieldName: string, syncEntry: { isLocal: boolean; property: string } | null, fullUpdated: boolean): void => {
        if (fieldName !== this.store.KEY.field) return
        this.store.storeLocal(this.store.KEY)
        if (fullUpdated) {
            this.onRefresh()
            this.onResetStars()
            window.runHooks('pluginBkmrksSyncEnd', { target: 'all', action: 'sync' })
            console.log('BOOKMARKS: synchronized all from drive after offline')
            return
        }
        if (!syncEntry) return
        if (syncEntry.isLocal) {
            Reflect.deleteProperty(this.store.updatingQueue, syncEntry.property)
            console.log('BOOKMARKS: synchronized to drive')
        } else {
            Reflect.deleteProperty(this.store.updateQueue, syncEntry.property)
            this.store.storeLocal(this.store.UPDATE_QUEUE)
            this.onRefresh()
            this.onResetStars()
            window.runHooks('pluginBkmrksSyncEnd', { target: 'all', action: 'sync' })
            console.log('BOOKMARKS: synchronized all from remote')
        }
    }

    syncInitialized = (_pluginName: string, fieldName: string): void => {
        if (fieldName === this.store.KEY.field) {
            this.enableSync = true
            if (Object.keys(this.store.updateQueue).length > 0) {
                this.delaySync()
            }
        }
    }
}
