import * as Plugin from 'iitcpluginkit'
import { Bookmarks } from './Bookmarks'

// @ts-expect-error we don't want to import JSON files :(
import plugin from '../plugin.json'

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const PLUGIN_NAME = plugin.name.replace('IITC plugin: ', '') as string

class Main implements Plugin.Class {
    init() {
        console.log(`${PLUGIN_NAME} - ${VERSION}`)

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./styles.css')

        window.plugin.bookmarks = new Bookmarks()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        window.plugin.bookmarks.setup()
    }
}

Plugin.Register(new Main, PLUGIN_NAME)
