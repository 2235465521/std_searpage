/** 与后端 std_replace.replace_type 约定一致 */
export function getReplaceTypeMeta(replaceType) {
  const raw = replaceType == null ? '' : String(replaceType).trim();

  if (!raw) {
    return { label: '未知', shortLabel: '未知', color: '#94a3b8' };
  }

  if (raw === '1' || raw.includes('完全')) {
    return { label: '完全代替', shortLabel: '完全', color: '#1d4ed8' };
  }
  if (raw === '0' || (raw.includes('部分') && !raw.includes('代完'))) {
    return { label: '部分代替', shortLabel: '部分', color: '#dc2626' };
  }
  if (raw === '2' || raw.includes('部分代完') || (raw.includes('代完') && !raw.includes('部分代替'))) {
    return { label: '部分代完', shortLabel: '部分代完', color: '#16a34a' };
  }

  return { label: '未知', shortLabel: '未知', color: '#94a3b8' };
}

/** 根据后端 internal_status 文案映射顶栏/元数据样式 */
export function getStatusDisplay(internalStatus, exState) {
  const text = (internalStatus || '').trim();
  if (text === '现行') {
    return {
      label: '现行有效',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      iconKey: 'current',
    };
  }
  if (text === '即将实施') {
    return {
      label: '即将实施',
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      iconKey: 'pending',
    };
  }
  if (text === '废止') {
    return {
      label: '已废止',
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      iconKey: 'obsolete',
    };
  }
  if (text === '未知') {
    return {
      label: '未知',
      color: 'text-slate-500 bg-slate-50 border-slate-200',
      iconKey: 'unknown',
    };
  }

  if (exState === 1) {
    return {
      label: '现行有效',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      iconKey: 'current',
    };
  }
  if (exState === 2) {
    return {
      label: '即将实施',
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      iconKey: 'pending',
    };
  }
  return {
    label: '已废止',
    color: 'text-rose-600 bg-rose-50 border-rose-100',
    iconKey: 'obsolete',
  };
}
