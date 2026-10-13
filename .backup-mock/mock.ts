import type { DatasetMeta, DataFile, Variable } from './types'

export const MOCK_META: DatasetMeta = {
  title:       'Urban Green Space and Mental Health Outcomes in Canadian Mid-Sized Cities, 2018–2022',
  authors:     'Tremblay, Sophie (Université de Montréal); Okafor, Emeka (University of Toronto); Lindström, Anna (University of British Columbia)',
  description: 'This dataset contains longitudinal survey data and spatial indicators examining the relationship between access to urban green space and self-reported mental health outcomes across six Canadian mid-sized cities (population 100,000–500,000). Data were collected across four annual waves from 2018 to 2022, including a COVID-19 pandemic period.',
  keywords:    'urban green space, mental health, parks, Canada, longitudinal, PHQ-9, GAD-7, COVID-19',
  subject:     'Social Sciences',
  doi:         'https://doi.org/10.5683/SP3/7HWSTS',
  publisher:   'Borealis',
  year:        '2023',
  license:     'CC BY 4.0',
  version:     '2.1',
  software: [
    { name: 'R', version: '4.3.1' },
    { name: 'ArcGIS Pro', version: '3.1' },
  ],
  contributors: [
    { type: 'Data Collector', name: 'Nguyen, Minh' },
    { type: 'Data Collector', name: 'Beaumont, Claire' },
    { type: 'Project Manager', name: 'Reyes, Carlos' },
  ],
  dateOfCollection: [
    { start: '2018-03-01', end: '2018-06-30' },
    { start: '2019-03-01', end: '2019-06-30' },
    { start: '2020-03-01', end: '2020-06-30' },
    { start: '2022-03-01', end: '2022-06-30' },
  ],
  funding: [
    { agency: 'Social Sciences and Humanities Research Council (SSHRC)', grant: '435-2017-0892' },
    { agency: 'Canadian Institutes of Health Research (CIHR)', grant: 'PJT-156123' },
  ],
  relatedPublications: [
    {
      citation: 'Tremblay, S., Okafor, E., & Lindström, A. (2023). Urban green space access and mental health during COVID-19. Canadian Journal of Public Health, 114(2), 210–221.',
      url: 'https://doi.org/10.17269/s41997-022-00720-3',
    },
  ],
  dataSources: [
    'Statistics Canada Census 2016 and 2021 boundary files',
    'OpenStreetMap park polygons (accessed 2018)',
    'Natural Resources Canada Land Cover dataset 2015',
  ],
  timePeriod: [{ start: '2018-01-01', end: '2022-12-31' }],
  geographicCoverage: [
    { country: 'Canada', state: 'Quebec', city: 'Sherbrooke', other: '' },
    { country: 'Canada', state: 'Ontario', city: 'Kingston', other: '' },
    { country: 'Canada', state: 'British Columbia', city: 'Kelowna', other: '' },
  ],
  contact: [
    { name: 'Tremblay, Sophie', affiliation: 'Université de Montréal', email: 'sophie.tremblay@umontreal.ca' },
  ],
}

export const MOCK_FILES: DataFile[] = [
  { id: 1,  name: 'green_space_survey_waves1-4.csv',   size: 4718592,  contentType: 'text/csv',                       directoryLabel: 'data',       description: 'Main longitudinal survey dataset, all four waves combined',                        tags: 'Data',          restricted: false },
  { id: 5,  name: 'green_space_survey_wave1_2018.csv', size: 1048576,  contentType: 'text/csv',                       directoryLabel: 'data/waves', description: 'Wave 1 data only (2018 baseline)',                                                tags: 'Data',          restricted: false },
  { id: 6,  name: 'green_space_survey_wave2_2019.csv', size: 1124864,  contentType: 'text/csv',                       directoryLabel: 'data/waves', description: 'Wave 2 data only (2019)',                                                         tags: 'Data',          restricted: false },
  { id: 7,  name: 'green_space_survey_wave3_2020.csv', size: 1200128,  contentType: 'text/csv',                       directoryLabel: 'data/waves', description: 'Wave 3 data only (2020, pandemic year)',                                          tags: 'Data',          restricted: false },
  { id: 8,  name: 'green_space_survey_wave4_2022.csv', size: 1179648,  contentType: 'text/csv',                       directoryLabel: 'data/waves', description: 'Wave 4 data only (2022 follow-up)',                                               tags: 'Data',          restricted: false },
  { id: 2,  name: 'spatial_indicators_cities.gpkg',    size: 28311552, contentType: 'application/geopackage+sqlite3', directoryLabel: 'data',       description: 'GeoPackage containing park boundaries, tree canopy rasters, and city boundaries', tags: 'Data, Spatial', restricted: false },
  { id: 4,  name: 'analysis_scripts.zip',              size: 98304,    contentType: 'application/zip',                directoryLabel: 'code',       description: 'R scripts for all analyses reported in the associated publication',                tags: 'Code',          restricted: false },
  { id: 3,  name: 'codebook_v2.pdf',                   size: 512000,   contentType: 'application/pdf',                directoryLabel: 'docs',       description: 'Full variable codebook with response scales and derived variable definitions',     tags: 'Documentation', restricted: false },
  { id: 10, name: 'ethics_approval_redacted.pdf',      size: 204800,   contentType: 'application/pdf',                directoryLabel: 'docs',       description: 'Redacted ethics approval letter from all six institutional review boards',         tags: 'Documentation', restricted: false },
  { id: 9,  name: 'README_v1.txt',                     size: 4096,     contentType: 'text/plain',                     directoryLabel: '',           description: 'Original README from v1.0 deposit',                                               tags: 'Documentation', restricted: false },
]

export const MOCK_VARIABLES: Record<number, Variable[]> = {
  1: [
    { name: 'respondent_id',  label: 'Unique respondent identifier',                type: 'character' },
    { name: 'wave',           label: 'Survey wave (1–4)',                            type: 'numeric'   },
    { name: 'year',           label: 'Year of data collection',                      type: 'numeric'   },
    { name: 'city',           label: 'City code (1–6)',                              type: 'numeric'   },
    { name: 'age',            label: 'Respondent age in years',                      type: 'numeric'   },
    { name: 'gender',         label: 'Gender identity',                              type: 'character' },
    { name: 'income_bracket', label: 'Annual household income bracket',              type: 'character' },
    { name: 'park_dist_m',    label: 'Distance to nearest park (metres)',            type: 'numeric'   },
    { name: 'canopy_pct',     label: 'Tree canopy coverage within 500m buffer (%)', type: 'numeric'   },
    { name: 'gs_visits_week', label: 'Green space visits per week',                  type: 'numeric'   },
    { name: 'phq9_score',     label: 'PHQ-9 depression score (0–27)',                type: 'numeric'   },
    { name: 'gad7_score',     label: 'GAD-7 anxiety score (0–21)',                   type: 'numeric'   },
    { name: 'covid_period',   label: 'Observation during COVID-19 period (0/1)',     type: 'numeric'   },
  ],
}
MOCK_VARIABLES[5] = MOCK_VARIABLES[1]
MOCK_VARIABLES[6] = MOCK_VARIABLES[1]
MOCK_VARIABLES[7] = MOCK_VARIABLES[1]
MOCK_VARIABLES[8] = MOCK_VARIABLES[1]
