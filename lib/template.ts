import type { DatasetMeta, DataFile, Variable, Section } from './types'
import { t as translate, type Locale } from './i18n'
import { buildSections, titleBlock, type SectionBlock } from './sections'

// Re-exported so existing imports from '@/lib/template' keep working.
export { TABULAR_TYPES, isTabular, formatBytes, fileExt, buildTree } from './format'
export { buildSections, titleBlock } from './sections'
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
}

export function generateReadme(opts: GenerateOptions): string {
  const { meta: m, selectedFiles, allFiles, sections, variableMap } = opts
  const locale: Locale = opts.locale ?? 'en'
  const overrides = opts.overrides ?? {}
  const t = (key: string, vars?: Record<string, string | number>) => translate(key, locale, vars)

  const blocks: SectionBlock[] = buildSections({ meta: m, selectedFiles, allFiles, variableMap, locale })
  const parts: string[] = []

  // Title: always present, and editable like any other section.
  const title = titleBlock(m)
  parts.push((overrides.title || '').trim() ? `${overrides.title!.trim()}\n` : title.body)

  for (const block of blocks) {
    if (!sections.includes(block.section)) continue

    const typed = block.editable ? (overrides[block.section] || '').trim() : ''
    const body = typed ? `${typed}\n` : block.body

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
