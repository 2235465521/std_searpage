const CODE_BY_SCOPE_NO = {
  '00': 'GB',
  '01': 'HB',
  '02': 'DB',
  '03': 'TB',
};

const CN_ALIASES = {
  国标: 'GB',
  国家标准: 'GB',
  行标: 'HB',
  行业标准: 'HB',
  地标: 'DB',
  地方标准: 'DB',
  团标: 'TB',
  团体标准: 'TB',
  国际标准: 'ISO',
  国际电工标准: 'IEC',
  电气电子标准: 'IEEE',
};

const LETTER_CODES = new Set(['GB', 'HB', 'DB', 'TB', 'ISO', 'IEC', 'IEEE']);

/** 表格「类型」列：统一显示字母代号 */
export function formatStdTypeCode(value, stdTypeNo) {
  const no = (stdTypeNo || '').trim();
  if (CODE_BY_SCOPE_NO[no]) return CODE_BY_SCOPE_NO[no];

  const s = (value || '').trim();
  if (!s) return '';

  const upper = s.toUpperCase();
  if (LETTER_CODES.has(upper)) return upper;
  if (CN_ALIASES[s]) return CN_ALIASES[s];
  if (CODE_BY_SCOPE_NO[upper]) return CODE_BY_SCOPE_NO[upper];

  return upper;
}
