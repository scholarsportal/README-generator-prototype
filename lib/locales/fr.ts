// Chaînes françaises. Empty '' = not yet translated; the app shows the
// English string until it is filled in.
//
// Typed against en.ts: adding a key to English without adding it here makes
// `npx tsc --noEmit` fail, so nothing can silently go missing.
//
// Keep every {slot} name exactly as in English, but place it wherever French
// word order needs it. Check the English value in en.ts for context.

import type { TranslationKey } from './en'

const fr: Record<TranslationKey, string> = {
  // ── README: section headings ────────────────────────────────────────────────
  'heading.description':          'Description',
  'heading.authors':              'Auteurs',
  'heading.contact':              'Coordonnées',
  'heading.doi':                  'DOI / Identifiant pérenne',
  'heading.license':              'Licence',
  'heading.version':              'Informations sur la version',
  'heading.citation':             'Citation recommandée',
  'heading.related_publications': 'Publications associées',
  'heading.software':             'Logiciels et outils utilisés',
  'heading.methodology':          'Méthodologie',
  'heading.data_collection':      'Collecte et traitement des données',
  'heading.date_of_collection':   'Date de collecte',
  'heading.time_period':          'Période couverte',
  'heading.geographic_coverage':  'Couverture géographique',
  'heading.contributors':         'Collaborateurs / Cochercheurs',
  'heading.funding':              'Financement',
  'heading.data_sources':         'Sources des données',
  'heading.files':                'Fichiers',
  'heading.variables':            'Liste des variables / Dictionnaire de données',
  'heading.abbreviations':        'Abréviations et codes utilisés',
  'heading.untitled_section':     'Section sans titre',

  // ── README: bold field labels (include the colon — French puts a space before it) ──
  'readme.label.subject':         '',
  'readme.label.keywords':        '',
  'readme.label.doi':             '',
  'readme.label.publisher':       '',
  'readme.label.license':         '',
  'readme.label.current_version': '',
  'readme.label.year':            '',
  'readme.label.url':             '',

  // ── README: body sentences ──────────────────────────────────────────────────
  'readme.contact.fallback':      '',
  'readme.license.body':          '',
  'readme.version.not_specified': '',
  'readme.version.history_note':  '',
  'readme.citation.no_authors':   '',
  'readme.citation.no_date':      '',
  'readme.range.between':         '',
  'readme.range.from':            '',
  'readme.range.until':           '',
  'readme.funding.grant':         '',
  'readme.footer':                '',

  // ── README: file table ──────────────────────────────────────────────────────
  'readme.files.count.one':       '',
  'readme.files.count.other':     '',
  'readme.files.excluded.one':    '',
  'readme.files.excluded.other':  '',
  'readme.files.col.file':        '',
  'readme.files.col.format':      '',
  'readme.files.col.size':        '',
  'readme.files.col.description': '',

  // ── README: variables ───────────────────────────────────────────────────────
  'readme.variables.intro':        '',
  'readme.variables.col.variable': '',
  'readme.variables.col.label':    '',
  'readme.variables.col.type':     '',
  'readme.variables.unavailable':  '',
  'readme.variables.none':         '',

  // ── README: placeholder prompts (shown in italics when a section is empty) ──
  'readme.placeholder.related_publications': '',
  'readme.placeholder.software':             '',
  'readme.placeholder.methodology':          '',
  'readme.placeholder.data_collection':      '',
  'readme.placeholder.date_of_collection':   '',
  'readme.placeholder.time_period':          '',
  'readme.placeholder.geographic_coverage':  '',
  'readme.placeholder.contributors':         '',
  'readme.placeholder.funding':              '',
  'readme.placeholder.data_sources':         '',
  'readme.placeholder.abbreviations':        '',

  // ── File size units ─────────────────────────────────────────────────────────
  'unit.bytes': '',
  'unit.kb':    '',
  'unit.mb':    '',

  // ── Sidebar: section picker (label + hover description) ─────────────────────
  'section.title.label':                      '',
  'section.title.description':                '',
  'section.authors.label':                    '',
  'section.authors.description':              '',
  'section.description.label':                '',
  'section.description.description':          '',
  'section.contact.label':                    '',
  'section.contact.description':              '',
  'section.software.label':                   '',
  'section.software.description':             '',
  'section.methodology.label':                '',
  'section.methodology.description':          '',
  'section.license.label':                    '',
  'section.license.description':              '',
  'section.related_publications.label':       '',
  'section.related_publications.description': '',
  'section.doi.label':                        '',
  'section.doi.description':                  '',
  'section.version.label':                    '',
  'section.version.description':              '',
  'section.variables.label':                  '',
  'section.variables.description':            '',
  'section.files.label':                      '',
  'section.files.description':                '',
  'section.data_collection.label':            '',
  'section.data_collection.description':      '',
  'section.abbreviations.label':              '',
  'section.abbreviations.description':        '',
  'section.contributors.label':               '',
  'section.contributors.description':         '',
  'section.date_of_collection.label':         '',
  'section.date_of_collection.description':   '',
  'section.funding.label':                    '',
  'section.funding.description':              '',
  'section.geographic_coverage.label':        '',
  'section.geographic_coverage.description':  '',
  'section.citation.label':                   '',
  'section.citation.description':             '',
  'section.data_sources.label':               '',
  'section.data_sources.description':         '',
  'section.time_period.label':                '',
  'section.time_period.description':          '',

  // ── Generation modes ────────────────────────────────────────────────────────
  'mode.basic':    '',
  'mode.advanced': '',

  // ── Version selector ────────────────────────────────────────────────────────
  'version.draft':  '',
  'version.number': '',

  // ── Save modal ──────────────────────────────────────────────────────────────
  'save.button':                '',
  'save.button_saved':          '',
  'save.modal.title':           '',
  'save.modal.body':            '',
  'save.filename.label':        '',
  'save.token.label':           '',
  'save.token.placeholder':     '',
  'save.token.toggle':          '',
  'save.confirm':               '',
  'save.cancel':                '',
  'save.submit':                '',
  'save.submitting':            '',
  'save.error.token_required':  '',
  'save.error.filename_required': '',

  // ── Status bar ──────────────────────────────────────────────────────────────
  'status.loading':             '',
  'status.connecting':          '',
  'status.connect_failed':      '',
  'status.ready':               '',
  'status.fetching_meta':       '',
  'status.loaded.one':          '',
  'status.loaded.other':        '',
  'status.showing.one':         '',
  'status.showing.other':       '',
  'status.fetch_error':         '',
  'status.fetching_variables':  '',
  'status.generating':          '',
  'status.generated':           '',
  'status.uploading':           '',
  'status.saved':               '',
  'error.no_versions':          '',

  // ── Not-launched screen ─────────────────────────────────────────────────────
  // {button} should match the tool's name as Borealis shows it in that language.
  'launch.title':        '',
  'launch.body':         '',
  'launch.instructions': '',
  'launch.button':       '',
}

export default fr
