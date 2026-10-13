'use client'

import { useState } from 'react'
import type { DatasetMeta, DataFile, Section, GenerationMode, CustomSection } from '@/lib/types'
import { SECTION_META, PINK_SECTIONS, GREEN_SECTIONS } from '@/lib/types'
import { formatBytes, fileExt, buildTree, isTabular } from '@/lib/template'
import type { SectionBlock } from '@/lib/sections'
import { formatHint } from '@/lib/plaintext'
import type { TableEdit } from '@/lib/tables'
import { EMPTY_EDIT } from '@/lib/tables'
import SectionTable from './SectionTable'
import type { TreeNode } from '@/lib/types'
import styles from './Sidebar.module.css'

interface SidebarProps {
  token: string
  onTokenChange: (t: string) => void
  hasSignedUrls: boolean
  fetching: boolean
  meta: DatasetMeta | null
  files: DataFile[]
  selectedIds: Set<number>
  variableIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void
  onToggleVariable: (id: number, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  sections: Section[]
  onToggleSection: (s: Section) => void
  mode: GenerationMode
  onModeChange: (m: GenerationMode) => void
  customSections: CustomSection[]
  onAddCustomSection: (section: CustomSection) => void
  onRemoveCustomSection: (id: string) => void
  onUpdateCustomSection: (id: string, field: 'title' | 'content', value: string) => void
  hasReadme: boolean
  version: string
  versions: { label: string; value: string }[]
  onVersionChange: (v: string) => void
  onGenerate: () => void
  generating: boolean
  error: string
  /** Each section's content as it will appear, keyed by section. */
  sectionBlocks: Partial<Record<Section, SectionBlock>>
  /** Text the user has typed, keyed by section. Absent = using the dataset's own content. */
  sectionText: Partial<Record<Section, string>>
  onSectionTextChange: (s: Section, value: string) => void
  onSectionReset: (s: Section) => void
  /** Columns added and cells typed in the Files and Variables grids. */
  tableEdits: { files?: TableEdit; variables?: TableEdit }
  onTableEditChange: (which: 'files' | 'variables', edit: TableEdit) => void
  /** Called when the Variables editor opens, so its data can be fetched. */
  onNeedVariables?: () => void
  /** True before anything is generated: the panel is centred and roomier. */
  wide: boolean
}

export default function Sidebar({
  fetching,
  meta, files, selectedIds, variableIds, onToggleFile, onToggleVariable, onToggleAll,
  sections, onToggleSection,
  mode, onModeChange,
  customSections, onAddCustomSection, onRemoveCustomSection, onUpdateCustomSection,
  hasReadme, version, versions, onVersionChange,
  onGenerate, generating,
  error,
  sectionBlocks, sectionText, onSectionTextChange, onSectionReset, wide,
  tableEdits, onTableEditChange, onNeedVariables,
}: SidebarProps) {
  const tree = files.length ? buildTree(files) : null
  const canGenerate = !!meta && selectedIds.size > 0 && !generating

  const allMinChecked = PINK_SECTIONS.every((s) => sections.includes(s))
  const allEnhChecked = GREEN_SECTIONS.every((s) => sections.includes(s))

  const tabularFiles = files.filter(isTabular)
  const allFilesChecked = files.length > 0 && files.every((f) => selectedIds.has(f.id))
  const allVarsChecked = tabularFiles.length > 0 && tabularFiles.every((f) => variableIds.has(f.id))
  const hasRestricted = files.some((f) => f.restricted)

  // counts
  const fileCount = selectedIds.size
  const fileTotal = files.length
  const varCount = variableIds.size
  const varTotal = tabularFiles.length

  // Which section editors are open. Several can be open at once.
  const [expanded, setExpanded] = useState<Set<Section>>(new Set())
  function toggleExpanded(s: Section) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(s)) {
        next.delete(s)
      } else {
        next.add(s)
        // Variable metadata is a separate request, so it is only fetched when
        // someone actually opens that editor.
        if (s === 'variables') onNeedVariables?.()
      }
      return next
    })
  }

  // Open or close a whole group of sections at once. Expanding a group that
  // contains Variables triggers the same fetch as opening it on its own.
  function setExpandedFor(list: Section[], open: boolean) {
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const s of list) {
        if (open) next.add(s)
        else next.delete(s)
      }
      return next
    })
    if (open && list.includes('variables')) onNeedVariables?.()
  }

  function expandControls(list: Section[]) {
    const anyOpen = list.some((s) => expanded.has(s))
    const allOpen = list.every((s) => expanded.has(s))
    return (
      <span className={styles.expandControls}>
        <button
          type="button"
          className={styles.expandAllBtn}
          onClick={() => setExpandedFor(list, true)}
          disabled={allOpen}
        >
          expand all
        </button>
        <button
          type="button"
          className={styles.expandAllBtn}
          onClick={() => setExpandedFor(list, false)}
          disabled={!anyOpen}
        >
          collapse all
        </button>
      </span>
    )
  }

  function tableHandlers(which: 'files' | 'variables') {
    const current = tableEdits[which] ?? EMPTY_EDIT
    return {
      edit: current,
      onCellChange: (rowKey: string, column: string, value: string) => {
        onTableEditChange(which, {
          ...current,
          cells: { ...current.cells, [rowKey]: { ...(current.cells[rowKey] || {}), [column]: value } },
        })
      },
      onAddColumn: (name: string) => {
        onTableEditChange(which, { ...current, extraColumns: [...current.extraColumns, name] })
      },
      onRemoveColumn: (name: string) => {
        const cells: TableEdit['cells'] = {}
        for (const [rowKey, row] of Object.entries(current.cells)) {
          const { [name]: _removed, ...rest } = row
          if (Object.keys(rest).length) cells[rowKey] = rest
        }
        onTableEditChange(which, { extraColumns: current.extraColumns.filter((c) => c !== name), cells })
      },
      onRenameColumn: (from: string, to: string) => {
        const cells: TableEdit['cells'] = {}
        for (const [rowKey, row] of Object.entries(current.cells)) {
          const next = { ...row }
          if (from in next) { next[to] = next[from]; delete next[from] }
          cells[rowKey] = next
        }
        onTableEditChange(which, {
          extraColumns: current.extraColumns.map((c) => (c === from ? to : c)),
          cells,
        })
      },
    }
  }

  function toggleAllVars(checked: boolean) {
    tabularFiles.forEach((f) => onToggleVariable(f.id, checked))
  }

  function toggleAllMin(checked: boolean) {
    PINK_SECTIONS.forEach((s) => {
      const has = sections.includes(s)
      if (checked && !has) onToggleSection(s)
      if (!checked && has) onToggleSection(s)
    })
  }

  function toggleAllEnh(checked: boolean) {
    GREEN_SECTIONS.forEach((s) => {
      const has = sections.includes(s)
      if (checked && !has) onToggleSection(s)
      if (!checked && has) onToggleSection(s)
    })
  }

  const [pendingVersion, setPendingVersion] = useState<string | null>(null)

  function handleVersionChange(v: string) {
    if (hasReadme) {
      setPendingVersion(v)
    } else {
      onVersionChange(v)
    }
  }

  function renderSectionRow(s: Section, opts: { checkbox: boolean; dotColor?: string }) {
    return (
      <SectionRow
        key={s}
        section={s}
        label={SECTION_META[s].label}
        description={SECTION_META[s].description}
        checkbox={opts.checkbox}
        dotColor={opts.dotColor}
        checked={sections.includes(s)}
        onToggle={() => onToggleSection(s)}
        block={sectionBlocks[s]}
        tableProps={
          s === 'files' || s === 'variables' ? tableHandlers(s) : undefined
        }
        text={sectionText[s]}
        onTextChange={(v) => onSectionTextChange(s, v)}
        onReset={() => onSectionReset(s)}
        open={expanded.has(s)}
        onToggleOpen={() => toggleExpanded(s)}
      />
    )
  }

  return (
    <aside className={`${styles.sidebar} ${wide ? styles.sidebarWide : ''}`}>
      {/* Version change confirmation modal */}
      {pendingVersion && (
        <div className={styles.versionModalOverlay} onClick={() => setPendingVersion(null)}>
          <div className={styles.versionModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.versionModalTitle}>Change version?</div>
            <p className={styles.versionModalBody}>
              Your current README will be cleared, so save or download it first if you need it.
              Anything you typed into a section is kept, and will still be used for the new version.
            </p>
            <div className={styles.versionModalActions}>
              <button className={styles.btn} onClick={() => setPendingVersion(null)}>cancel</button>
              <button
                className={`${styles.btn} ${styles.btnAccent}`}
                onClick={() => { onVersionChange(pendingVersion); setPendingVersion(null); }}
              >
                proceed
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`${styles.scroll} ${wide ? styles.scrollWide : ''}`}>

        {fetching && (
          <div className={styles.fetchingState}>
            <div className={styles.spinner} />
            <span>Loading dataset…</span>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {meta && (
          <div>
            <label className={styles.label}>Dataset</label>
            <div className={styles.metaCard}>
              {([['title', meta.title], ['authors', meta.authors], ['DOI', meta.doi], ['version', meta.version], ['license', meta.license]] as [string, string][])
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className={styles.metaRow}>
                    <span className={styles.metaKey}>{k}</span>
                    <span className={styles.metaVal}>{v}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Version selector */}
        {meta && versions.length > 0 && (
          <div>
            <label className={styles.label}>Version</label>
            <select
              className={styles.versionSelect}
              value={version}
              onChange={(e) => handleVersionChange(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Version banner when non-latest selected */}
        {versions.length > 0 && version !== versions[0]?.value && (
          <div className={styles.versionBanner}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 4V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="6" cy="8.5" r="0.6" fill="currentColor"/>
            </svg>
            Not the most recent version — viewing {versions.find((v) => v.value === version)?.label || version}
          </div>
        )}

        {tree && (
          <div>
            <label className={styles.label}>Files to include</label>

            {/* Legend box */}
            <div className={styles.fileListLegend}>
              <span className={styles.legendLine}>
                <span className={styles.legendNum}>C1</span>
                file list — include file in README
                <span className={styles.legendCount}>{fileCount} / {fileTotal}</span>
              </span>
              <span className={styles.legendLine}>
                <span className={styles.legendNum}>C2</span>
                var list — include variable metadata
                <span className={styles.legendCount}>{varCount} / {varTotal}</span>
              </span>
              {hasRestricted && (
                <span className={styles.legendRestricted}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <rect x="2" y="5" width="8" height="6" rx="1.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M4 5V3.5a2 2 0 0 1 4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  restricted files are unchecked by default
                </span>
              )}
            </div>

            <div className={styles.fileTreeWrap}>
              <div className={styles.fileTree}>
                {/* Select-all row */}
                <div className={`${styles.fileRow} ${styles.fileRowSelectAll}`}>
                  <div className={styles.cbColHeader}>
                    <span className={styles.cbBadge}>C1</span>
                    <input
                      type="checkbox"
                      checked={allFilesChecked}
                      onChange={(e) => onToggleAll(e.target.checked)}
                      title="Select all files"
                    />
                  </div>
                  <div className={styles.cbColHeader}>
                    <span className={styles.cbBadge}>C2</span>
                    <input
                      type="checkbox"
                      checked={allVarsChecked}
                      onChange={(e) => toggleAllVars(e.target.checked)}
                      title="Select all variables"
                    />
                  </div>
                  <span className={styles.fileNameCol} />
                  <span className={styles.fileSizeCol} />
                  <span className={styles.lockCol} />
                </div>

                <TreeLevel
                  node={tree}
                  files={files}
                  selectedIds={selectedIds}
                  variableIds={variableIds}
                  onToggleFile={onToggleFile}
                  onToggleVariable={onToggleVariable}
                  depth={0}
                  pathPrefix=""
                />
              </div>
            </div>
          </div>
        )}

        {meta && <hr className={styles.divider} />}

        {meta && (
          <div>
            <label className={styles.label}>Generation mode</label>
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${mode === 'basic' ? styles.modeBtnActive : ''}`}
                onClick={() => onModeChange('basic')}
              >
                <span className={styles.modeBtnTitle}>Minimum</span>
                <span className={styles.modeBtnSub}>Core README fields</span>
              </button>
              <button
                className={`${styles.modeBtn} ${mode === 'advanced' ? styles.modeBtnActive : ''}`}
                onClick={() => onModeChange('advanced')}
              >
                <span className={styles.modeBtnTitle}>Advanced</span>
                <span className={styles.modeBtnSub}>Choose your sections</span>
              </button>
            </div>
          </div>
        )}

        {meta && (
          <div className={styles.sectionHint}>
            Open a section to see and edit what goes into it.
          </div>
        )}

        {mode === 'advanced' && meta && (
          <div>
            <div className={styles.tierBlock}>
              <div className={styles.tierLabelRow}>
                <div className={styles.tierLabel}>
                  <span className={styles.tierDot} style={{ background: '#ea9999' }} />
                  Minimum README
                </div>
                <span className={styles.rowActions}>
                  {expandControls(PINK_SECTIONS)}
                  <label className={styles.selectAllCheck}>
                    <input type="checkbox" checked={allMinChecked} onChange={(e) => toggleAllMin(e.target.checked)} />
                    all
                  </label>
                </span>
              </div>
              {PINK_SECTIONS.map((s) => renderSectionRow(s, { checkbox: true }))}
            </div>
            <div className={styles.tierBlock}>
              <div className={styles.tierLabelRow}>
                <div className={styles.tierLabel}>
                  <span className={styles.tierDot} style={{ background: '#93c47d' }} />
                  Enhanced README
                </div>
                <span className={styles.rowActions}>
                  {expandControls(GREEN_SECTIONS)}
                  <label className={styles.selectAllCheck}>
                    <input type="checkbox" checked={allEnhChecked} onChange={(e) => toggleAllEnh(e.target.checked)} />
                    all
                  </label>
                </span>
              </div>
              {GREEN_SECTIONS.map((s) => renderSectionRow(s, { checkbox: true }))}
            </div>
          </div>
        )}

        {mode === 'advanced' && (
          <div>
            <div className={styles.tierLabel} style={{ marginBottom: 8 }}>
              <span className={styles.tierDot} style={{ background: 'var(--border-mid)' }} />
              Custom sections
            </div>
            {customSections.map((cs) => (
              <div key={cs.id} className={styles.customCard}>
                <div className={styles.customCardHeader}>
                  <input
                    type="text"
                    className={styles.customTitleInput}
                    value={cs.title}
                    onChange={(e) => onUpdateCustomSection(cs.id, 'title', e.target.value)}
                    placeholder="Section title"
                  />
                  <button className={styles.removeBtn} onClick={() => onRemoveCustomSection(cs.id)} title="Remove">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <textarea
                  className={styles.customContentInput}
                  value={cs.content}
                  onChange={(e) => onUpdateCustomSection(cs.id, 'content', e.target.value)}
                  placeholder="Section content…"
                  rows={3}
                />
              </div>
            ))}
            <button
              className={`${styles.btn} ${styles.btnFull}`}
              onClick={() => onAddCustomSection({ id: crypto.randomUUID(), title: '', content: '' })}
            >
              + add custom section
            </button>
          </div>
        )}

        {mode === 'basic' && meta && (
          <div className={styles.basicSummary}>
            <div className={styles.basicSummaryHead}>
              <span className={styles.basicSummaryTitle}>Will include:</span>
              {expandControls(PINK_SECTIONS)}
            </div>
            {PINK_SECTIONS.map((s) => renderSectionRow(s, { checkbox: false, dotColor: '#ea9999' }))}
          </div>
        )}

        {meta && (
          <button
            className={`${styles.btn} ${styles.btnAccent} ${styles.btnGenerate}`}
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            {generating ? 'generating…' : 'generate README'}
          </button>
        )}

      </div>
    </aside>
  )
}

// ── One section: checkbox, expander, and its editable content ────────────────

interface TableProps {
  edit: TableEdit
  onCellChange: (rowKey: string, column: string, value: string) => void
  onAddColumn: (name: string) => void
  onRemoveColumn: (name: string) => void
  onRenameColumn: (from: string, to: string) => void
}

function SectionRow({
  section, label, description, checkbox, dotColor, checked, onToggle,
  block, text, onTextChange, onReset, open, onToggleOpen, tableProps,
}: {
  section: Section
  label: string
  description: string
  checkbox: boolean
  dotColor?: string
  checked: boolean
  onToggle: () => void
  block?: SectionBlock
  text?: string
  onTextChange: (v: string) => void
  onReset: () => void
  open: boolean
  onToggleOpen: () => void
  /** Supplied for the two table sections only. */
  tableProps?: TableProps
}) {
  const edited = text !== undefined
  const editable = block ? block.editable : true
  // The box holds plain text, not markdown: it is converted back at generation
  // according to the section's shape. Sections with no dataset metadata start
  // empty with the guidance as a grey placeholder.
  const defaultValue = block ? (block.placeholder ? '' : block.plain) : ''
  const value = text !== undefined ? text : defaultValue
  const hint = block ? formatHint(block.kind) : ''

  return (
    <div className={styles.sectionItem}>
      <div className={styles.sectionRow}>
        {checkbox ? (
          <label className={styles.toggleItem}>
            <input type="checkbox" checked={checked} onChange={onToggle} />
            {label}
          </label>
        ) : (
          <span className={styles.toggleItem}>
            <span className={styles.basicDot} style={dotColor ? { background: dotColor } : undefined} />
            {label}
          </span>
        )}
        {edited && <span className={styles.editedTag}>edited</span>}
        <button
          type="button"
          className={styles.expandBtn}
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-label={open ? `Hide ${label} content` : `Edit ${label} content`}
          title={description}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
            <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className={styles.sectionEditor}>
          {!block && (
            <div className={styles.sectionNote}>Load a dataset to see this section.</div>
          )}

          {block && !editable && block.tables && tableProps && (
            <SectionTable
              models={block.tables}
              emptyNote={
                section === 'variables'
                  ? 'No variable metadata yet. Tick tabular files in column C2 above.'
                  : 'No files selected yet.'
              }
              {...tableProps}
            />
          )}

          {block && editable && (
            <>
              <textarea
                className={styles.sectionTextarea}
                value={value}
                placeholder={block.placeholder}
                onChange={(e) => onTextChange(e.target.value)}
                rows={Math.min(12, Math.max(3, value.split('\n').length + 1))}
              />
              <div className={styles.sectionEditorFoot}>
                <span>{hint}</span>
                {edited && (
                  <button type="button" className={styles.resetBtn} onClick={onReset}>reset</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── File tree ─────────────────────────────────────────────────────────────────

function TreeLevel({ node, files, selectedIds, variableIds, onToggleFile, onToggleVariable, depth, pathPrefix }: {
  node: TreeNode; files: DataFile[]; selectedIds: Set<number>; variableIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void
  onToggleVariable: (id: number, checked: boolean) => void
  depth: number
  pathPrefix: string
}) {
  return (
    <>
      {node.files.map((f) => (
        <FileItem
          key={f.id}
          file={f}
          depth={depth}
          checked={selectedIds.has(f.id)}
          varChecked={variableIds.has(f.id)}
          onToggleFile={onToggleFile}
          onToggleVariable={onToggleVariable}
        />
      ))}
      {Object.entries(node.dirs).map(([dirName, child]) => (
        <FolderNode
          key={dirName}
          name={dirName}
          fullPath={pathPrefix ? `${pathPrefix}/${dirName}` : dirName}
          node={child}
          files={files}
          selectedIds={selectedIds}
          variableIds={variableIds}
          onToggleFile={onToggleFile}
          onToggleVariable={onToggleVariable}
          depth={depth}
          pathPrefix={pathPrefix ? `${pathPrefix}/${dirName}` : dirName}
        />
      ))}
    </>
  )
}

function FileItem({ file, depth, checked, varChecked, onToggleFile, onToggleVariable }: {
  file: DataFile; depth: number; checked: boolean; varChecked: boolean
  onToggleFile: (id: number, checked: boolean) => void
  onToggleVariable: (id: number, checked: boolean) => void
}) {
  const tabular = isTabular(file)
  const [showTip, setShowTip] = useState(false)

  return (
    <div className={`${styles.fileRow} ${file.restricted ? styles.fileRowRestricted : ''}`}>
      <div className={styles.cbCol}>
        <input type="checkbox" checked={checked} onChange={(e) => onToggleFile(file.id, e.target.checked)} />
      </div>
      <div className={styles.cbCol}>
        {tabular
          ? <input type="checkbox" checked={varChecked} onChange={(e) => onToggleVariable(file.id, e.target.checked)} />
          : <span className={styles.cbPlaceholder} />
        }
      </div>
      {/* indent for folder depth */}
      {depth > 0 && <span style={{ width: depth * 16, flexShrink: 0 }} />}
      <span className={styles.extBadge}>{fileExt(file.name)}</span>
      <span
        className={`${styles.fileName} ${file.restricted ? styles.fileNameRestricted : ''}`}
        title={file.restricted ? `${file.name} — restricted` : file.name}
      >
        {file.name}
      </span>
      <span className={styles.fileSize}>{formatBytes(file.size)}</span>
      <span className={styles.lockCol}>
        {file.restricted && (
          <span
            className={styles.unlockIcon}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            <UnlockIcon />
            {showTip && <span className={styles.restrictedTip}>Restricted file</span>}
          </span>
        )}
      </span>
    </div>
  )
}

function UnlockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="5" width="8" height="6" rx="1.5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 5V3.5a2 2 0 0 1 4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function FolderNode({ name, fullPath, node, files, selectedIds, variableIds, onToggleFile, onToggleVariable, depth, pathPrefix }: {
  name: string; fullPath: string; node: TreeNode; files: DataFile[]
  selectedIds: Set<number>; variableIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void
  onToggleVariable: (id: number, checked: boolean) => void
  depth: number
  pathPrefix: string
}) {
  const [open, setOpen] = useState(true)

  function collectFileIds(n: TreeNode): number[] {
    return [...n.files.map((f) => f.id), ...Object.values(n.dirs).flatMap(collectFileIds)]
  }

  function collectTabularIds(n: TreeNode): number[] {
    return [...n.files.filter(isTabular).map((f) => f.id), ...Object.values(n.dirs).flatMap(collectTabularIds)]
  }

  const allFileIds = collectFileIds(node)
  const allTabularIds = collectTabularIds(node)
  const allChecked = allFileIds.length > 0 && allFileIds.every((id) => selectedIds.has(id))
  const allVarChecked = allTabularIds.length > 0 && allTabularIds.every((id) => variableIds.has(id))
  const hasTabular = allTabularIds.length > 0

  return (
    <>
      <div className={styles.fileRow}>
        <div className={styles.cbCol}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => allFileIds.forEach((id) => onToggleFile(id, e.target.checked))}
          />
        </div>
        <div className={styles.cbCol}>
          {hasTabular
            ? <input
                type="checkbox"
                checked={allVarChecked}
                onChange={(e) => allTabularIds.forEach((id) => onToggleVariable(id, e.target.checked))}
              />
            : <span className={styles.cbPlaceholder} />
          }
        </div>
        {/* indent for nested folders */}
        {depth > 0 && <span style={{ width: depth * 16, flexShrink: 0 }} />}
        <button className={styles.folderToggle} onClick={() => setOpen((o) => !o)}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
            <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: '#ea9999' }}>
          <path d="M1 3.5C1 2.67 1.67 2 2.5 2H4.5L5.5 3H9.5C10.33 3 11 3.67 11 4.5V8.5C11 9.33 10.33 10 9.5 10H2.5C1.67 10 1 9.33 1 8.5V3.5Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span className={styles.folderName}>{fullPath}</span>
        <span className={styles.lockCol} />
      </div>
      {open && (
        <TreeLevel
          node={node}
          files={files}
          selectedIds={selectedIds}
          variableIds={variableIds}
          onToggleFile={onToggleFile}
          onToggleVariable={onToggleVariable}
          depth={depth + 1}
          pathPrefix={pathPrefix}
        />
      )}
    </>
  )
}
