import { BookmarkStore } from './BookmarkStore'
import { UIRenderer } from './UiRenderer'

export class OptionsManager {
    constructor(private store: BookmarkStore, private ui: UIRenderer) {}

    manualOpt = (): void => {
        window.dialog({
            html: this.ui.htmlSetbox,
            dialogClass: 'ui-dialog-bkmrksSet',
            id: 'plugin-bookmarks-options',
            title: 'Bookmarks Options',
        })
        window.runHooks('pluginBkmrksOpenOpt', {})
    }

    optAlert = (message: string): void => {
        $('.ui-dialog-bkmrksSet .ui-dialog-buttonset').prepend(`<p class="bkrmks-alert" style="float:left;margin-top:4px;">${message}</p>`)
        $('.bkrmks-alert').delay(2500).fadeOut()
    }

    optCopy = (): void => {
        if (window.isApp && window.app?.shareString) {
            window.app.shareString(this.store.escapeUnicode(localStorage[this.store.KEY_STORAGE] as string))
        } else {
            window.dialog({
                html:
                    '<p><a onclick="$(\'.ui-dialog-bkmrksSet-copy textarea\').select();">Select all</a> and press CTRL+C to copy it.</p><textarea readonly>' +
                    this.store.escapeUnicode(localStorage[this.store.KEY_STORAGE] as string) +
                    '</textarea>',
                dialogClass: 'ui-dialog-bkmrksSet-copy',
                id: 'plugin-bookmarks-export',
                title: 'Bookmarks Export',
            })
        }
    }

    optExport = (): void => {
        window.saveFile(localStorage[this.store.KEY_STORAGE] as string, 'IITC-bookmarks.json', 'application/json')
    }

    optPaste = (): void => {
        const promptAction = prompt('Press CTRL+V to paste it.', '')
        if (promptAction !== null && promptAction !== '') {
            try {
                JSON.parse(promptAction)
                localStorage[this.store.KEY_STORAGE] = promptAction
                this.ui.refreshBkmrks()
                window.runHooks('pluginBkmrksEdit', { target: 'all', action: 'import' })
                console.log('BOOKMARKS: reset and imported bookmarks')
                this.optAlert('Successful. ')
            } catch (error) {
                console.warn('BOOKMARKS: failed to import data: ' + String(error))
                this.optAlert('<span style="color: #f88">Import failed </span>')
            }
        }
    }

    optImport = (): void => {
        L.FileListLoader.loadFiles({ accept: 'application/json' }).on('load', (fileEvent: { reader: FileReader }) => {
            try {
                JSON.parse(fileEvent.reader.result as string)
                localStorage[this.store.KEY_STORAGE] = fileEvent.reader.result as string
                this.ui.refreshBkmrks()
                window.runHooks('pluginBkmrksEdit', { target: 'all', action: 'import' })
                console.log('BOOKMARKS: reset and imported bookmarks')
                this.optAlert('Successful. ')
            } catch (error) {
                console.warn('BOOKMARKS: failed to import data: ' + String(error))
                this.optAlert('<span style="color: #f88">Import failed </span>')
            }
        })
    }

    optReset = (): void => {
        const promptAction = confirm('All bookmarks will be deleted. Are you sure?')
        if (promptAction) {
            localStorage.removeItem(this.store.KEY_STORAGE)
            this.store.createStorage()
            this.store.loadStorage()
            this.ui.refreshBkmrks()
            window.runHooks('pluginBkmrksEdit', { target: 'all', action: 'reset' })
            console.log('BOOKMARKS: reset all bookmarks')
            this.optAlert('Successful. ')
        }
    }

    optBox = (command: 'save' | 'reset'): void => {
        if (window.isApp) {
            this.optAlert('Only IITC desktop. ')
        } else {
            switch (command) {
                case 'save': {
                    const boxX = parseInt($('#bookmarksBox').css('top'))
                    const boxY = parseInt($('#bookmarksBox').css('left'))
                    this.store.statusBox.pos = { x: boxX, y: boxY }
                    this.store.saveStorageBox()
                    this.optAlert('Position acquired. ')
                    break
                }
                case 'reset':
                    $('#bookmarksBox').css({ top: 100, left: 100 })
                    this.optBox('save')
                    break
            }
        }
    }

    optRenameF = (): void => {
        window.dialog({
            html: this.ui.dialogLoadListFolders('bookmarksDialogRenameF', 'window.plugin.bookmarks.renameFolder', false, 0),
            dialogClass: 'ui-dialog-bkmrksSet-copy',
            id: 'plugin-bookmarks-rename-folder',
            title: 'Bookmarks Rename Folder',
        })
    }

    renameFolder = (element: Element): void => {
        const type = $(element).data('type') as 'maps' | 'portals'
        const idFold = $(element).data('id') as string
        const promptAction = prompt('Insert a new name.', '')
        if (promptAction !== null && promptAction !== '') {
            try {
                const newName = this.store.escapeHtml(promptAction)
                this.store.bkmrksObj[type][idFold].label = newName
                $(`#bookmarksDialogRenameF #${idFold}`).text(newName)
                this.store.saveStorage()
                this.ui.refreshBkmrks()
                window.runHooks('pluginBkmrksEdit', { target: 'all', action: 'import' })
                console.log('BOOKMARKS: renamed bookmarks folder')
                this.optAlert('Successful. ')
            } catch (error) {
                console.warn('BOOKMARKS: failed to rename folder: ' + String(error))
                this.optAlert('<span style="color: #f88">Rename failed </span>')
            }
        }
    }
}
