// Somalia administrative divisions (regions + districts)
// Notes:
// - IDs are stable slugs used in DB/API payloads.
// - Labels are stored per language so the UI can follow the currently selected app language.

const normLang = (lang) => {
  const l = String(lang || 'en').toLowerCase();
  if (l.startsWith('ar')) return 'ar';
  if (l.startsWith('so')) return 'so';
  return 'en';
};

export const SOMALIA_REGIONS = Object.freeze([
  { id: 'awdal', label: { en: 'Awdal', so: 'Awdal', ar: 'أودال' } },
  { id: 'bakool', label: { en: 'Bakool', so: 'Bakool', ar: 'باكول' } },
  { id: 'banadir', label: { en: 'Banadir', so: 'Banaadir', ar: 'بنادر' } },
  { id: 'bari', label: { en: 'Bari', so: 'Bari', ar: 'بري' } },
  { id: 'bay', label: { en: 'Bay', so: 'Bay', ar: 'باي' } },
  { id: 'galguduud', label: { en: 'Galguduud', so: 'Galguduud', ar: 'جلجدود' } },
  { id: 'gedo', label: { en: 'Gedo', so: 'Gedo', ar: 'جدو' } },
  { id: 'hiiraan', label: { en: 'Hiiraan', so: 'Hiiraan', ar: 'هيران' } },
  { id: 'jubbada-dhexe', label: { en: 'Middle Juba', so: 'Jubbada Dhexe', ar: 'جوبا الوسطى' } },
  { id: 'jubbada-hoose', label: { en: 'Lower Juba', so: 'Jubbada Hoose', ar: 'جوبا السفلى' } },
  { id: 'mudug', label: { en: 'Mudug', so: 'Mudug', ar: 'مدق' } },
  { id: 'nugaal', label: { en: 'Nugaal', so: 'Nugaal', ar: 'نغال' } },
  { id: 'sanaag', label: { en: 'Sanaag', so: 'Sanaag', ar: 'سناغ' } },
  { id: 'shabeellaha-dhexe', label: { en: 'Middle Shabelle', so: 'Shabeellaha Dhexe', ar: 'شبيلي الوسطى' } },
  { id: 'shabeellaha-hoose', label: { en: 'Lower Shabelle', so: 'Shabeellaha Hoose', ar: 'شبيلي السفلى' } },
  { id: 'sool', label: { en: 'Sool', so: 'Sool', ar: 'سول' } },
  { id: 'togdheer', label: { en: 'Togdheer', so: 'Togdheer', ar: 'توجدير' } },
  { id: 'woqooyi-galbeed', label: { en: 'Maroodi Jeex', so: 'Woqooyi Galbeed', ar: 'مرودي جيح' } },
]);

