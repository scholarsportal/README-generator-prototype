'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import styles from './DemoBanner.module.css'

/**
 * Shown only in demo mode (the static GitHub Pages build).
 *
 * Loading a real dataset by DOI goes through a Cloudflare Worker that adds the
 * CORS headers Borealis does not send. Public, published datasets only: no
 * token is involved, so drafts and restricted files stay unreachable. Those are
 * what the real external tool, launched from inside Borealis, is for.
 */
interface DemoBannerProps {
  onLoadDoi?: (doi: string) => Promise<void>
  usingOwn?: boolean
  loadedTitle?: string
  onReset?: () => void
}

const DOI_HINT = 'doi:10.XXXXX/XX/XXXXXX'

/**
 * Dataverse answers an unresolvable persistent ID with "a persistentId query
 * parameter must be present", which is true of a missing parameter and not of a
 * mistyped DOI. Showing that to someone who just typed a DOI would send them
 * looking for a bug that is not there, so the status drives the wording.
 */
function describe(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/\b404\b/.test(msg)) {
    return 'No published dataset found for that DOI. Check it against the dataset page in Borealis.'
  }
  if (/\b40[13]\b/.test(msg)) {
    return 'That dataset is not public, so the demo cannot read it. Launch the tool from inside Borealis for restricted data.'
  }
  if (/failed to fetch|networkerror|load failed|502|504/i.test(msg)) {
    return 'Could not reach the repository. Try again in a moment.'
  }
  return msg || 'Something went wrong loading that DOI.'
}

export default function DemoBanner({
  onLoadDoi,
  usingOwn,
  loadedTitle,
  onReset,
}: DemoBannerProps) {
  const [doi, setDoi] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = doi.trim()
    if (!value || !onLoadDoi || busy) return
    setBusy(true)
    setError('')
    try {
      await onLoadDoi(value)
    } catch (err) {
      setError(describe(err))
    } finally {
      setBusy(false)
    }
  }

  if (usingOwn) {
    return (
      <div className={styles.bar}>
        <span className={styles.tag}>Demo</span>
        <span className={styles.text}>{loadedTitle || 'Loaded dataset'}</span>
        {onReset && (
          <button
            type="button"
            className={styles.doiBtn}
            onClick={() => {
              setDoi('')
              setError('')
              onReset()
            }}
          >
            Back to mock dataset
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={styles.bar}>
      <span className={styles.tag}>Demo</span>
      <span className={styles.text}>Mock Dataset</span>

      {onLoadDoi && (
        <form className={styles.doiForm} onSubmit={submit}>
          <label className={styles.doiLabel} htmlFor="demo-doi">
            Load a public dataset
          </label>
          <input
            id="demo-doi"
            type="text"
            className={styles.doiInput}
            value={doi}
            onChange={(e) => {
              setDoi(e.target.value)
              if (error) setError('')
            }}
            placeholder={DOI_HINT}
            spellCheck={false}
            autoComplete="off"
            disabled={busy}
            aria-describedby={error ? 'demo-doi-error' : undefined}
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" className={styles.doiBtn} disabled={busy || !doi.trim()}>
            {busy ? 'Loading…' : 'Load'}
          </button>
          {error && (
            <p className={styles.doiError} id="demo-doi-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
