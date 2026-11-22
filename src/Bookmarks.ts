import { BookmarkService } from './BookmarkService'
import { BookmarkStore } from './BookmarkStore'
import { MapLayerManager } from './MapLayerManager'
import { OptionsManager } from './OptionsManager'
import { SyncManager } from './SyncManager'
import { UIRenderer } from './UiRenderer'

export class Bookmarks {
    store = new BookmarkStore()
    service = new BookmarkService(this.store)
    layers = new MapLayerManager(this.store, this.service)
    sync = new SyncManager(this.store)
    ui = new UIRenderer(this.store, this.service)
    opts = new OptionsManager(this.store, this.ui)

    constructor() {
        this.service.refreshBkmrks = () => this.ui.refreshBkmrks()
        this.sync.onRefresh = () => this.ui.refreshBkmrks()
        this.sync.onResetStars = () => this.layers.resetAllStars()
    }

    // Public API delegation (called from HTML onclick strings)
    switchStarPortal = (guid?: string) => this.service.switchStarPortal(guid)
    addElement = (element: Element, type: string) => this.service.addElement(element, type)
    removeElement = (element: Element, type: string) => this.service.removeElement(element, type)
    openFolder = (element: Element) => this.service.openFolder(element)
    renameFolder = (element: Element) => this.opts.renameFolder(element)
    moveMode = () => this.ui.moveMode()
    deleteMode = () => this.ui.deleteMode()
    sortFolder = (typeList: string) => this.ui.sortFolder(typeList)
    sortBookmark = (typeList: string) => this.ui.sortBookmark(typeList)
    mobileSort = (element: Element) => this.ui.mobileSort(element)
    dialogMobileSort = (type: string, element: Element) => this.ui.dialogMobileSort(type, element)
    switchStatusBkmrksBox = (status: 'switch' | 0 | 1) => this.ui.switchStatusBkmrksBox(status)
    switchPageBkmrksBox = (element: Element, page: number) => this.ui.switchPageBkmrksBox(element, page)
    manualOpt = () => this.opts.manualOpt()
    dialogDrawer = () => this.ui.dialogDrawer()
    optReset = () => this.opts.optReset()
    optCopy = () => this.opts.optCopy()
    optPaste = () => this.opts.optPaste()
    optImport = () => this.opts.optImport()
    optExport = () => this.opts.optExport()
    optBox = (command: 'save' | 'reset') => this.opts.optBox(command)
    optRenameF = () => this.opts.optRenameF()
    autoDrawOnSelect = () => this.ui.autoDrawOnSelect()
    refreshBkmrks = () => this.ui.refreshBkmrks()

    setup = (): void => {
        this.ui.isSmart = window.isSmartphone()

        this.store.createStorage()
        this.store.upgradeToNewStorage()
        this.store.loadStorage()
        this.store.loadStorageBox()
        this.ui.setupContent()

        if (this.ui.isSmart) {
            $('body').append(this.ui.htmlBkmrksBox)
            $('#bookmarksBox').css('display', 'none').addClass('mobile')
            if (window.useAppPanes?.()) {
                window.app?.addPane('plugin-bookmarks', 'Bookmarks', 'ic_action_star')
            }
            window.addHook('paneChanged', this.ui.onPaneChanged)
        } else {
            $('body').append(this.ui.htmlBoxTrigger + this.ui.htmlBkmrksBox)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            ;($('#bookmarksBox') as any).draggable({ handle: '.handle', containment: 'window' })
            $(
                '#bookmarksBox #bookmarksMin, #bookmarksBox ul li, #bookmarksBox ul li a, #bookmarksBox ul li a span, #bookmarksBox h5, #bookmarksBox .addForm a'
            ).disableSelection()
            $('#bookmarksBox').css({ top: this.store.statusBox.pos.x, left: this.store.statusBox.pos.y })
        }

        IITC.toolbox.addButton({
            label: 'Bookmarks Opt',
            action: this.opts.manualOpt,
        })
        IITC.toolbox.addButton({
            label: 'Auto draw',
            title: 'Draw lines/triangles between bookmarked portals [q]',
            action: this.ui.dialogDrawer,
            accessKey: 'q',
        })

        if (this.ui.isSmart) {
            $('#bookmarksBox.mobile #topBar').append(this.ui.htmlMoveBtn)
        }

        this.ui.loadList('maps')
        this.ui.loadList('portals')
        this.ui.jquerySortableScript()

        if (this.store.statusBox.show === 0) {
            this.ui.switchStatusBkmrksBox(0)
        }
        if (this.store.statusBox.page === 1) {
            $('#bookmarksBox h5.bkmrk_portals').trigger('click')
        }

        window.addHook('portalSelected', this.ui.onPortalSelected)
        window.addHook('portalDetailsUpdated', this.ui.onPortalSelected)
        window.addHook('search', this.service.onSearch)

        window.addHook('pluginBkmrksEdit', this.sync.syncBkmrks)
        this.sync.registerFieldForSyncing()

        window.addHook('pluginBkmrksEdit', this.layers.highlightRefresh)
        window.addHook('pluginBkmrksSyncEnd', this.layers.highlightRefresh)
        window.addPortalHighlighter('Bookmarked Portals', this.layers.highlight)

        this.layers.starLayerGroup = new L.LayerGroup<L.Marker>()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        ;(window.layerChooser as any).addOverlay(this.layers.starLayerGroup, 'Bookmarked Portals', { default: false })
        this.layers.addAllStars()
        window.addHook('pluginBkmrksEdit', this.layers.editStar)
        window.addHook('pluginBkmrksSyncEnd', this.layers.resetAllStars)

        if (window.plugin.portalslist) {
            this.ui.setupPortalsList()
        }

        if (window.plugin.mpe !== undefined) {
            this.initMPE()
        }
    }

    initMPE = (): void => {
        const defaultKey = 'plugin-bookmarks'
        window.plugin.mpe!.setMultiProjects({
            namespace: 'bookmarks',
            title: 'Bookmarks for Maps and Portals',
            fa: 'fa-bookmark',
            defaultKey,
            func_setKey: (newKey: string) => {
                this.store.KEY_STORAGE = newKey
                this.store.KEY.key = newKey
            },
            func_pre: () => {
                this.store.IsDefaultStorageKey = false
            },
            func_post: () => {
                for (const guid in this.layers.starLayers) {
                    this.layers.starLayerGroup?.removeLayer(this.layers.starLayers[guid])
                    Reflect.deleteProperty(this.layers.starLayers, guid)
                }
                this.store.createStorage()
                this.store.loadStorage()
                this.ui.refreshBkmrks()
                this.layers.addAllStars()
                this.layers.highlightRefresh({ target: 'all', action: 'MPEswitch' })
                this.store.IsDefaultStorageKey = this.store.KEY_STORAGE === defaultKey
            },
        })
    }
}
