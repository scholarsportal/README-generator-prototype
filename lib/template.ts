import type { DatasetMeta, DataFile, Variable, Section } from './types'
import { t as translate, type Locale } from './i18n'
import { buildSections, titleBlock, type SectionBlock } from './sections'
import { renderSection } from './plaintext'
import type { TableEdit } from './tables'

// Re-exported so existing imports from '@/lib/template' keep working.
export { TABULAR_TYPES, isTabular, formatBytes, fileExt, buildTree } from './format'
export { buildSections, titleBlock } from './sections'
export { renderSection, formatHint } from './plaintext'
export type { SectionKind } from './plaintext'
export { filesTable, variableTables, EMPTY_EDIT } from './tables'
export type { TableEdit, TableModel, TableRow } from './tables'
export type { SectionBlock } from './sections'

const FOOTER_URL = 'https://github.com/scholarsportal/README-generator'

export interface GenerateOptions {
  meta: DatasetMeta
  selectedFiles: DataFile[]
  allFiles: DataFile[]
  sections: Section[]
  variableMap: Map<number, Variable[] | null>
  customSections?: { id: string; title: string; content: string }[]
  /** Language for headings, labels and prompts. Dataset metadata is never translated. */
  locale?: Locale
  /**
   * Text the user typed for a section, keyed by section name. A section not
   * listed here uses the dataset's own content; an entry that is blank is
   * treated as "nothing typed" and falls back to it too.
   */
  overrides?: Partial<Record<Section, string>>
  /** Columns added and cells typed in the Files and Variables grids. */
  tableEdits?: { files?: TableEdit; variables?: TableEdit }
}

export function generateReadme(opts: GenerateOptions): string {
  const { meta: m, selectedFiles, allFiles, sections, variableMap } = opts
  const locale: Locale = opts.locale ?? 'en'
  const overrides = opts.overrides ?? {}
  const t = (key: string, vars?: Record<string, string | number>) => translate(key, locale, vars)

  const blocks: SectionBlock[] = buildSections({ meta: m, selectedFiles, allFiles, variableMap, locale, tableEdits: opts.tableEdits })
  const parts: string[] = []

  // Title: always present, and editable like any other section. What the user
  // typed is plain text, so it goes through the converter for its shape.
  const title = titleBlock(m)
  const typedTitle = (overrides.title || '').trim()
  parts.push(typedTitle ? renderSection(title.kind, typedTitle, locale) : title.body)

  for (const block of blocks) {
    if (!sections.includes(block.section)) continue

    // Editors hold plain text; renderSection turns it back into markdown using
    // the shape declared for that section.
    const typed = block.editable ? (overrides[block.section] || '').trim() : ''
    const body = typed ? renderSection(block.kind, typed, locale) : block.body

    // An empty body means the dataset has nothing for this section (no authors,
    // no version) and the user typed nothing either, so it is left out.
    if (!body.trim()) continue

    parts.push(block.heading)
    parts.push(body)
  }

  // Custom sections: the user's own title and content, never translated.
  if (opts.customSections && opts.customSections.length) {
    for (const cs of opts.customSections) {
      if (cs.title || cs.content) {
        parts.push(`## ${cs.title || t('heading.untitled_section')}\n`)
        parts.push(`${cs.content}\n`)
      }
    }
  }

  parts.push(`---\n_${t('readme.footer', { url: FOOTER_URL, date: new Date().toISOString().split('T')[0] })}_`)

  return parts.join('\n')
}
