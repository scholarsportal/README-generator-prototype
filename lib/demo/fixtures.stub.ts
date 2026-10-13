import type { VersionEntry, Variable } from '../types'

/**
 * Stands in for ./fixtures in the external-tool build.
 *
 * next.config.js swaps this module in when NEXT_PUBLIC_DEMO is not set. Without
 * it webpack still emits the real fixtures as an async chunk — ~69 KB of sample
 * dataset in the production deployment — because import() creates a chunk before
 * dead-code elimination removes the branch that would have loaded it.
 *
 * Neither function can be reached: the only callers sit behind
 * `process.env.NEXT_PUBLIC_DEMO === '1'`, which is false wherever this file is
 * used. They throw rather than returning empty so a wiring mistake is loud.
 */
const message =
  'Demo fixtures are not part of this build. This is the external-tool build; ' +
  'set NEXT_PUBLIC_DEMO=1 to build the static demo.'

export function demoVersions(): VersionEntry[] {
  throw new Error(message)
}

export function demoVariables(_fileId: number): Variable[] | null {
  throw new Error(message)
}
