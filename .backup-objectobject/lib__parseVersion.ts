import type { DatasetMeta, DataFile } from './types'

type RawField = { typeName: string; typeClass: string; value: unknown }
type CompoundValue = Record<string, { value: string }>

/**
 * Parse a single Dataverse dataset-version object into DatasetMeta.
 *
 * Accepts the version object itself (an element of the array returned by
 * /api/v1/datasets/{id}/versions, or the `data` of /versions/:latest) —
 * NOT the full API envelope. Pass `json.data`, not `json`.
 */
export function parseVersion(v: any, publisher = 'Borealis'): DatasetMeta {
  const cite: Record<string, unknown>[] = v?.metadataBlocks?.citation?.fields || []
  const geo: Record<string, unknown>[] = v?.metadataBlocks?.geospatial?.fields || []

  function findField(fields: Record<string, unknown>[], name: string) {
    return fields.find((x) => (x as RawField).typeName === name) as RawField | undefined
  }

  function primitiveField(name: string, fields = cite): string {
    const f = findField(fields, name)
    if (!f) return ''
    if (Array.isArray(f.value)) return (f.value as string[]).join(', ')
    return (f.value as string) || ''
  }

  function compoundField(name: string, fields = cite): CompoundValue[] {
    const f = findField(fields, name)
    if (!f || f.typeClass !== 'compound') return []
    return (f.value as CompoundValue[]) || []
  }

  function subval(obj: CompoundValue, key: string): string {
    return obj[key]?.value?.trim() || ''
  }

  const authors = compoundField('author')
    .map((a) => {
      const name = subval(a, 'authorName')
      const aff = subval(a, 'authorAffiliation')
      return aff ? `${name} (${aff})` : name
    })
    .filter(Boolean)
    .join('; ')

  const contact = compoundField('datasetContact')
    .map((c) => ({
      name: subval(c, 'datasetContactName'),
      affiliation: subval(c, 'datasetContactAffiliation'),
      email: subval(c, 'datasetContactEmail'),
    }))
    .filter((c) => c.name)

  const description = compoundField('dsDescription')
    .map((d) => subval(d, 'dsDescriptionValue'))
    .filter(Boolean)
    .join('\n\n')

  const software = compoundField('software')
    .map((s) => ({ name: subval(s, 'softwareName'), version: subval(s, 'softwareVersion') }))
    .filter((s) => s.name)

  const contributors = compoundField('contributor')
    .map((c) => ({ type: subval(c, 'contributorType'), name: subval(c, 'contributorName') }))
    .filter((c) => c.name)

  const dateOfCollection = compoundField('dateOfCollection')
    .map((d) => ({ start: subval(d, 'dateOfCollectionStart'), end: subval(d, 'dateOfCollectionEnd') }))
    .filter((d) => d.start || d.end)

  const funding = compoundField('grantNumber')
    .map((f) => ({ agency: subval(f, 'grantNumberAgency'), grant: subval(f, 'grantNumberValue') }))
    .filter((f) => f.agency || f.grant)

  const relatedPublications = compoundField('publication')
    .map((p) => ({
      citation: subval(p, 'publicationCitation'),
      url: subval(p, 'publicationURL') || subval(p, 'publicationIDNumber'),
    }))
    .filter((p) => p.citation || p.url)

  const dataSourcesField = findField(cite, 'dataSources')
  const dataSources: string[] = dataSourcesField
    ? Array.isArray(dataSourcesField.value)
      ? (dataSourcesField.value as string[]).filter(Boolean)
      : [String(dataSourcesField.value)].filter(Boolean)
    : []

  const timePeriod = compoundField('timePeriodCovered')
    .map((t) => ({ start: subval(t, 'timePeriodCoveredStart'), end: subval(t, 'timePeriodCoveredEnd') }))
    .filter((t) => t.start || t.end)

  const geographicCoverage = compoundField('geographicCoverage', geo)
    .map((g) => ({
      country: subval(g, 'country'),
      state: subval(g, 'state'),
      city: subval(g, 'city'),
      other: subval(g, 'otherGeographicCoverage'),
    }))
    .filter((g) => g.country || g.state || g.city || g.other)

  return {
    title: primitiveField('title'),
    authors,
    description,
    keywords: primitiveField('keyword'),
    subject: primitiveField('subject'),
    // Every version object carries datasetPersistentId, so no need to reach
    // outside it for the DOI the way the old dataset route did.
    doi: v?.datasetPersistentId || '',
    publisher,
    year: v?.releaseTime ? new Date(v.releaseTime).getFullYear().toString() : '',
    license: v?.license?.name || '',
    version:
      v?.versionState === 'DRAFT'
        ? 'DRAFT'
        : v?.versionNumber
        ? `${v.versionNumber}.${v.versionMinorNumber}`
        : '',
    software,
    contributors,
    dateOfCollection,
    funding,
    relatedPublications,
    dataSources,
    timePeriod,
    geographicCoverage,
    contact,
  }
}

/**
 * Map a Dataverse file array into DataFile[].
 *
 * Works on both `version.files` (from /versions) and the `data` of the
 * /versions/:latest/files endpoint — they share the same element shape.
 */
export function parseFiles(raw: any[]): DataFile[] {
  return (raw || []).map((f: any) => ({
    id: f.dataFile?.id ?? 0,
    name: f.dataFile?.filename || f.label || 'unnamed',
    size: f.dataFile?.filesize ?? 0,
    contentType: f.dataFile?.contentType || '',
    directoryLabel: f.directoryLabel || '',
    description: f.description || '',
    tags: (f.categories || []).join(', '),
    restricted: f.restricted ?? false,
  }))
}

/** Dropdown label for a version object. */
export function versionLabel(v: any): string {
  if (v?.versionState === 'DRAFT') return 'Draft (unpublished)'
  return `Version ${v?.versionNumber}.${v?.versionMinorNumber}`
}

/** Stable value for a version object, usable as a select key. */
export function versionValue(v: any): string {
  if (v?.versionState === 'DRAFT') return ':draft'
  return `${v?.versionNumber}.${v?.versionMinorNumber}`
}
