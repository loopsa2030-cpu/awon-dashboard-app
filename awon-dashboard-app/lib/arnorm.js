// Arabic place-name normaliser so "حي النرجس", "النرجس" and "نرجس" match.
function arNorm(s) {
  return String(s ?? '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')          // diacritics, tatweel
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/\(sa\)/gi, '')
    .replace(/^\s*حي\s+/, '').replace(/\s+/g, ' ').trim()
    .split(' ').map(w => w.replace(/^ال/, '')).join(' ')
    .toLowerCase();
}
module.exports = { arNorm };
