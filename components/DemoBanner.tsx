'use client'

import styles from './DemoBanner.module.css'

/**
 * Shown only in demo mode (the static GitHub Pages build).
 *
 * Loading a real dataset by DOI is built and working (fetchPublicVersions in
 * lib/demo), but it is not surfaced: Borealis does not send CORS headers, so a
 * static page cannot read its API directly. Routing those calls through the
 * existing Cloudflare Worker is the fix. When that is done, restore the button
 * and modal — the props below are already wired from page.tsx.
 */
interface DemoBannerProps {
  onLoadDoi?: (doi: string) => Promise<void>
  usingOwn?: boolean
  loadedTitle?: string
  onReset?: () => void
}

export default function DemoBanner(_props: DemoBannerProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.tag}>Demo</span>
      <span className={styles.text}>Mock Dataset</span>
    </div>
  )
}
