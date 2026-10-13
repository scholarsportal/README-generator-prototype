'use client'

import { useState } from 'react'
import styles from './DemoBanner.module.css'

interface DemoBannerProps {
  /** Hand back a raw Dataverse /versions payload for the app to render. */
  onLoadJson: (json: unknown) => void
  /** Set once the viewer has loaded their own dataset, so the copy stops
   *  claiming the sample dataset is on screen. */
  usingOwn: boolean
  onReset: () => void
}

const CURL_HINT =
  "curl 'https://borealisdata.ca/api/datasets/:persistentId/versions?persistentId=doi:10.5683/SP3/XXXXXX'"

/**
 * Shown only in demo mode (the static GitHub Pages build).
 *
 * Two jobs: say plainly that this is a demo with no repository behind it, and
 * offer the one escape hatch a static build allows — paste the JSON from your
 * own Dataverse and the app renders it. That needs no server, no CORS and no
 * token, which is what makes the demo evaluable against real datasets rather
 * than only the bundled sample.
 */
export default function DemoBanner({ onLoadJson, usingOwn, onReset }: DemoBannerProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  function handleLoad() {
    const trimmed = text.trim()
    if (!trimmed) {
      setError('Paste the JSON response first.')
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch (e) {
      setError('That is not valid JSON. ' + String(e instanceof Error ? e.message : e))
      return
    }
    try {
      onLoadJson(parsed)
      setOpen(false)
      setText('')
      setError('')
    } catch (e) {
      // versionsFromRaw throws a message aimed at the person pasting.
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  return (
    <>
      <div className={styles.bar}>
        <span className={styles.tag}>Demo</span>
        <span className={styles.text}>
          {usingOwn
            ? 'Showing the dataset you pasted. Nothing is sent anywhere — it stays in this browser tab.'
            : 'A sample dataset, bundled into the page. Saving back to a repository is disabled here.'}
        </span>
        <span className={styles.actions}>
          {usingOwn && (
            <button type="button" className={styles.linkBtn} onClick={onReset}>
              Back to the sample
            </button>
          )}
          <button type="button" className={styles.btn} onClick={() => setOpen(true)}>
            Use your own dataset
          </button>
        </span>
      </div>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Load your own dataset</div>
            <p className={styles.modalBody}>
              This page is static, so it cannot call your repository itself. Fetch the
              dataset&apos;s versions yourself and paste the response below — it is parsed in
              your browser and never uploaded.
            </p>
            <pre className={styles.code}>{CURL_HINT}</pre>
            <p className={styles.modalNote}>
              Any Dataverse works, not just Borealis. For an unpublished draft or restricted
              files, add <code>-H &quot;X-Dataverse-key: YOUR_TOKEN&quot;</code>. Variable-level
              metadata needs a separate request per file, so the Variable List section will be
              empty for a pasted dataset.
            </p>

            <textarea
              className={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'{"status":"OK","data":[ … ]}'}
              spellCheck={false}
              rows={8}
            />

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.btn} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnAccent}`}
                onClick={handleLoad}
              >
                Load dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
