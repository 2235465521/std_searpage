import { canPersistSessionData } from '../../api/tokenAuth';

/** 数据分析页会话缓存：路由切走再回来时不重复请求（登出时清空）。 */

const summaryCache = new Map();

let pageSnapshot = null;
const SNAPSHOT_STORAGE_KEY = 'analytics_page_snapshot:v1';

export function buildRegionKey(params = {}) {
  const { year, std_scope, province, city, county } = params;
  return [year ?? '', std_scope ?? '', province ?? '', city ?? '', county ?? ''].join('|');
}

export function getSummaryFromCache(key) {
  return summaryCache.get(key) ?? null;
}

export function setSummaryInCache(key, data) {
  if (key && data) summaryCache.set(key, data);
}

export function getPageSnapshot() {
  if (pageSnapshot) return pageSnapshot;
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    pageSnapshot = JSON.parse(raw);
    return pageSnapshot;
  } catch {
    return null;
  }
}

export function savePageSnapshot(snapshot) {
  if (!canPersistSessionData()) return;
  pageSnapshot = snapshot ? { ...snapshot } : null;
  try {
    if (pageSnapshot) {
      sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(pageSnapshot));
    } else {
      sessionStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearAnalyticsSessionCache() {
  summaryCache.clear();
  pageSnapshot = null;
  try {
    sessionStorage.removeItem(SNAPSHOT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
