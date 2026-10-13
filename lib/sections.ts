import type { DatasetMeta, DataFile, Variable, Section } from './types'
import { t as translate, tn as translateN, type Locale } from './i18n'
import { formatBytes, fileExt, isTabular } from './format'
import type { SectionKind } from './plaintext'
import { filesTable, variableTables, tableToMarkdown, filesIntro, EMPTY_EDIT, type TableEdit, type TableModel } from './tables'

export interface SectionBlock {
  section: Section
  /** The `## Heading` line, already translated. Empty for the title block. */
  heading: string
  /** The default body, exactly as it appears in the README when nothing is edited. */
  body: string
  /**
   * Guidance text shown as a grey placeholder in the editor. Set only when the
   * section has no dataset metadata behind it, so the box starts empty and the
   * user writes their own content; leaving it empty keeps the italic prompt.
   */
  placeholder: string
  /** False for the generated tables, which are shown read-only. */
  editable: boolean
  /**
   * The same content as plain text — what the editor shows. Converted back to
   * markdown at generation by renderSection(), using `kind`.
   */
  plain: string
  /** The shape of this section's plain text, and how it converts back. */
  kind: SectionKind
  /** For the table sections: the grid behind the markdown, with edits applied. */
  tables?: TableModel[]
}

export interface BuildOptions {
  meta: DatasetMeta
  selectedFiles: DataFile[]
  allFiles: DataFile[]
  variableMap: Map<number, Variable[] | null>
  locale?: Locale
  /** Columns added and cells typed in the Files and Variables grids. */
  tableEdits?: { files?: TableEdit; variables?: TableEdit }
}

const PLACEHOLDER = (text: string) => `_${text}_`

/** The order sections appear in the finished README. */
export const SECTION_ORDER: Section[] = [
  'description', 'authors', 'contact', 'doi', 'license', 'version', 'citation',
  'related_publications', 'software', 'methodology', 'data_collection',
  'date_of_collection', 'time_period', 'geographic_coverage', 'contributors',
  'funding', 'data_sources', 'files', 'variables', 'abbreviations',
]

/**
 * Build every section's content from the dataset.
 *
 * Returns one block per section in README order, whatever the user has ticked —
 * the caller filters. A block whose `body` is empty is one the dataset has no
 * content for (no authors, no version); those are dropped from the output
 * unless the user types something.
 */
