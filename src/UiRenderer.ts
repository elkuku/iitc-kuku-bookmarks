import { BookmarkFolderList, BookmarksData } from './BookmarkTypes'
import { BookmarkService } from './BookmarkService'
import { BookmarkStore } from './BookmarkStore'

export class UIRenderer {
    isSmart = false
    htmlBoxTrigger = ''
    htmlBkmrksBox = ''
    htmlDisabledMessage = ''
    htmlStar = ''
    htmlMoveBtn = ''
    htmlSetbox = ''

    private mobileSortIDb = ''
    private mobileSortIDf = ''
    private onPortalSelectedPending = false

    constructor(private store: BookmarkStore, private service: BookmarkService) {}

    refreshBkmrks = (): void => {
        $('#bkmrk_maps > ul, #bkmrk_portals > ul').remove()
        this.store.loadStorage()
        this.loadList('maps')
        this.loadList('portals')
        this.service.updateStarPortal()
        this.jquerySortableScript()
    }

    switchStatusBkmrksBox = (status: 'switch' | 0 | 1): void => {
        let newStatus: 0 | 1 | 'switch' = status
        if (newStatus === 'switch') {
            newStatus = this.store.statusBox.show === 1 ? 0 : 1
        }
        if (newStatus === 1) {
            $('#bookmarksBox').css('height', 'auto')
            $('#bkmrksTrigger').css('height', '0')
        } else {
            $('#bkmrksTrigger').css('height', '64px')
            $('#bookmarksBox').css('height', '0')
        }
        this.store.statusBox.show = newStatus
        this.store.saveStorageBox()
    }

    onPaneChanged = (pane: string): void => {
        if (pane === 'plugin-bookmarks') {
            $('#bookmarksBox').css('display', '')
        } else {
            $('#bookmarksBox').css('display', 'none')
        }
    }

    switchPageBkmrksBox = (element: Element, page: number): void => {
        this.store.statusBox.page = page
        this.store.saveStorageBox()
        $('h5').removeClass('current')
        $(element).addClass('current')
        const sectList = '#' + ($(element).attr('class') ?? '').replace(' current', '')
        $('#bookmarksBox .bookmarkList').removeClass('current')
        $(sectList).addClass('current')
    }

    loadList = (typeList: 'maps' | 'portals'): void => {
        let element = ''
        let elementTemporary = ''
        let elementExc = ''
        const returnToMap = this.isSmart ? "window.show('map');" : ''
        const list = this.store.bkmrksObj[typeList]

        for (const idFolders in list) {
            const folders = list[idFolders]
            let active = ''
            const folderDelete = '<span class="folderLabel"><a class="bookmarksRemoveFrom" onclick="window.plugin.bookmarks.removeElement(this, \'folder\');return false;" title="Remove this folder">X</a>'
            const folderName = `<a class="bookmarksAnchor" onclick="window.plugin.bookmarks.openFolder(this);return false"><span></span>${folders.label}</a></span>`
            let folderLabel = folderDelete + folderName

            if (folders.state) {
                active = ' open'
            }
            if (idFolders === this.store.KEY_OTHER_BKMRK) {
                folderLabel = ''
                active = ' othersBookmarks open'
            }

            elementTemporary = `<li class="bookmarkFolder${active}" id="${idFolders}">${folderLabel}<ul>`

            const fold = folders.bkmrk
            for (const idBkmrk in fold) {
                const bkmrk = fold[idBkmrk]
                const label = bkmrk.label
                const latlng = bkmrk.latlng
                const buttonRemove = `<a class="bookmarksRemoveFrom" onclick="window.plugin.bookmarks.removeElement(this, '${typeList}');return false;" title="Remove from bookmarks">X</a>`
                const buttonMove = this.isSmart
                    ? `<a class="bookmarksMoveIn" onclick="window.plugin.bookmarks.dialogMobileSort('${typeList}', this);return false;">=</a>`
                    : ''

                let buttonLink: string
                if (typeList === 'maps') {
                    const displayLabel = bkmrk.label === '' ? `${bkmrk.latlng} [${bkmrk.z}]` : label
                    buttonLink = `<a class="bookmarksLink" onclick="${returnToMap}window.map.setView([${latlng}], ${bkmrk.z});return false;">${displayLabel}</a>`
                } else {
                    const guid = bkmrk.guid ?? ''
                    const onclick = `$('a.bookmarksLink.selected').removeClass('selected');${returnToMap}window.zoomToAndShowPortal('${guid}', [${latlng}]);return false;`
                    buttonLink = `<a class="bookmarksLink" onclick="${onclick}">${label}</a>`
                }
                elementTemporary += `<li class="bkmrk" id="${idBkmrk}">${buttonRemove}${buttonMove}${buttonLink}</li>`
            }
            elementTemporary += '</li></ul>'

            if (idFolders === this.store.KEY_OTHER_BKMRK) {
                elementExc = elementTemporary
            } else {
                element += elementTemporary
            }
        }

        element += elementExc
        element = '<ul>' + element + '</ul>'
        $(`#bkmrk_${typeList}`).append(element)
    }

