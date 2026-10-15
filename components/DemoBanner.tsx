'use client'

import { useState } from 'react'
import styles from './DemoBanner.module.css'

interface DemoBannerProps {
  /** Load a published dataset by DOI. Rejects with a message to show. */
  onLoadDoi: (doi: string) => Promise<void>
  /** True once a real dataset is on screen rather than the bundled sample. */
  usingOwn: boolean
  /** Title of the loaded dataset, for the banner text. */
  loadedTitle?: string
  onReset: () => void
}

const EXAMPLE = 'doi:10.5683/SP3/ABCDEF'

/**
 * Shown only in demo mode (the static GitHub Pages build).
 *
 * Two jobs: say plainly that the sample dataset is invented, and let someone
 * point the tool at a real published dataset by DOI. The fetch goes straight
 * from the browser to the repository, which works because Dataverse serves its
 * API with permissive CORS — and only for public datasets, since no token is
 * involved.
 */
export default function DemoBanner({ onLoadDoi, usingOwn, loadedTitle, onReset }: DemoBannerProps) {
  const [open, setOpen] = useState(false)
  const [doi, setDoi] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLoad() {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      await onLoadDoi(doi)
      setOpen(false)
      setDoi('')
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={styles.bar}>
        <span className={styles.tag}>Demo</span>
        <span className={styles.text}>
          {usingOwn
            ? `Showing ${loadedTitle ? `“${loadedTitle}”` : 'a published dataset'}, read live from Borealis.`
            : 'A sample dataset — the data is invented and the dataset does not exist. Use the button to load a real published dataset instead.'}
        </span>
        <span className={styles.actions}>
          {usingOwn && (
            <button type="button" className={styles.linkBtn} onClick={onReset}>
              Back to the sample
            </button>
          )}
          <button type="button" className={styles.btn} onClick={() => { setError(''); setOpen(true) }}>
            Load a real dataset
          </button>
        </span>
      </div>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Load a published dataset</div>
            <p className={styles.modalBody}>
              Enter the DOI of any published Borealis dataset. The dataset page URL
              works too.
            </p>

            <input
              className={styles.input}
              value={doi}
              autoFocus
              spellCheck={false}
              placeholder={EXAMPLE}
              onChange={(e) => setDoi(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoad()
                if (e.key === 'Escape') setOpen(false)
              }}
              aria-label="Dataset DOI"
            />

            <p className={styles.modalNote}>
              Published datasets only — drafts and restricted files need the tool
              launched from the dataset page in Borealis.
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.btn} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnAccent}`}
                onClick={handleLoad}
                disabled={loading || !doi.trim()}
              >
                {loading ? 'Loading…' : 'Load dataset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