export function buildSections(opts: BuildOptions): SectionBlock[] {
  const { meta: m, selectedFiles, allFiles, variableMap } = opts
  const locale: Locale = opts.locale ?? 'en'

  const t = (key: string, vars?: Record<string, string | number>) => translate(key, locale, vars)
  const tn = (key: string, count: number, vars?: Record<string, string | number>) => translateN(key, count, locale, vars)
  const label = (key: string) => `**${t(`readme.label.${key}`)}**`
  const range = (start: string, end: string) =>
    start && end ? t('readme.range.between', { start, end })
    : start      ? t('readme.range.from', { start })
    :              t('readme.range.until', { end })

  const out: SectionBlock[] = []
  const add = (
    section: Section,
    lines: string[],
    opts: { placeholder?: string; editable?: boolean; plain?: string; kind?: SectionKind; tables?: TableModel[] } = {}
  ) => {
    out.push({
      section,
      heading: `## ${t(`heading.${section}`)}\n`,
      body: lines.join('\n'),
      placeholder: opts.placeholder ?? '',
      editable: opts.editable ?? true,
      plain: opts.plain ?? '',
      kind: opts.kind ?? 'prose',
      tables: opts.tables,
    })
  }

  // ── Description ─────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.description) lines.push(`${m.description}\n`)
    const bits = [
      m.subject  && `${label('subject')} ${m.subject}`,
      m.keywords && `${label('keywords')} ${m.keywords}`,
    ].filter(Boolean) as string[]
    if (bits.length) lines.push(bits.join('  \n') + '\n')
    // Label lines stay on consecutive lines so they render as one block, the
    // way the generated version does.
    const plainLabels = [
      m.subject  && `${t('readme.label.subject')} ${m.subject}`,
      m.keywords && `${t('readme.label.keywords')} ${m.keywords}`,
    ].filter(Boolean).join('\n')
    const plainDesc = [m.description, plainLabels].filter(Boolean).join('\n\n')
    add('description', lines, { kind: 'prose', plain: plainDesc })
  }

  // ── Authors ─────────────────────────────────────────────────────────────────
  add('authors', m.authors ? [m.authors.split(';').map((a) => `- ${a.trim()}`).join('\n') + '\n'] : [], {
    kind: 'list',
    plain: m.authors ? m.authors.split(';').map((a) => a.trim()).filter(Boolean).join('\n') : '',
  })

  // ── Contact ─────────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.contact.length) {
      m.contact.forEach((c) => {
        const line = [c.name, c.affiliation, c.email ? `[${c.email}](mailto:${c.email})` : ''].filter(Boolean).join(' — ')
        lines.push(`- ${line}`)
      })
      lines.push('')
    } else {
      lines.push(`${t('readme.contact.fallback', { url: m.doi })}\n`)
    }
    add('contact', lines, {
      kind: 'contact',
      plain: m.contact
        .map((c) => [c.name, c.affiliation, c.email].filter(Boolean).join(' — '))
        .join('\n'),
      placeholder: m.contact.length ? '' : 'Smith, Jean — University of Toronto — jean.smith@utoronto.ca',
    })
  }

  // ── DOI ─────────────────────────────────────────────────────────────────────
  add('doi', [`${label('doi')} [${m.doi}](${m.doi})  \n${label('publisher')} ${m.publisher}\n`], {
    kind: 'prose',
    plain: `${t('readme.label.doi')} ${m.doi}\n${t('readme.label.publisher')} ${m.publisher}`,
  })

  // ── License ─────────────────────────────────────────────────────────────────
  {
    const lines = [`${t('readme.license.body')}\n`]
    if (m.license) lines.push(`${label('license')} ${m.license}\n`)
    add('license', lines, {
      kind: 'prose',
      plain: [t('readme.license.body'), m.license && `${t('readme.label.license')} ${m.license}`].filter(Boolean).join('\n\n'),
    })
  }

  // ── Version ─────────────────────────────────────────────────────────────────
  add('version', m.version ? [
    `${label('current_version')} ${m.version}  \n${label('year')} ${m.year || t('readme.version.not_specified')}\n`,
    `_${t('readme.version.history_note')}_\n`,
  ] : [], {
    kind: 'prose',
    plain: m.version
      ? `${t('readme.label.current_version')} ${m.version}\n${t('readme.label.year')} ${m.year || t('readme.version.not_specified')}\n\n${t('readme.version.history_note')}`
      : '',
  })

  // ── Citation ────────────────────────────────────────────────────────────────
  {
    const authors = m.authors ? m.authors.split(';').map((a) => a.trim()).join(', ') : t('readme.citation.no_authors')
    add('citation', [`> ${authors} (${m.year || t('readme.citation.no_date')}). *${m.title}*. ${m.publisher}. ${m.doi}\n`], {
      kind: 'quote',
      plain: `${authors} (${m.year || t('readme.citation.no_date')}). ${m.title}. ${m.publisher}. ${m.doi}`,
    })
  }

  // ── Related publications ────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.relatedPublications.length) {
      m.relatedPublications.forEach((p) => {
        if (p.citation) lines.push(`- ${p.citation}${p.url ? `  \n  ${t('readme.label.url')} ${p.url}` : ''}`)
      })
      lines.push('')
      add('related_publications', lines, {
        kind: 'publications',
        plain: m.relatedPublications
          .filter((p) => p.citation || p.url)
          .map((p) => [p.citation, p.url].filter(Boolean).join(' — '))
          .join('\n'),
      })
    } else {
      const prompt = t('readme.placeholder.related_publications')
      add('related_publications', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'publications' })
    }
  }

  // ── Software ────────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.software.length) {
      m.software.forEach((s) => lines.push(`- **${s.name}**${s.version ? ` v${s.version}` : ''}`))
      lines.push('')
      add('software', lines, {
        kind: 'listSoftware',
        plain: m.software.map((sw) => [sw.name, sw.version].filter(Boolean).join(' ')).join('\n'),
      })
    } else {
      const prompt = t('readme.placeholder.software')
      add('software', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'listSoftware' })
    }
  }

  // ── Methodology (always a prompt) ───────────────────────────────────────────
  {
    const prompt = t('readme.placeholder.methodology')
    add('methodology', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'prose' })
  }

  // ── Data collection (always a prompt) ───────────────────────────────────────
  {
    const prompt = t('readme.placeholder.data_collection')
    add('data_collection', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'prose' })
  }

  // ── Date of collection ──────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.dateOfCollection.length) {
      m.dateOfCollection.forEach((d) => { if (d.start || d.end) lines.push(`- ${range(d.start, d.end)}`) })
      lines.push('')
      add('date_of_collection', lines, {
        kind: 'list',
        plain: m.dateOfCollection.filter((d) => d.start || d.end).map((d) => range(d.start, d.end)).join('\n'),
      })
    } else {
      const prompt = t('readme.placeholder.date_of_collection')
      add('date_of_collection', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'list' })
    }
  }

  // ── Time period ─────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.timePeriod.length) {
      m.timePeriod.forEach((tp) => { if (tp.start || tp.end) lines.push(`- ${range(tp.start, tp.end)}`) })
      lines.push('')
      add('time_period', lines, {
        kind: 'list',
        plain: m.timePeriod.filter((tp) => tp.start || tp.end).map((tp) => range(tp.start, tp.end)).join('\n'),
      })
    } else {
      const prompt = t('readme.placeholder.time_period')
      add('time_period', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'list' })
    }
  }

  // ── Geographic coverage ─────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.geographicCoverage.length) {
      m.geographicCoverage.forEach((g) => {
        const loc = [g.city, g.state, g.country, g.other].filter(Boolean).join(', ')
        if (loc) lines.push(`- ${loc}`)
      })
      lines.push('')
      add('geographic_coverage', lines, {
        kind: 'list',
        plain: m.geographicCoverage
          .map((g) => [g.city, g.state, g.country, g.other].filter(Boolean).join(', '))
          .filter(Boolean)
          .join('\n'),
      })
    } else {
      const prompt = t('readme.placeholder.geographic_coverage')
      add('geographic_coverage', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'list' })
    }
  }

  // ── Contributors ────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.contributors.length) {
      m.contributors.forEach((c) => lines.push(`- **${c.name}**${c.type ? ` (${c.type})` : ''}`))
      lines.push('')
      add('contributors', lines, {
        kind: 'listName',
        plain: m.contributors.map((c) => (c.type ? `${c.name} (${c.type})` : c.name)).join('\n'),
      })
    } else {
      const prompt = t('readme.placeholder.contributors')
      add('contributors', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'listName' })
    }
  }

  // ── Funding ─────────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.funding.length) {
      m.funding.forEach((f) => {
        const line = [f.agency, f.grant ? t('readme.funding.grant', { grant: f.grant }) : ''].filter(Boolean).join(' — ')
        lines.push(`- ${line}`)
      })
      lines.push('')
      add('funding', lines, {
        kind: 'list',
        plain: m.funding
          .map((f) => [f.agency, f.grant ? t('readme.funding.grant', { grant: f.grant }) : ''].filter(Boolean).join(' — '))
          .join('\n'),
      })
    } else {
      const prompt = t('readme.placeholder.funding')
      add('funding', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'list' })
    }
  }

  // ── Data sources ────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.dataSources.length) {
      m.dataSources.forEach((s) => lines.push(`- ${s}`))
      lines.push('')
      add('data_sources', lines, { kind: 'list', plain: m.dataSources.filter(Boolean).join('\n') })
    } else {
      const prompt = t('readme.placeholder.data_sources')
      add('data_sources', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'list' })
    }
  }

  // ── Files (a grid: columns can be added, cells typed over) ──────────────────
  {
    const model = filesTable(selectedFiles, locale, opts.tableEdits?.files ?? EMPTY_EDIT)
    const lines: string[] = []
    lines.push(`${filesIntro(selectedFiles.length, allFiles.length - selectedFiles.length, locale)}\n`)
    lines.push(...tableToMarkdown(model, '|------|--------|------|-------------|'))
    lines.push('')
    add('files', lines, { editable: false, kind: 'table', tables: [model] })
  }

  // ── Variables (one grid per tabular file) ───────────────────────────────────
  {
    const lines: string[] = []
    const tabular = selectedFiles.filter(isTabular)
    // Read-only: variable names, labels and types come from the ingest, so
    // any edit still sitting in state is deliberately ignored rather than
    // reaching the generated README.
    const models = variableTables(selectedFiles, variableMap, locale, EMPTY_EDIT)
    if (tabular.length) {
      lines.push(`${t('readme.variables.intro')}\n`)
      tabular.forEach((f, i) => {
        const model = models[i]
        lines.push(`### \`${f.name}\``)
        if (f.description) lines.push(`${f.description}\n`)
        if (model && model.rows.length) {
          lines.push(...tableToMarkdown(model, '|----------|-------|------|'))
          lines.push('')
        } else {
          lines.push(`_${t('readme.variables.unavailable')}_\n`)
        }
      })
    } else {
      lines.push(`_${t('readme.variables.none')}_\n`)
    }
    add('variables', lines, { editable: false, kind: 'table', tables: models })
  }

  // ── Abbreviations (always a prompt) ─────────────────────────────────────────
  {
    const prompt = t('readme.placeholder.abbreviations')
    add('abbreviations', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt, kind: 'prose' })
  }

  return out
}

/** The `# Title` line. Separate because it carries no `##` heading. */
export function titleBlock(meta: DatasetMeta): SectionBlock {
  return {
    section: 'title', heading: '', body: `# ${meta.title}\n`,
    placeholder: '', editable: true, plain: meta.title, kind: 'title',
  }
}
