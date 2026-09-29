'use client'

import { useState, useEffect, useRef } from 'react'
import type { Locale } from '@/lib/i18n'
import styles from './Header.module.css'

interface HeaderProps {
  hasReadme: boolean
  onCopy: () => void
  onDownload: (ext: 'md' | 'txt') => void
  saveArea?: React.ReactNode
  locale?: Locale
  onLocaleChange?: (locale: Locale) => void
}

export default function Header({ hasReadme, onCopy, onDownload, saveArea, locale = 'en', onLocaleChange }: HeaderProps) {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') setDark(true)
    else if (stored === 'light') setDark(false)
    else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setDark(systemDark)
    }
  }, [])

  useEffect(() => {
    if (dark === null) return
    if (dark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return (
    <header className={styles.header}>
      <div className={styles.wordmark}>
        Borealis README<em></em> Generator
      </div>
      <InfoTooltip />
      <div className={styles.actions}>
        {hasReadme && (
          <>
            {saveArea}
            <ExportMenu onCopy={onCopy} onDownload={onDownload} />
          </>
        )}
        {onLocaleChange && (
          <div className={styles.themeSegment} role="group" aria-label="Language / Langue">
            <button
              className={`${styles.themeBtn} ${locale === 'en' ? styles.themeBtnActive : ''}`}
              onClick={() => onLocaleChange('en')}
              title="English"
              lang="en"
              aria-pressed={locale === 'en'}
            >
              English
            </button>
            <button
              className={`${styles.themeBtn} ${locale === 'fr' ? styles.themeBtnActive : ''}`}
              onClick={() => onLocaleChange('fr')}
              title="Français"
              lang="fr"
              aria-pressed={locale === 'fr'}
            >
              Français
            </button>
          </div>
        )}
        <div className={styles.themeSegment}>
          <button
            className={`${styles.themeBtn} ${!dark ? styles.themeBtnActive : ''}`}
            onClick={() => setDark(false)}
            title="Light mode"
          >
            <SunIcon />
          </button>
          <button
            className={`${styles.themeBtn} ${dark ? styles.themeBtnActive : ''}`}
            onClick={() => setDark(true)}
            title="Dark mode"
          >
            <MoonIcon />
          </button>
        </div>
      </div>
    </header>
  )
}

// ── Export dropdown ───────────────────────────────────────────────────────────
// Copy and the two downloads, which were three separate buttons. Saving to the
// dataset stays its own button: that writes to Borealis, this takes a copy away.

function ExportMenu({ onCopy, onDownload }: { onCopy: () => void; onDownload: (ext: 'md' | 'txt') => void }) {
  const [open, setOpen] = useState(false)
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

  function choose(action: () => void) {
    action()
    setOpen(false)
  }

  return (
    <div className={styles.exportWrap} ref={wrapRef}>
      <button
        className={`${styles.btn} ${styles.btnSm} ${styles.exportBtn}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        export
        <svg width="8" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"
          style={{ marginLeft: 6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.exportMenu} role="menu">
          <button className={styles.exportItem} role="menuitem" onClick={() => choose(onCopy)}>
            copy markdown
          </button>
          <button className={styles.exportItem} role="menuitem" onClick={() => choose(() => onDownload('md'))}>
            download .md
          </button>
          <button className={styles.exportItem} role="menuitem" onClick={() => choose(() => onDownload('txt'))}>
            download .txt
          </button>
        </div>
      )}
    </div>
  )
}

function InfoTooltip() {
  const [visible, setVisible] = useState(false)
  return (
    <div className={styles.infoWrap}>
      <button
        className={styles.infoBtn}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="About this tool"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 6.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="7" cy="4.5" r="0.7" fill="currentColor"/>
        </svg>
      </button>
      {visible && (
        <div className={styles.tooltip}>
          Generate a README.md for your Borealis dataset. Choose Minimum for essential fields,
          or Advanced to select exactly which sections to include.
        </div>
      )}
    </div>
  )
}

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="7" y1="1" x2="7" y2="2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="7" y1="11.5" x2="7" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="1" y1="7" x2="2.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="11.5" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="2.93" y1="2.93" x2="3.99" y2="3.99" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="10.01" y1="10.01" x2="11.07" y2="11.07" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="11.07" y1="2.93" x2="10.01" y2="3.99" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="3.99" y1="10.01" x2="2.93" y2="11.07" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
