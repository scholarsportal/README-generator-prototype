// ── Dataset metadata ──────────────────────────────────────────────────────────

export interface DatasetMeta {
  // core
  title: string
  authors: string
  description: string
  keywords: string
  subject: string
  doi: string
  publisher: string
  year: string
  license: string
  version: string
  // extended
  software: { name: string; version: string }[]
  contributors: { name: string; type: string }[]
  dateOfCollection: { start: string; end: string }[]
  funding: { agency: string; grant: string }[]
  relatedPublications: { citation: string; url: string }[]
  dataSources: string[]
  timePeriod: { start: string; end: string }[]
  geographicCoverage: { country: string; state: string; city: string; other: string }[]
  contact: { name: string; affiliation: string; email: string }[]
}

// ── Signed URLs (passed by Dataverse when launching as external tool) ─────────

export interface SignedUrls {
  getDatasetMetadata?: string
  getFiles?: string
  getVersions?: string
  getVariables?: string  // base URL — fileId appended at call time
  addFile?: string
}

// ── Files ─────────────────────────────────────────────────────────────────────

export interface DataFile {
  id: number
  name: string
  size: number
  contentType: string
  directoryLabel: string
  description: string
  tags: string
  restricted: boolean
}

// ── VersionEntry ─────────────────────────────────────────────────────────────────────

export interface VersionEntry {
  label: string
  value: string
  state: string
  meta: DatasetMeta
  files: DataFile[]
}

// ── File tree (built client-side from directoryLabel paths) ───────────────────

export interface TreeNode {
  files: (DataFile & { index: number })[]
  dirs: Record<string, TreeNode>
}

// ── Variable metadata ─────────────────────────────────────────────────────────

export interface Variable {
  name: string
  label: string
  type: string
}

// ── README sections ───────────────────────────────────────────────────────────

export type Section =
  // Pink tier (minimum README)
  | 'title'
  | 'authors'
  | 'description'
  | 'contact'
  | 'software'
  | 'methodology'
  | 'license'
  | 'related_publications'
  | 'doi'
  // Green tier (enhanced README)
  | 'version'
  | 'variables'
  | 'files'
  | 'data_collection'
  | 'abbreviations'
  | 'contributors'
  | 'date_of_collection'
  | 'funding'
  | 'geographic_coverage'
  | 'citation'
  | 'data_sources'
  | 'time_period'

export type SectionTier = 'pink' | 'green'

export interface SectionMeta {
  label: string
  tier: SectionTier
  description: string
}

export const SECTION_META: Record<Section, SectionMeta> = {
  // ── Pink (minimum) ──
  title:                { tier: 'pink',  label: 'Title',                     description: 'Dataset title' },
  authors:              { tier: 'pink',  label: 'Author / Creator',           description: 'People responsible for the dataset' },
  description:          { tier: 'pink',  label: 'Description / Summary',      description: 'Purpose, nature, and scope of the dataset' },
  contact:              { tier: 'pink',  label: 'Contact Information',        description: 'Who to contact about this dataset' },
  software:             { tier: 'pink',  label: 'Software / Tools Used',      description: 'Software used to generate the dataset' },
  methodology:          { tier: 'pink',  label: 'Methodology',                description: 'How the data was collected and processed' },
  license:              { tier: 'pink',  label: 'License Information',        description: 'License governing use and distribution' },
  related_publications: { tier: 'pink',  label: 'Related Publications',       description: 'Publications that use this dataset' },
  doi:                  { tier: 'pink',  label: 'DOI / Persistent Identifier',description: 'Permanent identifier for the dataset' },
  // ── Green (enhanced) ──
  version:              { tier: 'green', label: 'Version Information',        description: 'Dataset versions, updates, and changes' },
  variables:            { tier: 'green', label: 'Variable List / Data Dictionary', description: 'Variable names, descriptions, units, and labels' },
  files:                { tier: 'green', label: 'File List / Directory',      description: 'All files with descriptions and relationships' },
  data_collection:      { tier: 'green', label: 'Data Collection & Processing', description: 'Instruments, conditions, and processing methods' },
  abbreviations:        { tier: 'green', label: 'Abbreviations / Codes Used', description: 'Explanation of abbreviations and special codes' },
  contributors:         { tier: 'green', label: 'Contributors / Co-investigators', description: 'Others who contributed to the dataset' },
  date_of_collection:   { tier: 'green', label: 'Date of Collection',         description: 'When the data were collected' },
  funding:              { tier: 'green', label: 'Funding / Grant Information', description: 'Grants and funding sources' },
  geographic_coverage:  { tier: 'green', label: 'Geographic Coverage',        description: 'Geographic scope of the data' },
  citation:             { tier: 'green', label: 'Recommended Citation',       description: 'Preferred citation format' },
  data_sources:         { tier: 'green', label: 'Data Sources',               description: 'Sources the dataset was derived from' },
  time_period:          { tier: 'green', label: 'Time Period Covered',        description: 'Time period the data refers to' },
}

export const PINK_SECTIONS: Section[] = Object.entries(SECTION_META)
  .filter(([, v]) => v.tier === 'pink')
  .map(([k]) => k as Section)

export const GREEN_SECTIONS: Section[] = Object.entries(SECTION_META)
  .filter(([, v]) => v.tier === 'green')
  .map(([k]) => k as Section)

export const ALL_SECTIONS: Section[] = [...PINK_SECTIONS, ...GREEN_SECTIONS]

// Default for advanced mode: every pink section, plus the three green sections
// that come from the dataset itself — version history, the variable dictionary
// and the file listing — rather than from something the depositor has to write.
export const DEFAULT_SECTIONS: Section[] = [...PINK_SECTIONS, 'version', 'variables', 'files']

// ── Generation mode ───────────────────────────────────────────────────────────

export type GenerationMode = 'basic' | 'advanced'

// ── Custom sections ───────────────────────────────────────────────────────────

export interface CustomSection {
  id: string
  title: string
  content: string
}

// ── Status ────────────────────────────────────────────────────────────────────

export type StatusState = 'idle' | 'active' | 'done' | 'error'

export interface Status {
  message: string
  state: StatusState
}

// ── View tabs ─────────────────────────────────────────────────────────────────

export type Tab = 'preview' | 'raw' | 'dual'