    deleteMode = (): void => {
        $('#bookmarksBox').removeClass('moveMode').toggleClass('deleteMode')
    }

    moveMode = (): void => {
        $('#bookmarksBox').removeClass('deleteMode').toggleClass('moveMode')
    }

    dialogMobileSort = (type: string, element: Element): void => {
        this.mobileSortIDb = $(element).parent('li.bkmrk').attr('id') ?? ''
        this.mobileSortIDf = $(element).parent('li.bkmrk').parent('ul').parent('li.bookmarkFolder').attr('id') ?? ''
        const typeNum = type === 'maps' ? 1 : 2
        window.dialog({
            html: this.dialogLoadListFolders('bookmarksDialogMobileSort', 'window.plugin.bookmarks.mobileSort', true, typeNum),
            dialogClass: 'ui-dialog-bkmrksSet-copy',
            id: 'plugin-bookmarks-move-bookmark',
            title: 'Bookmarks - Move Bookmark',
        })
    }

    mobileSort = (element: Element): void => {
        const type = $(element).data('type') as 'maps' | 'portals'
        const idBkmrk = this.mobileSortIDb
        const newFold = $(element).data('id') as string
        const oldFold = this.mobileSortIDf
        const bkmrk = this.store.bkmrksObj[type][oldFold].bkmrk[idBkmrk]
        Reflect.deleteProperty(this.store.bkmrksObj[type][oldFold].bkmrk, idBkmrk)
        this.store.bkmrksObj[type][newFold].bkmrk[idBkmrk] = bkmrk
        this.store.saveStorage()
        this.refreshBkmrks()
        window.runHooks('pluginBkmrksEdit', { target: 'bookmarks', action: 'sort' })
        this.mobileSortIDf = newFold
        console.log(`Move Bookmarks ${type} ID:${idBkmrk} from folder ID:${oldFold} to folder ID:${newFold}`)
    }

    sortFolder = (typeList: string): void => {
        const keyType = typeList.replace('bkmrk_', '') as 'maps' | 'portals'
        const newArray: BookmarkFolderList = {}
        $(`#${typeList} li.bookmarkFolder`).each((_i, element) => {
            const idFold = $(element).attr('id') ?? ''
            newArray[idFold] = this.store.bkmrksObj[keyType][idFold]
        })
        this.store.bkmrksObj[keyType] = newArray
        this.store.saveStorage()
        window.runHooks('pluginBkmrksEdit', { target: 'folder', action: 'sort' })
        console.log('BOOKMARKS: sorted folder')
    }

    sortBookmark = (typeList: string): void => {
        const keyType = typeList.replace('bkmrk_', '') as 'maps' | 'portals'
        const newArray: BookmarkFolderList = {}

        $(`#${typeList} li.bookmarkFolder`).each((_i, element) => {
            const idFold = $(element).attr('id') ?? ''
            newArray[idFold] = { ...this.store.bkmrksObj[keyType][idFold], bkmrk: {} }
        })

        $(`#${typeList} li.bkmrk`).each((_i, element) => {
            this.store.loadStorage()
            const idFold = $(element).parent().parent('li').attr('id') ?? ''
            const id = $(element).attr('id') ?? ''
            const list = this.store.bkmrksObj[keyType]
            for (const idFoldersOrigin in list) {
                for (const idBkmrk in list[idFoldersOrigin].bkmrk) {
                    if (idBkmrk === id) {
                        newArray[idFold].bkmrk[id] = this.store.bkmrksObj[keyType][idFoldersOrigin].bkmrk[id]
                    }
                }
            }
        })

        this.store.bkmrksObj[keyType] = newArray
        this.store.saveStorage()
        window.runHooks('pluginBkmrksEdit', { target: 'bookmarks', action: 'sort' })
        console.log('BOOKMARKS: sorted bookmark (portal/map)')
    }

