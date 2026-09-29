import type { DatasetMeta, DataFile, Variable, Section } from './types'
import { t as translate, tn as translateN, type Locale } from './i18n'
import { formatBytes, fileExt, isTabular } from './format'

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
}

export interface BuildOptions {
  meta: DatasetMeta
  selectedFiles: DataFile[]
  allFiles: DataFile[]
  variableMap: Map<number, Variable[] | null>
  locale?: Locale
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
    { placeholder = '', editable = true }: { placeholder?: string; editable?: boolean } = {}
  ) => {
    out.push({
      section,
      heading: `## ${t(`heading.${section}`)}\n`,
      body: lines.join('\n'),
      placeholder,
      editable,
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
    add('description', lines)
  }

  // ── Authors ─────────────────────────────────────────────────────────────────
  add('authors', m.authors ? [m.authors.split(';').map((a) => `- ${a.trim()}`).join('\n') + '\n'] : [])

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
    add('contact', lines)
  }

  // ── DOI ─────────────────────────────────────────────────────────────────────
  add('doi', [`${label('doi')} [${m.doi}](${m.doi})  \n${label('publisher')} ${m.publisher}\n`])

  // ── License ─────────────────────────────────────────────────────────────────
  {
    const lines = [`${t('readme.license.body')}\n`]
    if (m.license) lines.push(`${label('license')} ${m.license}\n`)
    add('license', lines)
  }

  // ── Version ─────────────────────────────────────────────────────────────────
  add('version', m.version ? [
    `${label('current_version')} ${m.version}  \n${label('year')} ${m.year || t('readme.version.not_specified')}\n`,
    `_${t('readme.version.history_note')}_\n`,
  ] : [])

  // ── Citation ────────────────────────────────────────────────────────────────
  {
    const authors = m.authors ? m.authors.split(';').map((a) => a.trim()).join(', ') : t('readme.citation.no_authors')
    add('citation', [`> ${authors} (${m.year || t('readme.citation.no_date')}). *${m.title}*. ${m.publisher}. ${m.doi}\n`])
  }

  // ── Related publications ────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.relatedPublications.length) {
      m.relatedPublications.forEach((p) => {
        if (p.citation) lines.push(`- ${p.citation}${p.url ? `  \n  ${t('readme.label.url')} ${p.url}` : ''}`)
      })
      lines.push('')
      add('related_publications', lines)
    } else {
      const prompt = t('readme.placeholder.related_publications')
      add('related_publications', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
    }
  }

  // ── Software ────────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.software.length) {
      m.software.forEach((s) => lines.push(`- **${s.name}**${s.version ? ` v${s.version}` : ''}`))
      lines.push('')
      add('software', lines)
    } else {
      const prompt = t('readme.placeholder.software')
      add('software', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
    }
  }

  // ── Methodology (always a prompt) ───────────────────────────────────────────
  {
    const prompt = t('readme.placeholder.methodology')
    add('methodology', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
  }

  // ── Data collection (always a prompt) ───────────────────────────────────────
  {
    const prompt = t('readme.placeholder.data_collection')
    add('data_collection', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
  }

  // ── Date of collection ──────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.dateOfCollection.length) {
      m.dateOfCollection.forEach((d) => { if (d.start || d.end) lines.push(`- ${range(d.start, d.end)}`) })
      lines.push('')
      add('date_of_collection', lines)
    } else {
      const prompt = t('readme.placeholder.date_of_collection')
      add('date_of_collection', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
    }
  }

  // ── Time period ─────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.timePeriod.length) {
      m.timePeriod.forEach((tp) => { if (tp.start || tp.end) lines.push(`- ${range(tp.start, tp.end)}`) })
      lines.push('')
      add('time_period', lines)
    } else {
      const prompt = t('readme.placeholder.time_period')
      add('time_period', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
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
      add('geographic_coverage', lines)
    } else {
      const prompt = t('readme.placeholder.geographic_coverage')
      add('geographic_coverage', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
    }
  }

  // ── Contributors ────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.contributors.length) {
      m.contributors.forEach((c) => lines.push(`- **${c.name}**${c.type ? ` (${c.type})` : ''}`))
      lines.push('')
      add('contributors', lines)
    } else {
      const prompt = t('readme.placeholder.contributors')
      add('contributors', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
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
      add('funding', lines)
    } else {
      const prompt = t('readme.placeholder.funding')
      add('funding', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
    }
  }

  // ── Data sources ────────────────────────────────────────────────────────────
  {
    const lines: string[] = []
    if (m.dataSources.length) {
      m.dataSources.forEach((s) => lines.push(`- ${s}`))
      lines.push('')
      add('data_sources', lines)
    } else {
      const prompt = t('readme.placeholder.data_sources')
      add('data_sources', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
    }
  }

  // ── Files (generated table, read-only) ──────────────────────────────────────
  {
    const lines: string[] = []
    const excluded = allFiles.length - selectedFiles.length
    const note = excluded > 0 ? ` ${tn('readme.files.excluded', excluded)}` : ''
    lines.push(`${tn('readme.files.count', selectedFiles.length)}${note}.\n`)
    lines.push(`| ${t('readme.files.col.file')} | ${t('readme.files.col.format')} | ${t('readme.files.col.size')} | ${t('readme.files.col.description')} |`)
    lines.push(`|------|--------|------|-------------|`)
    for (const f of selectedFiles) {
      lines.push(`| \`${f.name}\` | ${f.contentType || fileExt(f.name)} | ${formatBytes(f.size, locale) || '—'} | ${f.description || '—'} |`)
    }
    lines.push('')
    add('files', lines, { editable: false })
  }

  // ── Variables (generated tables, read-only) ─────────────────────────────────
  {
    const lines: string[] = []
    const tabular = selectedFiles.filter(isTabular)
    if (tabular.length) {
      lines.push(`${t('readme.variables.intro')}\n`)
      for (const f of tabular) {
        lines.push(`### \`${f.name}\``)
        if (f.description) lines.push(`${f.description}\n`)
        const vars = variableMap.get(f.id)
        if (vars && vars.length) {
          lines.push(`| ${t('readme.variables.col.variable')} | ${t('readme.variables.col.label')} | ${t('readme.variables.col.type')} |`)
          lines.push(`|----------|-------|------|`)
          for (const v of vars) lines.push(`| \`${v.name}\` | ${v.label || '—'} | ${v.type || '—'} |`)
          lines.push('')
        } else {
          lines.push(`_${t('readme.variables.unavailable')}_\n`)
        }
      }
    } else {
      lines.push(`_${t('readme.variables.none')}_\n`)
    }
    add('variables', lines, { editable: false })
  }

  // ── Abbreviations (always a prompt) ─────────────────────────────────────────
  {
    const prompt = t('readme.placeholder.abbreviations')
    add('abbreviations', [PLACEHOLDER(prompt) + '\n'], { placeholder: prompt })
  }

  return out
}

/** The `# Title` line. Separate because it carries no `##` heading. */
export function titleBlock(meta: DatasetMeta): SectionBlock {
  return { section: 'title', heading: '', body: `# ${meta.title}\n`, placeholder: '', editable: true }
}