// District lists are best-effort standard spellings; they can be refined later without breaking IDs.
export const SOMALIA_DISTRICTS_BY_REGION = Object.freeze({
  awdal: [
    { id: 'borama', label: { en: 'Borama', so: 'Boorama', ar: 'بوراما' } },
    { id: 'baki', label: { en: 'Baki', so: 'Baki', ar: 'باكي' } },
    { id: 'lughaya', label: { en: 'Lughaya', so: 'Lughaya', ar: 'لغهايا' } },
    { id: 'zeila', label: { en: 'Zeila', so: 'Saylac', ar: 'زيلع' } },
  ],
  bakool: [
    { id: 'hudur', label: { en: 'Hudur', so: 'Xudur', ar: 'هدور' } },
    { id: 'tayeeglow', label: { en: 'Tayeeglow', so: 'Tayeeglow', ar: 'طايغلو' } },
    { id: 'wajid', label: { en: 'Wajid', so: 'Wajiid', ar: 'واجد' } },
    { id: 'yel', label: { en: 'Yel', so: 'Yeed', ar: 'ييد' } },
    { id: 'rabdhuure', label: { en: 'Rabdhuure', so: 'Rabdhuure', ar: 'ربدوري' } },
  ],
  banadir: [
    { id: 'abdiaziz', label: { en: 'Abdiaziz', so: 'Cabdicasiis', ar: 'عبد العزيز' } },
    { id: 'bondhere', label: { en: 'Bondhere', so: 'Boondheere', ar: 'بوندهير' } },
    { id: 'daynile', label: { en: 'Daynile', so: 'Dayniile', ar: 'دينيله' } },
    { id: 'dharkenley', label: { en: 'Dharkenley', so: 'Dharkeenley', ar: 'داركنلي' } },
    { id: 'hodan', label: { en: 'Hodan', so: 'Hodan', ar: 'هودان' } },
    { id: 'howlwadaag', label: { en: 'Howlwadaag', so: 'Howlwadaag', ar: 'حول وداغ' } },
    { id: 'huriwaa', label: { en: 'Huriwaa', so: 'Huriwaa', ar: 'حوريا' } },
    { id: 'kaxda', label: { en: 'Kaxda', so: 'Kaxda', ar: 'كخدة' } },
    { id: 'shangani', label: { en: 'Shangani', so: 'Shangaani', ar: 'شنغاني' } },
    { id: 'shibis', label: { en: 'Shibis', so: 'Shibis', ar: 'شبيس' } },
    { id: 'waaberi', label: { en: 'Waaberi', so: 'Waaberi', ar: 'وابري' } },
    { id: 'wadajir', label: { en: 'Wadajir', so: 'Wadajir', ar: 'وداجر' } },
    { id: 'wardhiigley', label: { en: 'Wardhiigley', so: 'Wardhiigley', ar: 'ورديغلي' } },
    { id: 'xamarjajab', label: { en: 'Xamar Jajab', so: 'Xamar Jajab', ar: 'حمر ججب' } },
    { id: 'xamarweyne', label: { en: 'Xamar Weyne', so: 'Xamar Weyne', ar: 'حمر وين' } },
    { id: 'yakhshid', label: { en: 'Yaqshid', so: 'Yaaqshiid', ar: 'يقشد' } },
  ],
  bari: [
    { id: 'bosaso', label: { en: 'Bosaso', so: 'Boosaaso', ar: 'بوصاصو' } },
    { id: 'iskushuban', label: { en: 'Iskushuban', so: 'Iskushuban', ar: 'إسكوشوبان' } },
    { id: 'qandala', label: { en: 'Qandala', so: 'Qandala', ar: 'قندلا' } },
    { id: 'qardho', label: { en: 'Qardho', so: 'Qardho', ar: 'قرضو' } },
    { id: 'caluula', label: { en: 'Caluula', so: 'Caluula', ar: 'علولة' } },
    { id: 'bandarbeyla', label: { en: 'Bandarbeyla', so: 'Bandarbayla', ar: 'بندربيلة' } },
  ],
  bay: [
    { id: 'baidoa', label: { en: 'Baidoa', so: 'Baydhabo', ar: 'بيدوا' } },
    { id: 'burhakaba', label: { en: 'Burhakaba', so: 'Buurhakaba', ar: 'بورحقبا' } },
    { id: 'dinsoor', label: { en: 'Dinsoor', so: 'Diinsoor', ar: 'دينسور' } },
    { id: 'qansaxdheere', label: { en: 'Qansaxdheere', so: 'Qansaxdheere', ar: 'قنسحدير' } },
  ],
  galguduud: [
    { id: 'dhusamareb', label: { en: 'Dhuusamareeb', so: 'Dhuusamareeb', ar: 'دوسمريب' } },
    { id: 'cabudwaaq', label: { en: 'Cabudwaaq', so: 'Cabudwaaq', ar: 'عبودواق' } },
    { id: 'cadaado', label: { en: 'Cadaado', so: 'Cadaado', ar: 'عدادو' } },
    { id: 'ceelbuur', label: { en: 'Ceelbuur', so: 'Ceelbuur', ar: 'عيل بور' } },
    { id: 'ceeldheer', label: { en: 'Ceeldheer', so: 'Ceeldheer', ar: 'عيل دير' } },
  ],
  gedo: [
    { id: 'garbahaarey', label: { en: 'Garbahaarey', so: 'Garbahaarey', ar: 'قربهاري' } },
    { id: 'bardhere', label: { en: 'Bardhere', so: 'Baardheere', ar: 'برديرة' } },
    { id: 'beletxaawo', label: { en: 'Belet Xaawo', so: 'Belet Xaawo', ar: 'بلت حاوه' } },
    { id: 'doolow', label: { en: 'Doolow', so: 'Doolow', ar: 'دولو' } },
    { id: 'luuq', label: { en: 'Luuq', so: 'Luuq', ar: 'لوق' } },
    { id: 'ceelwaaq', label: { en: 'Ceelwaaq', so: 'Ceelwaaq', ar: 'عيل واق' } },
  ],
  hiiraan: [
    { id: 'beledweyne', label: { en: 'Beledweyne', so: 'Beledweyne', ar: 'بلدوين' } },
    { id: 'buuloburde', label: { en: 'Buuloburde', so: 'Buulo Burde', ar: 'بولو بردي' } },
    { id: 'jalalaqsi', label: { en: 'Jalalaqsi', so: 'Jalalaqsi', ar: 'جلالقسي' } },
    { id: 'matabaan', label: { en: 'Matabaan', so: 'Matabaan', ar: 'مطبان' } },
  ],
  'jubbada-dhexe': [
    { id: 'bu-aale', label: { en: 'Bu’aale', so: 'Bu’aale', ar: 'بوعالي' } },
    { id: 'jilib', label: { en: 'Jilib', so: 'Jilib', ar: 'جلب' } },
    { id: 'sakow', label: { en: 'Saakow', so: 'Saakow', ar: 'ساكو' } },
  ],
  'jubbada-hoose': [
    { id: 'kismayo', label: { en: 'Kismayo', so: 'Kismaayo', ar: 'كسمايو' } },
    { id: 'afmadow', label: { en: 'Afmadow', so: 'Afmadow', ar: 'أفمدو' } },
    { id: 'jamame', label: { en: 'Jamaame', so: 'Jamaame', ar: 'جمامي' } },
    { id: 'badhaadhe', label: { en: 'Badhaadhe', so: 'Badhaadhe', ar: 'بدهادهي' } },
  ],
  mudug: [
    { id: 'gaalkacyo', label: { en: 'Galkayo', so: 'Gaalkacyo', ar: 'جالكعيو' } },
    { id: 'hobyo', label: { en: 'Hobyo', so: 'Hobyo', ar: 'هوبيو' } },
    { id: 'xarardheere', label: { en: 'Xarardheere', so: 'Xarardheere', ar: 'حرر ديري' } },
    { id: 'jariban', label: { en: 'Jariban', so: 'Jariiban', ar: 'جريبان' } },
  ],
  nugaal: [
    { id: 'garowe', label: { en: 'Garowe', so: 'Garoowe', ar: 'غرووي' } },
    { id: 'eyn', label: { en: 'Eyl', so: 'Eyl', ar: 'إيل' } },
  ],
  sanaag: [
    { id: 'ceerigaabo', label: { en: 'Erigavo', so: 'Ceerigaabo', ar: 'عريقافو' } },
    { id: 'ceelafweyn', label: { en: 'Ceel Afweyn', so: 'Ceel Afweyn', ar: 'عيل أفوين' } },
    { id: 'laasqoray', label: { en: 'Laasqoray', so: 'Laasqoray', ar: 'لاسقوراي' } },
  ],
  'shabeellaha-dhexe': [
    { id: 'jowhar', label: { en: 'Jowhar', so: 'Jowhar', ar: 'جوهر' } },
    { id: 'balcad', label: { en: 'Balcad', so: 'Balcad', ar: 'بلعد' } },
    { id: 'adale', label: { en: 'Adale', so: 'Adale', ar: 'عدلي' } },
    { id: 'mahaddaay', label: { en: 'Mahaddaay', so: 'Mahaddaay', ar: 'محداي' } },
  ],
  'shabeellaha-hoose': [
    { id: 'marka', label: { en: 'Marka', so: 'Marka', ar: 'مركا' } },
    { id: 'afgooye', label: { en: 'Afgooye', so: 'Afgooye', ar: 'أفغوي' } },
    { id: 'wanlaweyn', label: { en: 'Wanlaweyn', so: 'Wanlaweyn', ar: 'ونلاوين' } },
    { id: 'qoryooley', label: { en: 'Qoryooley', so: 'Qoryooley', ar: 'قريولي' } },
    { id: 'kurtunwaarey', label: { en: 'Kurtunwaarey', so: 'Kurtunwaarey', ar: 'كرتن واري' } },
    { id: 'sabalaale', label: { en: 'Sablaale', so: 'Sablaale', ar: 'سبلالي' } },
  ],
  sool: [
    { id: 'laascaanood', label: { en: 'Las Anod', so: 'Laascaanood', ar: 'لاس عانود' } },
    { id: 'caynabo', label: { en: 'Caynabo', so: 'Caynabo', ar: 'عينابو' } },
    { id: 'taaleex', label: { en: 'Taleh', so: 'Taleex', ar: 'تالع' } },
  ],
  togdheer: [
    { id: 'burao', label: { en: 'Burao', so: 'Burco', ar: 'بورعو' } },
    { id: 'odweyne', label: { en: 'Oodweyne', so: 'Oodweyne', ar: 'أودوين' } },
    { id: 'sheekh', label: { en: 'Sheikh', so: 'Sheekh', ar: 'شيخ' } },
  ],
  'woqooyi-galbeed': [
    { id: 'hargeisa', label: { en: 'Hargeisa', so: 'Hargeysa', ar: 'هرجيسا' } },
    { id: 'gabiley', label: { en: 'Gabiley', so: 'Gabiley', ar: 'قابيلي' } },
    { id: 'berbera', label: { en: 'Berbera', so: 'Berbera', ar: 'بربرة' } },
  ],
});

