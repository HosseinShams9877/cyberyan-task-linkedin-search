import type { MessageKey } from './en';

/**
 * Persian catalogue. Typed against the English key set, so a key added there fails
 * the build here until it is translated.
 *
 * Numbers are interpolated already formatted (Persian digits via `fa-IR`), so no
 * string here spells out a numeral.
 */
const fa: Record<MessageKey, string> = {
  'app.title': 'جست‌وجوی داده‌های لینکدین',
  'app.description':
    'جست‌وجو و تحلیل مجموعه‌داده پروفایل‌های لینکدین: جست‌وجوی کلیدواژه، پالایه‌های عنوان شغلی و مهارت، و داشبورد تجمیعی.',

  'nav.views': 'نماها',
  'nav.search': 'جست‌وجو',
  'nav.dashboard': 'داشبورد',

  'prefs.language': 'زبان',
  'prefs.toPersian': 'تغییر به فارسی',
  'prefs.toEnglish': 'تغییر به انگلیسی',
  'prefs.theme': 'پوسته',
  'prefs.toLight': 'تغییر به پوسته روشن',
  'prefs.toDark': 'تغییر به پوسته تیره',

  'search.label': 'جست‌وجوی پروفایل‌ها',
  'search.placeholder': 'جست‌وجو بر پایه نام، عنوان شغلی، شرکت یا مهارت',

  'filters.jobTitle': 'عنوان شغلی',
  'filters.anyJobTitle': 'هر عنوان شغلی',
  'filters.skill': 'مهارت',
  'filters.anySkill': 'هر مهارت',
  'filters.industry': 'صنعت',
  'filters.anyIndustry': 'هر صنعت',
  'filters.country': 'کشور',
  'filters.anyCountry': 'هر کشور',
  'filters.minYears': 'کمینه سابقه',
  'filters.anyYears': 'بدون محدودیت',
  'filters.yearsPlus': '{years} سال و بیشتر',
  'filters.sort': 'ترتیب بر پایه',
  'filters.hasEmail': 'ایمیل ثبت‌شده دارد',
  'filters.clear': 'پاک کردن پالایه‌ها',
  'filters.clearCount': 'پاک کردن ({count})',
  'filters.optionCount': '{label} ({count})',

  'sort.relevance': 'مرتبط‌ترین',
  'sort.name': 'نام (الفبایی)',
  'sort.connections': 'بیشترین ارتباط',
  'sort.experience': 'بیشترین سابقه',

  'common.loading': 'در حال بارگذاری...',
  'error.transport': 'خطای پیش‌بینی‌نشده در ارتباط با سرویس',

  'results.aria': 'نتایج جست‌وجو',
  'results.errorTitle': 'جست‌وجو ناموفق بود',
  'results.loading': 'در حال بارگذاری پروفایل‌ها...',
  'results.emptyTitle': 'هیچ پروفایلی با این پالایه‌ها همخوان نیست',
  'results.emptyHint': 'کلیدواژه کوتاه‌تری بنویسید، یا یک پالایه را بردارید تا دامنه جست‌وجو گسترده‌تر شود.',
  'results.clearAll': 'پاک کردن همه پالایه‌ها',
  'results.foundOne': '{count} پروفایل یافت شد',
  'results.foundMany': '{count} پروفایل یافت شد',
  'results.took': '{ms} میلی‌ثانیه',

  'card.open': 'گشودن پروفایل {name}',
  'card.noJobTitle': 'عنوان شغلی ثبت نشده',
  'card.connections': 'ارتباط',
  'card.location': 'موقعیت',
  'card.role': 'نقش',
  'card.experience': 'سابقه',
  'card.yearsExperience': '{years} سال سابقه',
  'card.moreSkills': '{count} مورد دیگر',
  'card.matchesSearch': ' (همخوان با جست‌وجوی شما)',

  'pager.aria': 'صفحه‌بندی',
  'pager.previous': 'پیشین',
  'pager.next': 'پسین',

  'dash.errorTitle': 'داشبورد بارگذاری نشد',
  'dash.loading': 'در حال تجمیع مجموعه‌داده...',

  'stat.profiles': 'پروفایل‌های نمایه‌شده',
  /*
   * `⁦ … ⁩` isolates the path: without it the bidi algorithm reads the
   * leading `./` as part of the Persian sentence and renders the run as `data/.`.
   */
  'stat.profilesHint': 'برگرفته از فایل منبع در ⁦./data⁩',
  'stat.contactable': 'قابل تماس',
  'stat.contactableHint': '{count} پروفایل ایمیل ثبت‌شده دارند',
  'stat.skills': 'مهارت‌های یکتا',
  'stat.skillsHint': 'در همه پروفایل‌ها',
  'stat.companies': 'شرکت‌ها',
  'stat.companiesHint': 'کارفرمایان کنونی',
  'stat.countries': 'کشورها',
  'stat.countriesHint': 'با دست‌کم یک پروفایل',
  'stat.avgConnections': 'میانگین ارتباط‌ها',
  'stat.avgConnectionsHint': 'میانگین پروفایل‌هایی که شمار ارتباط دارند',
  'stat.avgExperience': 'میانگین سابقه',
  'stat.avgExperienceHint': 'استنتاج‌شده از سابقه کاری',
  'stat.years': '{years} سال',

  'chart.skillsTitle': 'رایج‌ترین مهارت‌ها',
  'chart.skillsSubtitle': 'پروفایل‌های دارای هر مهارت، {count} مورد نخست',
  'chart.roleTitle': 'ترکیب نقش‌ها',
  'chart.roleSubtitle': 'سهم {count} پروفایل در ده نقش بزرگ',
  'chart.connectionsTitle': 'اندازه شبکه',
  'chart.connectionsSubtitle': 'پروفایل‌ها بر پایه شمار ارتباط‌های لینکدین',
  'chart.industryTitle': 'صنایع',
  'chart.industrySubtitle': 'ده مورد نخست بر پایه شمار پروفایل',
  'chart.companyTitle': 'کارفرمایان',
  'chart.companySubtitle': 'ده شرکت کنونی نخست',
  'chart.salaryTitle': 'حقوق استنتاجی',
  'chart.salarySubtitle': 'پروفایل‌ها در هر بازه، از کمترین',
  'chart.countryTitle': 'کشورها',
  'chart.countrySubtitle': '{count} مورد نخست · {label} سهم {share} را دارد',
  'chart.countrySubtitleFallback': 'ده مورد نخست بر پایه شمار پروفایل',

  'chart.toTable': 'جدول',
  'chart.toChart': 'نمودار',
  'chart.colProfiles': 'پروفایل',
  'chart.colShare': 'سهم',
  'chart.shareOfTotal': '{share} از کل',
  'chart.tableCaption': '{title} - {subtitle}',

  'unit.profiles': 'پروفایل',
  'unit.skill': 'مهارت',
  'unit.role': 'نقش',
  'unit.connections': 'ارتباط',
  'unit.industry': 'صنعت',
  'unit.company': 'شرکت',
  'unit.band': 'بازه',
  'unit.country': 'کشور',

  'drawer.fallbackName': 'پروفایل',
  'drawer.profileAria': 'پروفایل {name}',
  'drawer.close': 'بستن پروفایل',
  'drawer.loading': 'در حال بارگذاری پروفایل...',
  'drawer.errorTitle': 'این پروفایل بارگذاری نشد',
  'drawer.partialWarning':
    'این رکورد از یک سطر ناقص در فایل منبع بازسازی شده است، بنابراین ممکن است برخی فیلدها موجود نباشند.',

  'section.summary': 'چکیده',
  'section.profile': 'پروفایل',
  'section.currentCompany': 'شرکت کنونی',
  'section.experience': 'سابقه کاری ({count})',
  'section.education': 'تحصیلات ({count})',
  'section.skills': 'مهارت‌ها ({count})',
  'section.alsoOnFile': 'دیگر داده‌های ثبت‌شده',
  'section.contact': 'تماس',
  'section.dataQuality': 'کیفیت داده',

  'fact.role': 'نقش',
  'fact.speciality': 'تخصص',
  'fact.seniority': 'سطح ارشدیت',
  'fact.industry': 'صنعت',
  'fact.started': 'آغاز',
  'fact.experience': 'سابقه',
  'fact.salaryBand': 'بازه حقوق',
  'fact.connections': 'ارتباط‌ها',
  'fact.location': 'موقعیت',
  'fact.region': 'منطقه',
  'fact.country': 'کشور',
  'fact.birthYear': 'سال تولد',
  'fact.gender': 'جنسیت',
  'fact.name': 'نام',
  'fact.size': 'اندازه',
  'fact.website': 'وب‌سایت',
  'fact.languages': 'زبان‌ها',
  'fact.certifications': 'گواهی‌نامه‌ها',
  'fact.interests': 'علاقه‌مندی‌ها',
  'fact.emails': 'نشانی‌های ایمیل',
  'fact.phones': 'شماره‌های تماس',

  'value.years': '{years} سال',
  'value.onFile': '{count} مورد ثبت‌شده',
  'value.noneOnFile': 'موردی ثبت نشده',
  'value.present': 'تاکنون',
  'value.roleNotRecorded': 'نقش ثبت نشده',
  'value.schoolNotRecorded': 'مرکز آموزشی ثبت نشده',
  'value.link': 'پیوند',
  'value.other': 'سایر',
  'badge.current': 'کنونی',

  'footer.note':
    'رکوردها از فایل موجود در {path} استخراج شده‌اند. نشانی‌های ایمیل و شماره‌های تماس روی سرور می‌مانند و تنها به صورت شمارش گزارش می‌شوند.',
};

export default fa;
