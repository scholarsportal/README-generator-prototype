import type { DataFile, TreeNode } from './types'
import { t as translate, type Locale } from './i18n'

// Split out of template.ts so lib/sections.ts can use these without the two
// files importing each other. template.ts re-exports them, so existing imports
// from '@/lib/template' keep working.

export const TABULAR_TYPES = new Set([
  'text/csv', 'text/tsv', 'text/tab-separated-values',
  'application/x-stata', 'application/x-stata-dta',
  'application/x-spss-sav', 'application/x-spss-por',
  'application/x-r-data', 'application/x-rlang-transport',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

export function isTabular(f: DataFile): boolean {
  return TABULAR_TYPES.has(f.contentType) || /\.(csv|tsv|tab|dta|sav|por|rdata|rds|xlsx?)$/i.test(f.name)
}

// locale is optional so existing callers (the sidebar file list) keep working
// unchanged and get English. French uses o/Ko/Mo and a decimal comma.
export function formatBytes(bytes: number, locale: Locale = 'en'): string {
  if (!bytes) return ''
  const num = (n: number) => (locale === 'fr' ? n.toFixed(1).replace('.', ',') : n.toFixed(1))
  const sep = locale === 'fr' ? '\u00a0' : ' '
  if (bytes < 1024) return `${bytes}${sep}${translate('unit.bytes', locale)}`
  if (bytes < 1048576) return `${num(bytes / 1024)}${sep}${translate('unit.kb', locale)}`
  return `${num(bytes / 1048576)}${sep}${translate('unit.mb', locale)}`
}

export function fileExt(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE'
}

export function buildTree(files: DataFile[]): TreeNode {
  const root: TreeNode = { files: [], dirs: {} }
  files.forEach((f, i) => {
    const parts = (f.directoryLabel || '').split('/').filter(Boolean)
    let node = root
    for (const p of parts) {
      if (!node.dirs[p]) node.dirs[p] = { files: [], dirs: {} }
      node = node.dirs[p]
    }
    node.files.push({ ...f, index: i })
  })
  return root
}