export function getSomaliaRegionOptions(lang) {
  const l = normLang(lang);
  return SOMALIA_REGIONS.map((r) => ({ value: r.id, label: r.label[l] || r.label.en }));
}

export function getSomaliaDistrictOptions(regionId, lang) {
  const l = normLang(lang);
  const key = String(regionId || '');
  const rows = Array.isArray(SOMALIA_DISTRICTS_BY_REGION[key]) ? SOMALIA_DISTRICTS_BY_REGION[key] : [];
  return rows.map((d) => ({ value: d.id, label: d.label[l] || d.label.en }));
}

export function getSomaliaRegionLabel(regionId, lang) {
  const l = normLang(lang);
  const r = SOMALIA_REGIONS.find((x) => x.id === String(regionId || ''));
  if (!r) return '';
  return r.label[l] || r.label.en || '';
}

export function getSomaliaDistrictLabel(regionId, districtId, lang) {
  const l = normLang(lang);
  const rows = Array.isArray(SOMALIA_DISTRICTS_BY_REGION[String(regionId || '')]) ? SOMALIA_DISTRICTS_BY_REGION[String(regionId || '')] : [];
  const d = rows.find((x) => x.id === String(districtId || ''));
  if (!d) return '';
  return d.label[l] || d.label.en || '';
}
