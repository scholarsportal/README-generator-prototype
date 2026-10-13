'use client'

import { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import type { Tab } from '@/lib/types'
import styles from './Viewer.module.css'

interface ViewerProps {
  markdown: string
  onChange: (md: string) => void
  tab: Tab
  onTabChange: (t: Tab) => void
  onCopy: () => void
  onDownload: (ext: 'md' | 'txt') => void
  /** The save-to-dataset control, rendered at the left of the toolbar. */
  saveArea?: React.ReactNode
  title?: string
}

export default function Viewer({ markdown, onChange, tab, onTabChange, onCopy, onDownload, saveArea, title }: ViewerProps) {
  const html = markdown ? (marked.parse(markdown) as string) : ''

  return (
    <div className={styles.wrapper}>
      {/* Toolbar: save + export on the left, view tabs on the right */}
      <div className={styles.toolbar}>
        {saveArea}
        <ExportBar onCopy={onCopy} onDownload={onDownload} html={html} title={title} />
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'preview' ? styles.active : ''}`}
            onClick={() => onTabChange('preview')}
          >
            preview
          </button>
          <button
            className={`${styles.tab} ${tab === 'raw' ? styles.active : ''}`}
            onClick={() => onTabChange('raw')}
          >
            .md <PencilIcon />
          </button>
          <button
            className={`${styles.tab} ${tab === 'dual' ? styles.active : ''}`}
            onClick={() => onTabChange('dual')}
            title="Split view"
          >
            <SplitIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      {!markdown && (
        <div className={styles.empty}>
          <div className={styles.emptyGlyph}>README</div>
          <div className={styles.emptyTitle}>Nothing here yet</div>
          <div className={styles.emptySub}>Fetch a Borealis dataset, choose files, then generate</div>
        </div>
      )}

      {markdown && tab === 'preview' && (
        <div className={styles.pane}>
          <div
            className={styles.preview}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}

      {markdown && tab === 'raw' && (
        <div className={styles.pane}>
          <AutoGrowTextarea
            value={markdown}
            onChange={onChange}
            className={styles.editor}
          />
        </div>
      )}

      {markdown && tab === 'dual' && (
        <div className={styles.dual}>
          <div className={styles.dualPreview}>
            <div
              className={styles.preview}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
          <div className={styles.dualEditor}>
            <AutoGrowTextarea
              value={markdown}
              onChange={onChange}
              className={styles.editor}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Export controls ───────────────────────────────────────────────────────────
// "export" expands sideways into its options rather than dropping a menu down.

function ExportBar({
  onCopy, onDownload, html, title,
}: {
  onCopy: () => void
  onDownload: (ext: 'md' | 'txt') => void
  html: string
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleCopy() {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className={styles.exportBar} ref={wrapRef}>
      <button
        className={`${styles.exportToggle} ${open ? styles.exportToggleOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        export
        <svg width="8" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"
          style={{ marginLeft: 6, transform: open ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .18s' }}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={`${styles.exportOptions} ${open ? styles.exportOptionsOpen : ''}`} aria-hidden={!open}>
        <button className={styles.exportItem} onClick={handleCopy} tabIndex={open ? 0 : -1}>
          {copied ? 'copied' : 'copy'}
        </button>
        <button className={styles.exportItem} onClick={() => onDownload('md')} tabIndex={open ? 0 : -1}>.md</button>
        <button className={styles.exportItem} onClick={() => onDownload('txt')} tabIndex={open ? 0 : -1}>.txt</button>
        <button className={styles.exportItem} onClick={() => printReadme(html, title)} tabIndex={open ? 0 : -1}>PDF</button>
      </div>
    </div>
  )
}

/**
 * Open the rendered README in a print window so the browser's own "Save as PDF"
 * produces a document that looks like the preview pane.
 *
 * The preview's styles live in a CSS module, so they are restated here for the
 * print sheet. Theme tokens are read live from the running page, which means the
 * PDF follows whatever fonts and colours the app is using rather than a
 * hardcoded copy that drifts.
 */
function printReadme(html: string, title?: string) {
  if (!html) return

  const root = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => root.getPropertyValue(name).trim() || fallback
  const serif = token('--serif', 'Georgia, serif')
  const mono = token('--mono', 'ui-monospace, monospace')
  // Always print on white with dark text, whatever the on-screen theme is.
  const text = '#1a1a1a'
  const rule = '#d4d4d4'
  const muted = '#595959'
  const accent = token('--accent', '#6b5bd6')

  const win = window.open('', '_blank')
  if (!win) {
    alert('Your browser blocked the print window. Allow pop-ups for this page and try again.')
    return
  }

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${(title || 'README').replace(/[<>&]/g, '')}</title>
<style>
  @page { margin: 20mm 18mm; }
  body {
    font-family: ${serif};
    font-size: 11pt;
    line-height: 1.7;
    color: ${text};
    background: #fff;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 { font-size: 20pt; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 .4rem; }
  h2 { font-size: 13pt; font-weight: 600; margin: 1.5rem 0 .5rem; padding-bottom: .3rem; border-bottom: 1px solid ${rule}; page-break-after: avoid; }
  h3 { font-size: 11.5pt; font-weight: 600; margin: 1rem 0 .3rem; page-break-after: avoid; }
  p { margin: 0 0 .6rem; }
  ul, ol { padding-left: 1.4rem; margin: 0 0 .6rem; }
  li { margin-bottom: .15rem; }
  code { font-family: ${mono}; font-size: 9pt; background: #f4f4f4; padding: 1px 4px; border-radius: 3px; }
  pre { background: #f4f4f4; border: 1px solid ${rule}; border-radius: 4px; padding: .75rem; overflow: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid ${accent}; padding-left: .9rem; color: ${muted}; margin: 0 0 .7rem; }
  hr { border: none; border-top: 1px solid ${rule}; margin: 1.4rem 0; }
  a { color: ${accent}; text-decoration: none; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 1rem; font-family: ${mono}; font-size: 8.5pt; page-break-inside: avoid; }
  th { background: #f4f4f4; padding: 5px 8px; text-align: left; border: 1px solid ${rule}; font-weight: 600; }
  td { padding: 5px 8px; border: 1px solid ${rule}; word-break: break-word; }
  img { max-width: 100%; }
</style>
</head>
<body>${html}</body>
</html>`)
  win.document.close()

  // Give the new document a tick to lay out before the dialog opens.
  win.addEventListener('load', () => {
    win.focus()
    win.print()
  })
  setTimeout(() => {
    try { win.focus(); win.print() } catch { /* already printed */ }
  }, 400)
}

// ── Auto-growing textarea ─────────────────────────────────────────────────────

function AutoGrowTextarea({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  )
}

// ── Split view icon ───────────────────────────────────────────────────────────

function SplitIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" style={{ display: 'block' }}>
      <rect x="1" y="2" width="5" height="1.2" rx="0.6" fill="currentColor" opacity="0.8" />
      <rect x="1" y="4.5" width="4" height="1.2" rx="0.6" fill="currentColor" opacity="0.8" />
      <rect x="1" y="7" width="5" height="1.2" rx="0.6" fill="currentColor" opacity="0.8" />
      <rect x="1" y="9.5" width="3" height="1.2" rx="0.6" fill="currentColor" opacity="0.8" />
      <line x1="7.5" y1="1" x2="7.5" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <rect x="9" y="2" width="5" height="1.2" rx="0.6" fill="currentColor" opacity="0.8" />
      <rect x="9" y="4.5" width="4" height="1.2" rx="0.6" fill="currentColor" opacity="0.8" />
      <rect x="9" y="7" width="5" height="1.2" rx="0.6" fill="currentColor" opacity="0.8" />
      <rect x="9" y="9.5" width="3" height="1.2" rx="0.6" fill="currentColor" opacity="0.8" />
    </svg>
  )
}

// ── Pencil icon ───────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ display: 'block', marginLeft: 4 }}>
      <path d="M7 1L9 3L3.5 8.5L1 9L1.5 6.5L7 1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}
