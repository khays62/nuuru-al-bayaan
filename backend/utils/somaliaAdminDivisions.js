// Somalia administrative division IDs used for validation.
// Keep IDs stable; labels live in frontend.

export const SOMALIA_REGION_IDS = Object.freeze([
  'awdal',
  'bakool',
  'banadir',
  'bari',
  'bay',
  'galguduud',
  'gedo',
  'hiiraan',
  'jubbada-dhexe',
  'jubbada-hoose',
  'mudug',
  'nugaal',
  'sanaag',
  'shabeellaha-dhexe',
  'shabeellaha-hoose',
  'sool',
  'togdheer',
  'woqooyi-galbeed',
]);

export const SOMALIA_DISTRICT_IDS_BY_REGION = Object.freeze({
  awdal: ['borama', 'baki', 'lughaya', 'zeila'],
  bakool: ['hudur', 'tayeeglow', 'wajid', 'yel', 'rabdhuure'],
  banadir: [
    'abdiaziz',
    'bondhere',
    'daynile',
    'dharkenley',
    'hodan',
    'howlwadaag',
    'huriwaa',
    'kaxda',
    'shangani',
    'shibis',
    'waaberi',
    'wadajir',
    'wardhiigley',
    'xamarjajab',
    'xamarweyne',
    'yakhshid',
  ],
  bari: ['bosaso', 'iskushuban', 'qandala', 'qardho', 'caluula', 'bandarbeyla'],
  bay: ['baidoa', 'burhakaba', 'dinsoor', 'qansaxdheere'],
  galguduud: ['dhusamareb', 'cabudwaaq', 'cadaado', 'ceelbuur', 'ceeldheer'],
  gedo: ['garbahaarey', 'bardhere', 'beletxaawo', 'doolow', 'luuq', 'ceelwaaq'],
  hiiraan: ['beledweyne', 'buuloburde', 'jalalaqsi', 'matabaan'],
  'jubbada-dhexe': ['bu-aale', 'jilib', 'sakow'],
  'jubbada-hoose': ['kismayo', 'afmadow', 'jamame', 'badhaadhe'],
  mudug: ['gaalkacyo', 'hobyo', 'xarardheere', 'jariban'],
  nugaal: ['garowe', 'eyn'],
  sanaag: ['ceerigaabo', 'ceelafweyn', 'laasqoray'],
  'shabeellaha-dhexe': ['jowhar', 'balcad', 'adale', 'mahaddaay'],
  'shabeellaha-hoose': ['marka', 'afgooye', 'wanlaweyn', 'qoryooley', 'kurtunwaarey', 'sabalaale'],
  sool: ['laascaanood', 'caynabo', 'taaleex'],
  togdheer: ['burao', 'odweyne', 'sheekh'],
  'woqooyi-galbeed': ['hargeisa', 'gabiley', 'berbera'],
});

export function isValidSomaliaRegionId(regionId) {
  const id = String(regionId || '');
  return SOMALIA_REGION_IDS.includes(id);
}

export function isValidSomaliaDistrictId(regionId, districtId) {
  const r = String(regionId || '');
  const d = String(districtId || '');
  const rows = SOMALIA_DISTRICT_IDS_BY_REGION[r];
  if (!Array.isArray(rows)) return false;
  return rows.includes(d);
}
