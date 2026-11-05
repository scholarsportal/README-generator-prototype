/**
 * The filename a generated README is saved or downloaded under.
 *
 *   README_for_Ontario_Housing_Survey_2019.md
 *
 * Spaces in the dataset title become underscores and everything else is kept as
 * typed, so the name stays readable and recognisably the dataset's. The only
 * characters removed are the ones a filesystem will not take — \ / : * ? " < > |
 * are rejected or silently mangled on Windows, and a forward slash would read as
 * a directory separator everywhere.
 *
 * Shared by the download and the save-to-dataset default, so the two cannot
 * drift apart.
 */

/** Characters no filesystem will accept in a name, plus control characters. */
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\\/:*?"<>|\u0000-\u001f]/g

/** Keeps the whole thing well inside the 255-byte limit every filesystem has. */
const MAX_TITLE = 80

export function readmeTitleSlug(title?: string): string {
  return (title || '')
    .trim()
    .replace(ILLEGAL, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, MAX_TITLE)
    .replace(/_+$/, '')
}

export function readmeFilename(title: string | undefined, ext: string): string {
  const slug = readmeTitleSlug(title)
  // An untitled dataset, or a title made entirely of characters that had to go,
  // would otherwise produce "README_for_.md".
  return slug ? `README_for_${slug}.${ext}` : `README.${ext}`
}
