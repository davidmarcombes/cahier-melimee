import { defineConfig } from '@marp-team/marp-cli'
import { Marp } from '@marp-team/marp-core'

export default defineConfig({
    inputDir: './doc',
    output: './_doc',
    themeSet: './doc',
    template: 'bespoke',
    html: true,
    allowLocalFiles: true
})


