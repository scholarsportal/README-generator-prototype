'use client'

import { useState } from 'react'
import type { TableModel, TableEdit } from '@/lib/tables'
import styles from './Sidebar.module.css'

/**
 * The Files and Variables tables as an editable grid.
 *
 * Every cell can be typed over, and columns can be added for things the
 * dataset does not carry — author's notes, units, anything. Edits are stored
 * against the row's own key (the file name, or file + variable), so they
 * survive changing the file selection or switching version.
 */
export default function SectionTable({
  models,
  edit,
  onCellChange,
  onAddColumn,
  onRemoveColumn,
  onRenameColumn,
  emptyNote,
}: {
  models: TableModel[]
  edit: TableEdit
  onCellChange: (rowKey: string, column: string, value: string) => void
  onAddColumn: (name: string) => void
  onRemoveColumn: (name: string) => void
  onRenameColumn: (from: string, to: string) => void
  emptyNote?: string
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const hasRows = models.some((m) => m.rows.length > 0)

  function commitNewColumn() {
    const name = newName.trim()
    if (name && !edit.extraColumns.includes(name)) onAddColumn(name)
    setNewName('')
    setAdding(false)
  }

  return (
    <div className={styles.tableEditor}>
      {!hasRows && <div className={styles.sectionNote}>{emptyNote}</div>}

      {models.map((model) => (
        <div key={model.id} className={styles.tableBlock}>
          {model.title && <div className={styles.tableTitle}>{model.title}</div>}

          {model.rows.length === 0 ? (
            <div className={styles.sectionNote}>No rows yet.</div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.grid}>
                <thead>
                  <tr>
                    {model.columns.map((col, i) => {
                      const isExtra = i >= model.baseColumnCount
                      return (
                        <th key={col + i} className={isExtra ? styles.gridThExtra : styles.gridTh}>
                          {isExtra ? (
                            <span className={styles.gridThInner}>
                              <input
                                className={styles.gridColInput}
                                value={col}
                                onChange={(e) => onRenameColumn(col, e.target.value)}
                                aria-label={`Column name: ${col}`}
                              />
                              <button
                                type="button"
                                className={styles.gridColRemove}
                                onClick={() => onRemoveColumn(col)}
                                title={`Remove ${col}`}
                                aria-label={`Remove column ${col}`}
                              >
                                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </span>
                          ) : (
                            col
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {model.rows.map((row) => (
                    <tr key={row.key}>
                      {row.cells.map((cell, i) => (
                        <td key={i} className={styles.gridTd}>
                          <input
                            className={styles.gridCell}
                            value={cell}
                            onChange={(e) => onCellChange(row.key, model.columns[i], e.target.value)}
                            aria-label={`${model.columns[i]} for ${row.key}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      <div className={styles.tableFoot}>
        {adding ? (
          <span className={styles.addColRow}>
            <input
              className={styles.gridColInput}
              value={newName}
              autoFocus
              placeholder="Column name"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNewColumn()
                if (e.key === 'Escape') { setNewName(''); setAdding(false) }
              }}
              onBlur={commitNewColumn}
            />
            <button
              type="button"
              className={styles.addColConfirm}
              // The input's onBlur also commits, so the default mousedown is
              // suppressed to keep focus and let this click be the only commit.
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitNewColumn}
              title="Add column"
              aria-label="Add column"
            >
              +
            </button>
          </span>
        ) : (
          <button type="button" className={styles.addColBtn} onClick={() => setAdding(true)}>
            + column
          </button>
        )}
        <span className={styles.tableHint}>
          Cells you type over replace the dataset value. Columns apply to every row.
        </span>
      </div>
    </div>
  )
}
