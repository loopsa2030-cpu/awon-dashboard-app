// Canonical city keys shared by the sheets, forecast and Odoo layers.
const CITY_ALIASES = {
  riyadh: ['riyadh', 'الرياض', 'ryadh'],
  jeddah: ['jeddah', 'jedda', 'جدة', 'جده'],
  mecca: ['mecca', 'makkah', 'makka', 'مكة', 'مكه'],
  taif: ['taif', 'الطائف'],
  madina: ['madina', 'madinah', 'medinah', 'medina', 'المدينة المنورة', 'المدينة'],
  sharqia: ['sharqia', 'sharqiya', 'sharqiyah', 'eastern', 'dammam', 'الشرقية', 'الدمام', 'الخبر', 'الظهران', 'القطيف', 'الجبيل', 'الاحساء'],
  asir: ['asir', 'aseer', 'abha', 'عسير', 'أبها', 'ابها', 'خميس مشيط', 'أحد رفيدة'],
  hail: ['hail', 'حائل'],
  qassim: ['qassim', 'qaseem', 'القصيم'],
  kharj: ['kharj', 'الخرج'],
  yanbu: ['yanbu', 'ينبع'],
};
const CITY_LABELS = {
  riyadh: { en: 'Riyadh', ar: 'الرياض' }, jeddah: { en: 'Jeddah', ar: 'جدة' },
  mecca: { en: 'Makkah', ar: 'مكة' }, taif: { en: 'Taif', ar: 'الطائف' },
  madina: { en: 'Madinah', ar: 'المدينة' }, sharqia: { en: 'Eastern Province', ar: 'الشرقية' },
  asir: { en: 'Asir', ar: 'عسير' }, hail: { en: 'Hail', ar: 'حائل' },
  qassim: { en: 'Qassim', ar: 'القصيم' }, kharj: { en: 'Al Kharj', ar: 'الخرج' },
  yanbu: { en: 'Yanbu', ar: 'ينبع' },
};
function norm(s) {
  return String(s ?? '').toLowerCase().replace(/\(sa\)/g, '').replace(/\s+/g, ' ').trim();
}
function cityKey(raw) {
  const n = norm(raw);
  if (!n) return null;
  for (const [key, list] of Object.entries(CITY_ALIASES)) {
    if (list.some(a => n === a || n.startsWith(a + ' ') || n === a.replace(/\s/g, ''))) return key;
  }
  return n.replace(/[^a-z\u0600-\u06ff]+/g, '_');
}
module.exports = { cityKey, CITY_LABELS, norm };
