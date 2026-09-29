import { t as translate, type Locale } from './i18n'

/**
 * How a section's plain text is shaped, and therefore how it converts back to
 * markdown. Each box is prefilled in its own shape, so the format teaches
 * itself: someone adding a line copies the pattern already there.
 */
export type SectionKind =
  | 'title'        // one line, becomes the # heading
  | 'prose'        // paragraphs, with "Label: value" lines picked out and bolded
  | 'list'         // one item per line, straight through as bullets
  | 'listName'     // "Name (detail)" → bold name, detail in brackets
  | 'listSoftware' // "R 4.3" → bold name, version after a v
  | 'contact'      // "Name — Affiliation — email" → email becomes a mailto link
  | 'publications' // "Citation — https://url" → citation with the URL beneath
  | 'quote'        // a block quotation
  | 'table'        // generated, not editable as text

/** A line the user has already formatted themselves is left alone. */
function looksLikeMarkdown(line: string): boolean {
  const s = line.trim()
  return (
    s.startsWith('- ') || s.startsWith('* ') || s.startsWith('> ') || s.startsWith('#') ||
    s.startsWith('|') || /\*\*/.test(s) || /\[.+\]\(.+\)/.test(s) || /^_.+_$/.test(s)
  )
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_ONLY = /^https?:\/\/\S+$/

function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split('\n')
}

/** Non-empty, trimmed lines. Used by every list-shaped section. */
function items(text: string): string[] {
  return splitLines(text).map((l) => l.trim()).filter(Boolean)
}

/**
 * Paragraph text where any "Label: value" lines are pulled out and bolded.
 * Consecutive label lines are joined with a markdown hard break so they sit as
 * one block, which is how the generated version looks.
 */
function renderProse(text: string): string {
  const out: string[] = []
  let labels: string[] = []

  const flushLabels = () => {
    if (labels.length) {
      out.push(labels.join('  \n') + '\n')
      labels = []
    }
  }

  for (const raw of splitLines(text)) {
    const line = raw.trim()
    if (!line) { flushLabels(); continue }

    if (looksLikeMarkdown(line)) { flushLabels(); out.push(line + '\n'); continue }

    const m = line.match(/^([A-Za-zÀ-ÿ][^:]{0,40}?)\s*:\s*(.+)$/)
    if (m) {
      const [, label, value] = m
      // A bare URL as the value becomes a link, which is how the DOI line reads.
      const shown = URL_ONLY.test(value.trim()) ? `[${value.trim()}](${value.trim()})` : value.trim()
      labels.push(`**${label.trim()}:** ${shown}`)
      continue
    }

    flushLabels()
    out.push(line + '\n')
  }
  flushLabels()
  return out.join('\n')
}

function renderList(text: string): string {
  const lines = items(text).map((l) => (looksLikeMarkdown(l) ? l : `- ${l}`))
  return lines.length ? lines.join('\n') + '\n' : ''
}

/** "Lee, Sam (Data Curator)" → "- **Lee, Sam** (Data Curator)" */
function renderListName(text: string): string {
  const lines = items(text).map((l) => {
    if (looksLikeMarkdown(l)) return l
    const m = l.match(/^(.+?)\s*\((.+)\)\s*$/)
    return m ? `- **${m[1].trim()}** (${m[2].trim()})` : `- **${l}**`
  })
  return lines.length ? lines.join('\n') + '\n' : ''
}

/** "R 4.3" → "- **R** v4.3". A trailing version-looking token is split off. */
function renderListSoftware(text: string): string {
  const lines = items(text).map((l) => {
    if (looksLikeMarkdown(l)) return l
    const m = l.match(/^(.*?)[\s]+v?([0-9][0-9._-]*)$/)
    return m ? `- **${m[1].trim()}** v${m[2]}` : `- **${l}**`
  })
  return lines.length ? lines.join('\n') + '\n' : ''
}

/** "Smith — UofT — s@x.ca" → the email becomes a mailto link. */
function renderContact(text: string): string {
  const lines = items(text).map((l) => {
    if (looksLikeMarkdown(l)) return l
    // Split on the em dash only: names contain commas ("Smith, Jean"), so a
    // comma is not a safe separator here.
    const parts = l.split(/\s*[—|]\s*/).map((p) => p.trim()).filter(Boolean)
    const shown = parts.map((p) => (EMAIL.test(p) ? `[${p}](mailto:${p})` : p))
    return `- ${shown.join(' — ')}`
  })
  return lines.length ? lines.join('\n') + '\n' : ''
}

/** "Smith 2024 — https://x" → citation, with the URL on a second line. */
function renderPublications(text: string, locale: Locale): string {
  const urlLabel = translate('readme.label.url', locale)
  const lines = items(text).map((l) => {
    if (looksLikeMarkdown(l)) return l
    const m = l.match(/^(.*?)\s*[—|]\s*(\S+)$/)
    if (m && (URL_ONLY.test(m[2]) || m[2].startsWith('doi:'))) {
      return `- ${m[1].trim()}  \n  ${urlLabel} ${m[2]}`
    }
    return `- ${l}`
  })
  return lines.length ? lines.join('\n') + '\n' : ''
}

function renderQuote(text: string): string {
  const body = items(text).map((l) => (l.startsWith('> ') ? l : `> ${l}`))
  return body.length ? body.join('\n') + '\n' : ''
}

/** Convert what the user typed into the markdown for that section. */
export function renderSection(kind: SectionKind, text: string, locale: Locale = 'en'): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  switch (kind) {
    case 'title':        return `# ${trimmed.replace(/^#\s*/, '')}\n`
    case 'list':         return renderList(trimmed)
    case 'listName':     return renderListName(trimmed)
    case 'listSoftware': return renderListSoftware(trimmed)
    case 'contact':      return renderContact(trimmed)
    case 'publications': return renderPublications(trimmed, locale)
    case 'quote':        return renderQuote(trimmed)
    case 'table':        return trimmed + '\n'
    case 'prose':
    default:             return renderProse(trimmed)
  }
}

/** One-line hint shown under each editor so the expected shape is visible. */
export function formatHint(kind: SectionKind): string {
  switch (kind) {
    case 'title':        return 'One line.'
    case 'list':         return 'One per line.'
    case 'listName':     return 'One per line, as Name (detail).'
    case 'listSoftware': return 'One per line, as Name 1.2.'
    case 'contact':      return 'One per line, as Name — Affiliation — email.'
    case 'publications': return 'One per line, as Citation — https://url.'
    case 'quote':        return 'Free text, shown as a quotation.'
    case 'prose':        return 'Free text. A line like "Subject: value" becomes a bold label.'
    default:             return ''
  }
}
