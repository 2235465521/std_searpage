/**
 * 登录后与标准检索同步：在 MainLayout 挂载后后台预热各模块默认查询。
 * 用户切到数据分析 / 起草单位时可直接读缓存展示，明细仍在后台补齐。
 */
import { fetchProvinces, fetchRegionalSummary } from '../api/analytics';
import { searchUnits } from '../api/units';
import { canPersistSessionData, ensureValidToken } from '../api/tokenAuth';
import {
  buildRegionKey,
  getPageSnapshot as getAnalyticsSnapshot,
  savePageSnapshot as saveAnalyticsSnapshot,
  setSummaryInCache,
} from '../pages/DataAnalysis/analyticsSessionCache';
import {
  AUTO_QUERY_PAGES,
  hasSessionPendingAutoQuery,
  isPageAutoQueryDone,
  markPageAutoQueryDone,
} from './sessionAutoQuery';

const DRAFTING_UNIT_SNAPSHOT_KEY = 'drafting-unit-page-snapshot:v2';
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_STD_SCOPE = '00';
const DEFAULT_UNITS_PAGE_SIZE = 20;

let prefetchStarted = false;

export function resetSessionPrefetchState() {
  prefetchStarted = false;
}

function saveDraftingPrefetchSnapshot(snapshot) {
  if (!canPersistSessionData()) return;
  try {
    sessionStorage.setItem(DRAFTING_UNIT_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

async function prefetchAnalytics(provinces, latestYear) {
  const regionParams = { year: latestYear, std_scope: DEFAULT_STD_SCOPE };
  const regionKey = buildRegionKey(regionParams);

  const fastData = await fetchRegionalSummary({ ...regionParams, include_breakdown: 0 });
  setSummaryInCache(regionKey, fastData);

  const existing = getAnalyticsSnapshot();
  saveAnalyticsSnapshot({
    provinces,
    cities: existing?.cities ?? [],
    counties: existing?.counties ?? [],
    province: existing?.province,
    city: existing?.city,
    county: existing?.county,
    filterYear: latestYear,
    stdScope: [DEFAULT_STD_SCOPE],
    summary: fastData,
    compare: null,
    yearA: existing?.yearA ?? latestYear - 1,
    yearB: existing?.yearB ?? latestYear,
    resultTab: 'table',
    bootstrapReady: true,
    regionKey,
  });
  markPageAutoQueryDone(AUTO_QUERY_PAGES.ANALYTICS);

  fetchRegionalSummary(regionParams)
    .then((fullData) => {
      setSummaryInCache(regionKey, fullData);
      const snap = getAnalyticsSnapshot();
      if (snap?.regionKey === regionKey) {
        saveAnalyticsSnapshot({ ...snap, summary: fullData });
      }
    })
    .catch(() => {});
}

async function prefetchUnits(latestYear) {
  const data = await searchUnits({
    page: 1,
    size: DEFAULT_UNITS_PAGE_SIZE,
    include_analysis: 0,
    year: latestYear,
    rank_query: '1',
    std_scope: DEFAULT_STD_SCOPE,
  });

  saveDraftingPrefetchSnapshot({
    searchKey: `searched=1&rank_query=1&std_scope=${DEFAULT_STD_SCOPE}`,
    filters: {
      year: latestYear,
      rank_query: '1',
      std_scope: [DEFAULT_STD_SCOPE],
    },
    criteria: {
      year: latestYear,
      rank_query: '1',
      std_scope: DEFAULT_STD_SCOPE,
      province: null,
      city: null,
      county: null,
    },
    items: data?.items || [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.size ?? DEFAULT_UNITS_PAGE_SIZE,
    activeTab: 'search',
  });
  markPageAutoQueryDone(AUTO_QUERY_PAGES.UNITS);
}

/** 登录会话内、进入主布局后触发一次默认条件预热 */
export function prefetchDefaultModuleQueries() {
  if (prefetchStarted || !hasSessionPendingAutoQuery()) return;
  prefetchStarted = true;

  (async () => {
    try {
      await ensureValidToken();
      const provincesRes = await fetchProvinces();
      const latestYear = provincesRes?.latest_year ?? CURRENT_YEAR;
      const provinces = (provincesRes?.provinces || []).map((p) => ({ value: p, label: p }));

      const tasks = [];
      if (!isPageAutoQueryDone(AUTO_QUERY_PAGES.ANALYTICS)) {
        tasks.push(prefetchAnalytics(provinces, latestYear));
      }
      if (!isPageAutoQueryDone(AUTO_QUERY_PAGES.UNITS)) {
        tasks.push(prefetchUnits(latestYear));
      }

      await Promise.allSettled(tasks);
    } catch {
      prefetchStarted = false;
    }
  })();
}
