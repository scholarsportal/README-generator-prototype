'use client'

import { useState, useEffect } from 'react'
import styles from './SaveArea.module.css'

interface SaveAreaProps {
  onSave: (token: string, filename: string) => Promise<void>
  hasSignedUrl: boolean
  existingFiles?: string[]
}

function getDefaultFilename(existingFiles: string[]): string {
  if (!existingFiles.includes('README.md')) return 'README.md'
  let n = 2
  while (existingFiles.includes(`README_${n}.md`)) n++
  return `README_${n}.md`
}

export default function SaveArea({ onSave, hasSignedUrl, existingFiles = [] }: SaveAreaProps) {
  const [showModal, setShowModal] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [filename, setFilename]   = useState('README.md')
  const [token, setToken]         = useState('')
  const [show, setShow]           = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')

  function openModal() {
    setConfirmed(false)
    setError('')
    setFilename(getDefaultFilename(existingFiles))
    setShowModal(true)
  }

  async function handleSave() {
    if (!confirmed) return
    if (!hasSignedUrl && !token.trim()) {
      setError('Enter your Borealis API token to save.')
      return
    }
    if (!filename.trim()) {
      setError('Enter a filename.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave(token, filename.trim())
      setSaved(true)
      setShowModal(false)
      setConfirmed(false)
      setToken('')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        className={`${styles.btn} ${styles.btnAccent}`}
        onClick={openModal}
        disabled={saved}
      >
        {saved ? 'saved!' : 'add README'}
      </button>

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Add README to dataset?</div>
            <p className={styles.modalBody}>
              This will upload a README file to your dataset.
              Note: this saves a file, not dataset metadata.
            </p>

            <div className={styles.tokenRow}>
              <label className={styles.tokenLabel}>Filename</label>
              <input
                type="text"
                className={styles.input}
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="README.md"
              />
            </div>

            {!hasSignedUrl && (
              <div className={styles.tokenRow}>
                <label className={styles.tokenLabel}>Borealis API token</label>
                <div className={styles.tokenInputRow}>
                  <input
                    type={show ? 'text' : 'password'}
                    className={styles.input}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Required to save"
                    autoComplete="off"
                  />
                  <button className={styles.eyeBtn} onClick={() => setShow((s) => !s)} title="Show/hide token">
                    <EyeIcon crossed={show} />
                  </button>
                </div>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I understand and want to save {filename || 'README.md'} to this dataset
            </label>

            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setShowModal(false)}>
                cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnAccent}`}
                onClick={handleSave}
                disabled={!confirmed || saving || (!hasSignedUrl && !token.trim())}
              >
                {saving ? 'saving…' : 'yes, add README'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7C1 7 3 3 7 3C11 3 13 7 13 7C13 7 11 11 7 11C3 11 1 7 1 7Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
      {crossed && <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" />}
    </svg>
  )
}
