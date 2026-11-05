import type { Section, GenerationMode, CustomSection } from './types'
import type { TableEdit } from './tables'

/**
 * Keeps work across a page reload, and only across a reload.
 *
 * sessionStorage, not localStorage: it survives refresh and is cleared when the
 * tab closes, which is the behaviour we want. A closed tab is covered by the
 * browser's own "Leave site?" prompt instead, so nothing outlives the session
 * and there are no stale drafts to reconcile days later.
 *
 * Because the only way a draft can exist is a reload of this same tab, it can
 * be restored without asking — there is no question of whose work it is or how
 * old. That is the main thing sessionStorage buys over localStorage here.
 *
 * Only what the user authored is kept. The dataset metadata, file list and
 * variable map are refetched, so a restored README is never built on top of
 * metadata that has since changed in Borealis. The API token is deliberately
 * absent: there is no reason to put a credential in browser storage.
 */

const KEY = 'readme-draft'
const SCHEMA = 1

export interface Draft {
  schema: number
  pid: string
  version: string
  savedAt: number
  mode: GenerationMode
  sections: Section[]
  sectionText: Partial<Record<Section, string>>
  customSections: CustomSection[]
  tableEdits: { files?: TableEdit; variables?: TableEdit }
  selectedIds: number[]
  variableIds: number[]
  markdown: string
}

export type DraftInput = Omit<Draft, 'schema' | 'savedAt'>

/** Is there anything a reload or a close would actually lose? */
export function hasEdits(d: {
  sectionText: Partial<Record<Section, string>>
  customSections: CustomSection[]
  tableEdits: { files?: TableEdit; variables?: TableEdit }
  markdown: string
}): boolean {
  return (
    Object.keys(d.sectionText).length > 0 ||
    d.customSections.length > 0 ||
    Object.keys(d.tableEdits).length > 0 ||
    d.markdown.length > 0
  )
}

/**
 * Every call is guarded: sessionStorage throws rather than returning empty when
 * storage is disabled or full, and a draft is a convenience — it must never be
 * the reason the app stops working.
 */
export function saveDraft(input: DraftInput): void {
  try {
    const draft: Draft = { ...input, schema: SCHEMA, savedAt: Date.now() }
    window.sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* storage unavailable or full — nothing to do about it */
  }
}

/**
 * Returns the draft only if it belongs to the dataset and version on screen.
 * A different dataset means the tab was reused for something else, and
 * restoring across that would put one dataset's README on another's metadata.
 */
export function loadDraft(pid: string, version: string): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft
    if (draft.schema !== SCHEMA) return null
    if (draft.pid !== pid || draft.version !== version) return null
    return draft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    /* as above */
  }
}