    jquerySortableScript = (): void => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        ;($('.bookmarkList > ul') as any).sortable({
            items: 'li.bookmarkFolder:not(.othersBookmarks)',
            handle: '.bookmarksAnchor',
            placeholder: 'sortable-placeholder',
            helper: 'clone',
            forcePlaceholderSize: true,
            update: (_event: unknown, ui: { item: JQuery }) => {
                const typeList = ui.item.parent().parent('.bookmarkList').attr('id') ?? ''
                this.sortFolder(typeList)
            },
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        ;($('.bookmarkList ul li ul') as any).sortable({
            items: 'li.bkmrk',
            connectWith: '.bookmarkList ul ul',
            handle: '.bookmarksLink',
            placeholder: 'sortable-placeholder',
            helper: 'clone',
            forcePlaceholderSize: true,
            update: (_event: unknown, ui: { item: JQuery }) => {
                const typeList = ui.item.parent().parent().parent().parent('.bookmarkList').attr('id') ?? ''
                this.sortBookmark(typeList)
            },
        })
    }

    dialogLoadListFolders = (idBox: string, clickAction: string, showOthersF: boolean, scanType: number): string => {
        const list = JSON.parse(localStorage[this.store.KEY_STORAGE] as string) as BookmarksData
        let listHTML = ''
        let foldHTML = ''
        let elementGenericFolder = ''

        for (const type in list) {
            if (scanType === 0 || (scanType === 1 && type === 'maps') || (scanType === 2 && type === 'portals')) {
                listHTML += `<h3>${type}:</h3>`
                for (const idFolders in list[type as keyof BookmarksData]) {
                    const label = list[type as keyof BookmarksData][idFolders].label
                    foldHTML = `<div class="bookmarkFolder" id="${idFolders}" data-type="${type}" data-id="${idFolders}" onclick="${clickAction}(this);return false;">${label}</div>`
                    if (idFolders !== this.store.KEY_OTHER_BKMRK) {
                        listHTML += foldHTML
                    } else if (showOthersF) {
                        elementGenericFolder = foldHTML
                    }
                }
            }
            listHTML += elementGenericFolder
            elementGenericFolder = ''
        }

        return `<div class="bookmarksDialog" id="${idBox}">${listHTML}</div>`
    }

    dialogDrawer = (): void => {
        window.dialog({
            html: this.dialogLoadList(),
            dialogClass: 'ui-dialog-autodrawer',
            id: 'plugin-bookmarks-move-bookmark',
            title: 'Bookmarks - Auto Draw',
            buttons: {
                DRAW: () => { this.draw(0) },
                'DRAW&VIEW': () => { this.draw(1) },
            },
        })
        this.autoDrawOnSelect()
    }

    draw = (view: number): void => {
        const latlngs: [number, number][] = []
        $('#bkmrksAutoDrawer a.bkmrk.selected').each((i, element) => {
            latlngs[i] = $(element).data('latlng') as [number, number]
        })

        if (latlngs.length >= 2 && latlngs.length <= 3) {
            let layer: L.Polyline | L.Polygon
            let layerType: string

            if (latlngs.length === 2) {
                layer = L.geodesicPolyline(latlngs, window.plugin.drawTools?.lineOptions as L.PolylineOptions)
                layerType = 'polyline'
            } else {
                layer = L.geodesicPolygon(latlngs, window.plugin.drawTools?.polygonOptions as L.PolylineOptions)
                layerType = 'polygon'
            }

            window.map.fire('draw:created', { layer, layerType })

            if ($('#bkmrkClearSelection').prop('checked')) {
                $('#bkmrksAutoDrawer a.bkmrk.selected').removeClass('selected')
            }

            if (this.isSmart) {
                window.show('map')
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            if (window.plugin.drawTools && !window.map.hasLayer(window.plugin.drawTools.drawnItems)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                window.map.addLayer(window.plugin.drawTools.drawnItems)
            }

            if (view) {
                window.map.fitBounds(layer.getBounds())
            }
        }
    }

    autoDrawOnSelect = (): void => {
        const latlngs: [number, number][] = []
        $('#bkmrksAutoDrawer a.bkmrk.selected').each((i, element) => {
            latlngs[i] = $(element).data('latlng') as [number, number]
        })

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const distanceElement = (distance: number): string => {
            const text = window.formatDistance(distance)
            return distance >= 200000 ? `<em title="Long distance link" class="help longdistance">${text}</em>` : text
        }

        let text = 'You must select 2 or 3 portals!'
        let color = 'red'

        if (latlngs.length === 2) {
            const distance = new L.LatLng(...latlngs[0]).distanceTo(latlngs[1])
            text = 'Distance between portals: ' + distanceElement(distance)
            color = ''
        } else if (latlngs.length === 3) {
            const distances = latlngs.map((ll1, i) => {
                const ll2 = latlngs[(i + 1) % 3]
                return distanceElement(new L.LatLng(...ll1).distanceTo(ll2))
            })
            text = 'Distances: ' + distances.join(', ')
            color = ''
        }

        $('#bkmrksAutoDrawer p').html(text).css('color', color)
    }

    dialogLoadList = (): string => {
        let r = 'The "<a href="@url_homepage@" target="_BLANK"><strong>Draw Tools</strong></a>" plugin is required.</span>'

        if (!window.plugin.bookmarks || !window.plugin.drawTools) {
            $('.ui-dialog-autodrawer .ui-dialog-buttonset .ui-button:not(:first)').hide()
        } else {
            const portalsList = JSON.parse(localStorage[this.store.KEY_STORAGE] as string) as BookmarksData
            let element = ''
            let elementTemporary = ''
            let elementGenericFolder = ''

            const list = portalsList.portals
            for (const idFolders in list) {
                const folders = list[idFolders]
                const folderLabel = `<a class="folderLabel" onclick="$(this).siblings('div').toggle();return false;">${folders.label}</a>`
                elementTemporary = `<div class="bookmarkFolder" id="${idFolders}">${folderLabel}<div>`

                const fold = folders.bkmrk
                for (const idBkmrk in fold) {
                    const bkmrk = fold[idBkmrk]
                    elementTemporary += `<a class="bkmrk" id="${idBkmrk}" onclick="$(this).toggleClass('selected');return false" data-latlng="[${bkmrk.latlng}]">${bkmrk.label}</a>`
                }
                elementTemporary += '</div></div>'

                if (idFolders === this.store.KEY_OTHER_BKMRK) {
                    elementGenericFolder += elementTemporary
                } else {
                    element += elementTemporary
                }
            }
            element += elementGenericFolder

            r =
                '<div id="bkmrksAutoDrawer">' +
                '<label style="margin-bottom: 9px; display: block;">' +
                '<input style="vertical-align: middle;" type="checkbox" id="bkmrkClearSelection" checked>' +
                ' Clear selection after drawing</label>' +
                '<p style="margin-bottom:9px;color:red">You must select 2 or 3 portals!</p>' +
                '<div onclick="window.plugin.bookmarks.autoDrawOnSelect();return false;">' +
                element +
                '</div>' +
                '</div>'
        }
        return r
    }

    onPortalSelected = (): void => {
        $('.bkmrksStar').remove()
        if (window.selectedPortal === null) return

        if (!this.onPortalSelectedPending) {
            this.onPortalSelectedPending = true
            setTimeout(() => {
                this.onPortalSelectedPending = false
                $('.bkmrksStar').remove()

                if (typeof Storage === 'undefined') {
                    $('#portaldetails > .imgpreview').after(this.htmlDisabledMessage)
                    return
                }
                if (this.isSmart) {
                    $('#updatestatus').prepend(this.htmlStar)
                    $('#updatestatus .bkmrksStar').attr('title', '')
                }
                $('#portaldetails > h3.title').prepend(this.htmlStar)
                this.service.updateStarPortal()
            }, 0)
        }
    }

    setupPortalsList = (): void => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const onBookmarkChanged = (data: Record<string, unknown>): void => {
            if (data.target === 'portal' && data.guid) {
                const guid = data.guid as string
                if (this.service.findByGuid(guid)) {
                    $(`[data-list-bookmark="${guid}"]`).addClass('favorite')
                } else {
                    $(`[data-list-bookmark="${guid}"]`).removeClass('favorite')
                }
            } else {
                $('[data-list-bookmark]').each((_i, element) => {
                    const guid = element.dataset.listBookmark ?? ''
                    if (this.service.findByGuid(guid)) {
                        $(element).addClass('favorite')
                    } else {
                        $(element).removeClass('favorite')
                    }
                })
            }
        }

        window.addHook('pluginBkmrksEdit', onBookmarkChanged)
        window.addHook('pluginBkmrksSyncEnd', onBookmarkChanged)

        window.plugin.portalslist!.fields.unshift({
            title: '',
            value: (portal) => portal.options.guid,
            sort: (guidA, guidB) => {
                const infoA = this.service.findByGuid(guidA as string)
                const infoB = this.service.findByGuid(guidB as string)
                if (infoA && !infoB) return 1
                if (infoB && !infoA) return -1
                return 0
            },
            format: (cell, portal, guid) => {
                $(cell).addClass('portal-list-bookmark').attr('data-list-bookmark', guid as string)
                $('<span>')
                    .appendTo(cell)[0]
                    .addEventListener('click', () => {
                        if (this.service.findByGuid(guid as string)) {
                            this.service.switchStarPortal(guid as string)
                        } else {
                            this.service.addPortalBookmarkByMarker(portal, true)
                        }
                    }, false)
                if (this.service.findByGuid(guid as string)) {
                    cell.className += ' favorite'
                }
            },
        })
    }

    setupContent = (): void => {
        this.htmlBoxTrigger =
            '<a id="bkmrksTrigger" class="open" onclick="window.plugin.bookmarks.switchStatusBkmrksBox(\'switch\');return false;" accesskey="v" title="[v]">[-] Bookmarks</a>'

        this.htmlBkmrksBox =
            '<div id="bookmarksBox">' +
            ' <div id="topBar">' +
            '  <a id="bookmarksMin" class="btn" onclick="window.plugin.bookmarks.switchStatusBkmrksBox(0);return false;" title="Minimize">-</a>' +
            '  <div class="handle">...</div>' +
            '  <a id="bookmarksDel" class="btn" onclick="window.plugin.bookmarks.deleteMode();return false;" title="Show/Hide \'X\' button">Show/Hide "X" button</a>' +
            ' </div>' +
            ' <div id="bookmarksTypeBar">' +
            '  <h5 class="bkmrk_maps current" onclick="window.plugin.bookmarks.switchPageBkmrksBox(this, 0);return false">Maps</h5>' +
            '  <h5 class="bkmrk_portals" onclick="window.plugin.bookmarks.switchPageBkmrksBox(this, 1);return false">Portals</h5>' +
            '  <div style="clear:both !important;"></div>' +
            ' </div>' +
            ' <div id="bkmrk_maps" class="bookmarkList current">' +
            '  <div class="addForm">' +
            '   <input placeholder="Insert label" />' +
            '   <a class="newMap" onclick="window.plugin.bookmarks.addElement(this, \'map\');return false;">+ Map</a>' +
            '   <a class="newFolder" onclick="window.plugin.bookmarks.addElement(this, \'folder\');return false;">+ Folder</a>' +
            '  </div>' +
            ' </div>' +
            ' <div id="bkmrk_portals" class="bookmarkList">' +
            '  <div class="addForm">' +
            '   <input placeholder="Insert label" />' +
            '   <a class="newFolder" onclick="window.plugin.bookmarks.addElement(this, \'folder\');return false;">+ Folder</a>' +
            '  </div>' +
            ' </div>' +
            ' <div style="border-bottom-width:1px;"></div>' +
            '</div>'

        this.htmlDisabledMessage = '<div title="Your browser do not support localStorage">Plugin Bookmarks disabled*.</div>'
        this.htmlStar =
            '<a class="bkmrksStar" accesskey="b" onclick="window.plugin.bookmarks.switchStarPortal();return false;" title="Save this portal in your bookmarks [b]"><span></span></a>'
        this.htmlMoveBtn =
            '<a id="bookmarksMove" class="btn" onclick="window.plugin.bookmarks.moveMode();return false;">Show/Hide "Move" button</a>'

        let actions = ''
        actions += '<a onclick="window.plugin.bookmarks.optReset();return false;">Reset bookmarks</a>'
        actions += '<a onclick="window.plugin.bookmarks.optCopy();return false;">Copy bookmarks</a>'
        actions += '<a onclick="window.plugin.bookmarks.optPaste();return false;">Paste bookmarks</a>'
        actions += '<a onclick="window.plugin.bookmarks.optImport();return false;">Import bookmarks</a>'
        actions += '<a onclick="window.plugin.bookmarks.optExport();return false;">Export bookmarks</a>'
        actions += '<a onclick="window.plugin.bookmarks.optRenameF();return false;">Rename Folder</a>'
        if (!window.isApp) {
            actions += '<a onclick="window.plugin.bookmarks.optBox(\'save\');return false;">Save box position</a>'
            actions += '<a onclick="window.plugin.bookmarks.optBox(\'reset\');return false;">Reset box position</a>'
        }
        this.htmlSetbox = `<div id="bkmrksSetbox">${actions}</div>`
    }
}
