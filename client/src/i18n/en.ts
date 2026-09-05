/**
 * English catalogue - the source of truth for the key set.
 *
 * `MessageKey` is derived from this object, so every other language is a
 * `Record<MessageKey, string>` and a missing or misspelled key is a type error
 * rather than a blank space on screen.
 *
 * `{name}` placeholders are filled by `t(key, vars)`; numbers passed through it are
 * already formatted for the active locale by the caller.
 */
const en = {
  'app.title': 'LinkedIn Dataset Search',
  'app.description':
    'Search and analyse a LinkedIn profile dataset: keyword search, job title and skill filters, and an aggregate dashboard.',

  'nav.views': 'Views',
  'nav.search': 'Search',
  'nav.dashboard': 'Dashboard',

  'prefs.language': 'Language',
  'prefs.toPersian': 'Switch to Persian',
  'prefs.toEnglish': 'Switch to English',
  'prefs.theme': 'Theme',
  'prefs.toLight': 'Switch to the light theme',
  'prefs.toDark': 'Switch to the dark theme',

  'search.label': 'Search profiles',
  'search.placeholder': 'Search by name, job title, company or skill',

  'filters.jobTitle': 'Job title',
  'filters.anyJobTitle': 'Any job title',
  'filters.skill': 'Skill',
  'filters.anySkill': 'Any skill',
  'filters.industry': 'Industry',
  'filters.anyIndustry': 'Any industry',
  'filters.country': 'Country',
  'filters.anyCountry': 'Any country',
  'filters.minYears': 'Minimum experience',
  'filters.anyYears': 'Any',
  'filters.yearsPlus': '{years}+ years',
  'filters.sort': 'Sort by',
  'filters.hasEmail': 'Has an email on file',
  'filters.clear': 'Clear filters',
  'filters.clearCount': 'Clear ({count})',
  'filters.optionCount': '{label} ({count})',

  'sort.relevance': 'Best match',
  'sort.name': 'Name (A-Z)',
  'sort.connections': 'Most connections',
  'sort.experience': 'Most experience',

  'common.loading': 'Loading...',
  'error.transport': 'Unexpected error while contacting the API',

  'results.aria': 'Search results',
  'results.errorTitle': 'Search failed',
  'results.loading': 'Loading profiles...',
  'results.emptyTitle': 'No profiles match these filters',
  'results.emptyHint': 'Try a shorter keyword, or clear a filter to widen the search.',
  'results.clearAll': 'Clear all filters',
  'results.foundOne': '{count} profile found',
  'results.foundMany': '{count} profiles found',
  'results.took': '{ms} ms',

  'card.open': 'Open profile for {name}',
  'card.noJobTitle': 'Job title unknown',
  'card.connections': 'connections',
  'card.location': 'Location',
  'card.role': 'Role',
  'card.experience': 'Experience',
  'card.yearsExperience': '{years} yrs experience',
  'card.moreSkills': '+{count} more',
  'card.matchesSearch': ' (matches your search)',

  'pager.aria': 'Pagination',
  'pager.previous': 'Previous',
  'pager.next': 'Next',

  'dash.errorTitle': 'Could not load the dashboard',
  'dash.loading': 'Aggregating the dataset...',

  'stat.profiles': 'Profiles indexed',
  'stat.profilesHint': 'Parsed from the source file in ./data',
  'stat.contactable': 'Contactable',
  'stat.contactableHint': '{count} have an email on file',
  'stat.skills': 'Distinct skills',
  'stat.skillsHint': 'Across all profiles',
  'stat.companies': 'Companies',
  'stat.companiesHint': 'Current employers',
  'stat.countries': 'Countries',
  'stat.countriesHint': 'With at least one profile',
  'stat.avgConnections': 'Avg connections',
  'stat.avgConnectionsHint': 'Mean across profiles that report a count',
  'stat.avgExperience': 'Avg experience',
  'stat.avgExperienceHint': 'Inferred from the work history',
  'stat.years': '{years} yrs',

  'chart.skillsTitle': 'Most common skills',
  'chart.skillsSubtitle': 'Profiles listing each skill, top {count}',
  'chart.roleTitle': 'Role mix',
  'chart.roleSubtitle': 'Share of the {count} profiles in the ten biggest roles',
  'chart.connectionsTitle': 'Network size',
  'chart.connectionsSubtitle': 'Profiles by number of LinkedIn connections',
  'chart.industryTitle': 'Industries',
  'chart.industrySubtitle': 'Top 10 by profile count',
  'chart.companyTitle': 'Employers',
  'chart.companySubtitle': 'Top 10 current companies',
  'chart.salaryTitle': 'Inferred salary',
  'chart.salarySubtitle': 'Profiles per band, lowest first',
  'chart.countryTitle': 'Countries',
  'chart.countrySubtitle': 'Top {count} · {label} holds {share}',
  'chart.countrySubtitleFallback': 'Top 10 by profile count',

  'chart.toTable': 'Table',
  'chart.toChart': 'Chart',
  'chart.colProfiles': 'Profiles',
  'chart.colShare': 'Share',
  'chart.shareOfTotal': '{share} of the total',
  'chart.tableCaption': '{title} - {subtitle}',

  'unit.profiles': 'profiles',
  'unit.skill': 'Skill',
  'unit.role': 'Role',
  'unit.connections': 'Connections',
  'unit.industry': 'Industry',
  'unit.company': 'Company',
  'unit.band': 'Band',
  'unit.country': 'Country',

  'drawer.fallbackName': 'Profile',
  'drawer.profileAria': '{name} profile',
  'drawer.close': 'Close profile',
  'drawer.loading': 'Loading profile...',
  'drawer.errorTitle': 'Could not load this profile',
  'drawer.partialWarning':
    'This record was reconstructed from a partially malformed row in the source file, so some fields may be missing.',

  'section.summary': 'Summary',
  'section.profile': 'Profile',
  'section.currentCompany': 'Current company',
  'section.experience': 'Experience ({count})',
  'section.education': 'Education ({count})',
  'section.skills': 'Skills ({count})',
  'section.alsoOnFile': 'Also on file',
  'section.contact': 'Contact',
  'section.dataQuality': 'Data quality',

  'fact.role': 'Role',
  'fact.speciality': 'Speciality',
  'fact.seniority': 'Seniority',
  'fact.industry': 'Industry',
  'fact.started': 'Started',
  'fact.experience': 'Experience',
  'fact.salaryBand': 'Salary band',
  'fact.connections': 'Connections',
  'fact.location': 'Location',
  'fact.region': 'Region',
  'fact.country': 'Country',
  'fact.birthYear': 'Birth year',
  'fact.gender': 'Gender',
  'fact.name': 'Name',
  'fact.size': 'Size',
  'fact.website': 'Website',
  'fact.languages': 'Languages',
  'fact.certifications': 'Certifications',
  'fact.interests': 'Interests',
  'fact.emails': 'Email addresses',
  'fact.phones': 'Phone numbers',

  'value.years': '{years} years',
  'value.onFile': '{count} on file',
  'value.noneOnFile': 'None on file',
  'value.present': 'Present',
  'value.roleNotRecorded': 'Role not recorded',
  'value.schoolNotRecorded': 'School not recorded',
  'value.link': 'Link',
  'value.other': 'Other',
  'badge.current': 'Current',

  'footer.note':
    'Records were parsed from the file in {path}. Email addresses and phone numbers stay on the server and are only ever reported as counts.',
} as const;

export type MessageKey = keyof typeof en;
export default en;
