'use client'

import { useEffect, useRef } from 'react'
import { marked } from 'marked'
import type { Tab } from '@/lib/types'
import styles from './Viewer.module.css'

interface ViewerProps {
  markdown: string
  onChange: (md: string) => void
  tab: Tab
  onTabChange: (t: Tab) => void
}

export default function Viewer({ markdown, onChange, tab, onTabChange }: ViewerProps) {
  const html = markdown ? (marked.parse(markdown) as string) : ''

  return (
    <div className={styles.wrapper}>
      {/* Tabs toolbar */}
      <div className={styles.toolbar}>
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
