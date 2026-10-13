import type { DataFile, Variable } from './types'
import { t as translate, tn as translateN, type Locale } from './i18n'
import { formatBytes, fileExt, isTabular } from './format'

/**
 * What the user has changed about a table: columns they added, and individual
 * cells they typed over. Cells are keyed by row, so edits survive changing the
 * file selection or switching version — a row that comes back keeps its notes.
 */
export interface TableEdit {
  /** Extra columns, in the order they were added. */
  extraColumns: string[]
  /** cells[rowKey][columnName] = typed value. */
  cells: Record<string, Record<string, string>>
}

export const EMPTY_EDIT: TableEdit = { extraColumns: [], cells: {} }

export interface TableRow {
  /** Stable identity for the row: the file name, or file + variable name. */
  key: string
  cells: string[]
}

export interface TableModel {
  id: string
  /** Sub-heading above this table, used for the per-file variable tables. */
  title?: string
  description?: string
  columns: string[]
  /** How many of the columns come from the dataset rather than the user. */
  baseColumnCount: number
  rows: TableRow[]
}

/** A cell value cannot contain a raw pipe or newline inside a markdown table. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()
}

function applyEdits(model: TableModel, edit: TableEdit): TableModel {
  const columns = [...model.columns, ...edit.extraColumns]
  const rows = model.rows.map((row) => {
    const typed = edit.cells[row.key] || {}
    const base = row.cells.map((cell, i) => {
      const name = model.columns[i]
      return typed[name] !== undefined ? typed[name] : cell
    })
    const extra = edit.extraColumns.map((name) => typed[name] ?? '')
    return { key: row.key, cells: [...base, ...extra] }
  })
  return { ...model, columns, rows, baseColumnCount: model.columns.length }
}

/** The Files table: one row per selected file. */
export function filesTable(
  selectedFiles: DataFile[],
  locale: Locale,
  edit: TableEdit = EMPTY_EDIT
): TableModel {
  const t = (key: string) => translate(key, locale)
  const model: TableModel = {
    id: 'files',
    columns: [
      t('readme.files.col.file'),
      t('readme.files.col.format'),
      t('readme.files.col.size'),
      t('readme.files.col.description'),
    ],
    baseColumnCount: 4,
    rows: selectedFiles.map((f) => ({
      key: f.name,
      cells: [
        `\`${f.name}\``,
        f.contentType || fileExt(f.name),
        formatBytes(f.size, locale) || '—',
        f.description || '—',
      ],
    })),
  }
  return applyEdits(model, edit)
}

/** One Variables table per tabular file. */
export function variableTables(
  selectedFiles: DataFile[],
  variableMap: Map<number, Variable[] | null>,
  locale: Locale,
  edit: TableEdit = EMPTY_EDIT
): TableModel[] {
  const t = (key: string) => translate(key, locale)
  return selectedFiles.filter(isTabular).map((f) => {
    const vars = variableMap.get(f.id)
    const model: TableModel = {
      id: `variables:${f.name}`,
      title: f.name,
      description: f.description || undefined,
      columns: [
        t('readme.variables.col.variable'),
        t('readme.variables.col.label'),
        t('readme.variables.col.type'),
      ],
      baseColumnCount: 3,
      rows: (vars || []).map((v) => ({
        key: `${f.name}::${v.name}`,
        cells: [`\`${v.name}\``, v.label || '—', v.type || '—'],
      })),
    }
    return applyEdits(model, edit)
  })
}

/**
 * Render a table as markdown.
 *
 * `legacySeparator` keeps the exact dashes the generator used before this
 * editor existed, so an untouched table produces byte-identical output. Once a
 * column is added the separator falls back to a plain one, which renders the
 * same.
 */
export function tableToMarkdown(model: TableModel, legacySeparator?: string): string[] {
  const lines: string[] = []
  lines.push(`| ${model.columns.map(escapeCell).join(' | ')} |`)
  const useLegacy = legacySeparator && model.columns.length === model.baseColumnCount
  lines.push(useLegacy ? legacySeparator! : `|${model.columns.map(() => '---').join('|')}|`)
  for (const row of model.rows) {
    lines.push(`| ${row.cells.map(escapeCell).join(' | ')} |`)
  }
  return lines
}

/** The sentence above the Files table. */
export function filesIntro(selectedCount: number, excluded: number, locale: Locale): string {
  const tn = (key: string, count: number) => translateN(key, count, locale)
  const note = excluded > 0 ? ` ${tn('readme.files.excluded', excluded)}` : ''
  return `${tn('readme.files.count', selectedCount)}${note}.`
}
