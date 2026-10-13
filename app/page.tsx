'use client'
import { Suspense } from 'react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DatasetMeta, DataFile, Section, Tab, Status, SignedUrls, GenerationMode, CustomSection, VersionEntry } from '@/lib/types'
import { PINK_SECTIONS, DEFAULT_SECTIONS } from '@/lib/types'
import { fetchVariables, fetchVersions, saveReadme, parseSignedUrls, resolveCallback } from '@/lib/borealis'
import { generateReadme, isTabular } from '@/lib/template'
import { buildSections, titleBlock, type SectionBlock } from '@/lib/sections'
import type { TableEdit } from '@/lib/tables'
import { normalizeLocale, type Locale } from '@/lib/i18n'
import { DEMO, DEMO_SITE_URL, versionsFromRaw } from '@/lib/demo'
import Header from '@/components/Header'
import DemoBanner from '@/components/DemoBanner'
import Sidebar from '@/components/Sidebar/Sidebar'
import Viewer from '@/components/Viewer/Viewer'
import SaveArea from '@/components/SaveArea'
import styles from './page.module.css'
export default function Home() {
  return (
    <Suspense>
      <App />
    </Suspense>
  )
}
function App() {
  const searchParams = useSearchParams()
  const [pid, setPid]               = useState('')
  const [siteUrl, setSiteUrl]       = useState('')
  const [token, setToken]           = useState('')
  const [signedUrls, setSignedUrls] = useState<SignedUrls | undefined>(undefined)
  const [meta, setMeta]             = useState<DatasetMeta | null>(null)
  const [files, setFiles]           = useState<DataFile[]>([])
  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set())
  const [variableIds, setVariableIds]   = useState<Set<number>>(new Set())
  const [version, setVersion]         = useState(':latest')
  const [versions, setVersions]       = useState<VersionEntry[]>([])
  const [fetching, setFetching]     = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [mode, setMode]             = useState<GenerationMode>('basic')
  const [sections, setSections]     = useState<Section[]>(DEFAULT_SECTIONS)
  const [customSections, setCustomSections] = useState<CustomSection[]>([])
  const [markdown, setMarkdown]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [tab, setTab]               = useState<Tab>('preview')
  const [status, setStatus]         = useState<Status>({ message: 'loading dataset…', state: 'active' })
  const [launched, setLaunched]     = useState(false)
  // Text the user typed for a section. Only edited sections appear here, so
  // everything else keeps following the dataset. Deliberately NOT cleared when
  // the version or language changes — the 'edited' tag and reset link in the
  // sidebar are what make that visible.
  const [sectionText, setSectionText] = useState<Partial<Record<Section, string>>>({})
  // Columns added and cells typed in the Files and Variables grids. Keyed by
  // row, so edits survive changing the selection or the version.
  const [tableEdits, setTableEdits] = useState<{ files?: TableEdit; variables?: TableEdit }>({})
  // Variable metadata, fetched when the Variables editor is opened and reused
  // at generation instead of being fetched twice.
  const [variableMap, setVariableMap] = useState<Map<number, Awaited<ReturnType<typeof fetchVariables>>>>(new Map())
  // Starts from the language Borealis launched in ({localeCode} in tool.json);
  // the header toggle overrides it for this session only. Deliberately not
  // saved, so every new launch follows Borealis's language again.
  const [locale, setLocale]         = useState<Locale>(() => normalizeLocale(searchParams.get('locale')))
  // Demo mode only: true once the viewer has pasted their own dataset, so the
  // banner can say which one is on screen.
  const [usingOwn, setUsingOwn]     = useState(false)

  // Keep <html lang> in step so screen readers, hyphenation and spellcheck
  // use the right language.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    async function init() {
      const callbackParam = searchParams.get('callback')
      const directPid     = searchParams.get('datasetPid')
      const directSiteUrl = searchParams.get('siteUrl') || ''
      if (callbackParam) {
        setLaunched(true)
        setStatus({ message: 'connecting to Dataverse…', state: 'active' })
        try {
          const { pid: resolvedPid, signedUrls: resolvedSigned, siteUrl: callbackSite } = await resolveCallback(callbackParam)
          // The callback response is where siteUrl lives; the URL carries only
          // the callback itself and the locale. Without this, any call that is
          // not signed falls back to production Borealis.
          const site = callbackSite || directSiteUrl
          setPid(resolvedPid)
          setSiteUrl(site)
          setSignedUrls(resolvedSigned)
          await handleFetch(resolvedPid, resolvedSigned, site)
        } catch (e) {
          setFetchError(String(e))
          setStatus({ message: 'failed to connect to Dataverse', state: 'error' })
        }
        return
      }
      if (directPid) {
        setLaunched(true)
        const signed = parseSignedUrls(searchParams)
        if (signed) setSignedUrls(signed)
        setPid(directPid)
        setSiteUrl(directSiteUrl)
        await handleFetch(directPid, signed, directSiteUrl)
        return
      }
      // A static demo build has no launch flow to wait for, so it opens on the
      // bundled dataset instead of the "open from a dataset page" screen.
      if (DEMO) {
        setLaunched(true)
        setPid('demo')
        setSiteUrl(DEMO_SITE_URL)
        await handleFetch('demo', undefined, DEMO_SITE_URL)
        return
      }
      setLaunched(false)
      setStatus({ message: 'ready', state: 'idle' })
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Each section's content as it will appear, for the sidebar editors. The
  // variable tables need data only fetched at generate time, so they preview
  // with an empty map and the sidebar shows a note instead.
  const sectionBlocks = useMemo(() => {
    if (!meta) return {} as Partial<Record<Section, SectionBlock>>
    const selected = files.filter((f) => selectedIds.has(f.id))
    // titleBlock is separate from buildSections, so it has to be added here or
    // the Title row has no editor behind it.
    const blocks = [titleBlock(meta), ...buildSections({ meta, selectedFiles: selected, allFiles: files, variableMap, locale, tableEdits })]
    return Object.fromEntries(blocks.map((b) => [b.section, b])) as Partial<Record<Section, SectionBlock>>
  }, [meta, files, selectedIds, locale, variableMap, tableEdits])

  const handleTableEditChange = useCallback((which: 'files' | 'variables', edit: TableEdit) => {
    setTableEdits((prev) => ({ ...prev, [which]: edit }))
  }, [])

  // Fetch variable metadata for the ticked tabular files, skipping any already
  // loaded, so opening the editor twice does not refetch.
  const loadVariables = useCallback(async () => {
    const wanted = files.filter((f) => variableIds.has(f.id) && !variableMap.has(f.id))
    if (!wanted.length) return
    const resolvedToken = token || undefined
    const site = siteUrl || undefined
    const pairs = await Promise.all(
      wanted.map(async (f) => [f.id, await fetchVariables(f.id, signedUrls, resolvedToken, site)] as const)
    )
    setVariableMap((prev) => {
      const next = new Map(prev)
      for (const [id, vars] of pairs) next.set(id, vars)
      return next
    })
  }, [files, variableIds, variableMap, token, siteUrl, signedUrls])

  const handleSectionTextChange = useCallback((s: Section, value: string) => {
    setSectionText((prev) => ({ ...prev, [s]: value }))
  }, [])

  const handleSectionReset = useCallback((s: Section) => {
    setSectionText((prev) => {
      const next = { ...prev }
      delete next[s]
      return next
    })
  }, [])

  // Apply an already-fetched version to the UI. No network call — every version
  // arrives fully parsed from the single /api/versions request.
  function applyVersion(entry: VersionEntry) {
    setMeta(entry.meta)
    setFiles(entry.files)
    setSelectedIds(new Set(entry.files.filter((f) => !f.restricted).map((f) => f.id)))
    setVariableIds(new Set(entry.files.filter((f) => !f.restricted && isTabular(f)).map((f) => f.id)))
    setMarkdown('')
  }

  async function handleFetch(resolvedPid: string, resolvedSigned?: SignedUrls, resolvedSiteUrl?: string, resolvedVersion?: string) {
    if (!resolvedPid) return
    setFetching(true)
    setFetchError('')
    setStatus({ message: 'fetching dataset metadata…', state: 'active' })
    setMeta(null)
    setFiles([])
    setSelectedIds(new Set())
    setVariableIds(new Set())
    setMarkdown('')
    const resolvedToken = token || undefined
    const site = resolvedSiteUrl || siteUrl || undefined
    try {
      const data = await fetchVersions(resolvedPid, resolvedToken, site, resolvedSigned)
      applyVersionList(data, resolvedVersion)
    } catch (e) {
      setFetchError(String(e))
      setStatus({ message: 'error fetching dataset', state: 'error' })
    } finally {
      setFetching(false)
    }
  }

  // Shared by the normal fetch and, in demo mode, by a dataset pasted in by the
  // viewer: both end up with the same VersionEntry[] to show.
  function applyVersionList(data: VersionEntry[], resolvedVersion?: string) {
    if (!data.length) throw new Error('No versions returned for this dataset.')
    setVersions(data)
    // Dataverse returns newest-first, so index 0 is the draft when one exists
    // and the caller can see it, otherwise the newest published version.
    const chosen = (resolvedVersion && data.find((d) => d.value === resolvedVersion)) || data[0]
    setVersion(chosen.value)
    applyVersion(chosen)
    setStatus({ message: `loaded ${chosen.label} — ${chosen.files.length} files`, state: 'done' })
  }

  // Demo mode: render a /versions payload the viewer pasted. Parsed in the
  // browser; nothing leaves the page. Throws so the banner can show why.
  function handleDemoJson(json: unknown) {
    const data = versionsFromRaw(json)
    setFetchError('')
    setVariableMap(new Map())
    setSectionText({})
    setTableEdits({})
    applyVersionList(data)
    setUsingOwn(true)
  }

  function handleDemoReset() {
    setFetchError('')
    setVariableMap(new Map())
    setSectionText({})
    setTableEdits({})
    setUsingOwn(false)
    handleFetch('demo', undefined, DEMO_SITE_URL)
  }

  const handleVersionChange = useCallback((v: string) => {
    const entry = versions.find((x) => x.value === v)
    if (!entry) return
    setVersion(v)
    applyVersion(entry)
    setStatus({ message: `showing ${entry.label} — ${entry.files.length} files`, state: 'done' })
  }, [versions])

  const handleToggleFile = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [])
  const handleToggleVariable = useCallback((id: number, checked: boolean) => {
    setVariableIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [])
  const handleToggleAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(files.map((f) => f.id)) : new Set())
  }, [files])
  const handleModeChange = useCallback((m: GenerationMode) => {
    setMode(m)
    if (m === 'advanced') setSections(DEFAULT_SECTIONS)
  }, [])
  const handleToggleSection = useCallback((s: Section) => {
    setSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }, [])
  const handleAddCustomSection = useCallback((section: CustomSection) => {
    setCustomSections((prev) => [...prev, section])
  }, [])
  const handleRemoveCustomSection = useCallback((id: string) => {
    setCustomSections((prev) => prev.filter((s) => s.id !== id))
  }, [])
  const handleUpdateCustomSection = useCallback((id: string, field: 'title' | 'content', value: string) => {
    setCustomSections((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }, [])
  async function handleGenerate() {
    if (!meta) return
    setGenerating(true)
    const activeSections: Section[] = mode === 'basic' ? PINK_SECTIONS : sections
    const selectedFiles = files.filter((f) => selectedIds.has(f.id))
    const tabularFiles  = selectedFiles.filter(isTabular).filter((f) => variableIds.has(f.id))
    const resolvedToken = token || undefined
    const site = siteUrl || undefined
    const vars = new Map(variableMap)
    for (const f of tabularFiles) {
      if (vars.has(f.id)) continue
      setStatus({ message: `fetching variables for ${f.name}…`, state: 'active' })
      vars.set(f.id, await fetchVariables(f.id, signedUrls, resolvedToken, site))
    }
    setVariableMap(vars)
    setStatus({ message: 'generating README…', state: 'active' })
    const md = generateReadme({ meta, selectedFiles, allFiles: files, sections: activeSections, variableMap: vars, customSections: mode === 'advanced' ? customSections : [], locale, overrides: sectionText, tableEdits })
    setMarkdown(md)
    setStatus({ message: `README generated (${mode} mode)`, state: 'done' })
    setGenerating(false)
  }
  function handleCopy() { navigator.clipboard.writeText(markdown) }
  function handleDownload(ext: 'md' | 'txt') {
    const name = (meta?.title || 'README').replace(/[^a-z0-9]/gi, '_').slice(0, 40)
    const mimeType = ext === 'md' ? 'text/markdown' : 'text/plain'
    const blob = new Blob([markdown], { type: mimeType })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `README_${name}.${ext}` })
    a.click()
  }
  async function handleSave(saveToken: string, filename: string) {
    setStatus({ message: 'uploading README to Borealis…', state: 'active' })
    try {
      await saveReadme(pid, saveToken || token, markdown, signedUrls?.addFile, filename, siteUrl || undefined)
      setStatus({ message: 'README saved to dataset ✓', state: 'done' })
    } catch (e) {
      setStatus({ message: String(e), state: 'error' })
      throw e
    }
  }
  if (!launched && status.state === 'idle') {
    return (
      <div className={styles.app}>
        <Header locale={locale} onLocaleChange={setLocale} />
        <div className={styles.notLaunched}>
          <div className={styles.notLaunchedGlyph}>README</div>
          <div className={styles.notLaunchedTitle}>Open from a dataset page</div>
          <div className={styles.notLaunchedSub}>
            This tool must be launched from a Borealis dataset page.
            Navigate to a dataset on Borealis and click the <strong>Generate README</strong> button.
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={styles.app}>
      <Header locale={locale} onLocaleChange={setLocale} />
      {DEMO && (
        <DemoBanner onLoadJson={handleDemoJson} usingOwn={usingOwn} onReset={handleDemoReset} />
      )}
      <div className={`${styles.layout} ${markdown ? '' : styles.layoutSetup}`}>
        <Sidebar
          token={token}
          onTokenChange={setToken}
          hasSignedUrls={!!signedUrls}
          fetching={fetching}
          meta={meta}
          files={files}
          selectedIds={selectedIds}
          variableIds={variableIds}
          onToggleFile={handleToggleFile}
          onToggleVariable={handleToggleVariable}
          onToggleAll={handleToggleAll}
          sections={sections}
          onToggleSection={handleToggleSection}
          mode={mode}
          onModeChange={handleModeChange}
          customSections={customSections}
          onAddCustomSection={handleAddCustomSection}
          onRemoveCustomSection={handleRemoveCustomSection}
          onUpdateCustomSection={handleUpdateCustomSection}
          onGenerate={handleGenerate}
          generating={generating}
          hasReadme={!!markdown}
          version={version}
          versions={versions.map((v) => ({ label: v.label, value: v.value }))}
          onVersionChange={handleVersionChange}
          error={fetchError}
          sectionBlocks={sectionBlocks}
          sectionText={sectionText}
          onSectionTextChange={handleSectionTextChange}
          onSectionReset={handleSectionReset}
          tableEdits={tableEdits}
          onTableEditChange={handleTableEditChange}
          onNeedVariables={loadVariables}
          wide={!markdown}
        />
        {markdown && (
          <Viewer
            markdown={markdown}
            onChange={setMarkdown}
            tab={tab}
            onTabChange={setTab}
            onCopy={handleCopy}
            onDownload={handleDownload}
            title={meta?.title}
            saveArea={
              <SaveArea
                onSave={handleSave}
                hasSignedUrl={!!signedUrls?.addFile}
                existingFiles={files.map((f) => f.name)}
                demo={DEMO}
              />
            }
          />
        )}
      </div>
    </div>
  )
}
