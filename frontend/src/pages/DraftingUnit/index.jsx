import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Popover, Tooltip, message, Tabs } from 'antd';
import { fetchCities, fetchCounties, fetchProvinces, downloadBlobResponse } from '../../api/analytics';
import { canPersistSessionData, ensureValidToken } from '../../api/tokenAuth';
import { prefetchStandardDetail } from '../../api/standards';
import { fetchFirstLeadUnit, fetchUnitFirstParticipation, exportFirstParticipationExcel, searchUnits } from '../../api/units';
import { formatStdTypeCode } from '../../utils/stdType';
import {
  AUTO_QUERY_PAGES,
  markPageAutoQueryDone,
  shouldPageAutoQueryOnFirstVisit,
} from '../../utils/sessionAutoQuery';
import FilterPanel, {
  FilterField,
  FilterInput,
  FilterPrimaryButton,
  FilterSecondaryButton,
  FilterSelect,
} from '../../components/ui/FilterPanel';
import LoadingPanel from '../../components/ui/LoadingPanel';
import EmptyState from '../../components/ui/EmptyState';
import GlassDataTable, { ACTION_COL_PAD, ACTION_COL_WIDTH, DetailButton, TypeTag } from '../../components/ui/GlassDataTable';
import { resolveUnitsTab } from '../../config/nav';

const T = {
  pageTitle: '\u8d77\u8349\u5355\u4f4d\u67e5\u8be2',
  filterYear: '\u5e74\u4efd',
  allYears: '\u5168\u90e8\u5e74\u4efd',
  stdScope: '\u6807\u51c6\u7c7b\u522b',
  rankTier: '\u8d77\u8349\u5355\u4f4d\u6392\u4f4d',
  rankTierPh: '\u5982\uff1a1\u30017\u30012-4\u3001>=4',
  province: '\u7701',
  city: '\u5e02',
  county: '\u53bf/\u533a',
  provincePh: '\u5168\u90e8\u7701\u4efd',
  allCitiesPh: '\u5168\u90e8\u57ce\u5e02',
  allCountiesPh: '\u5168\u90e8\u53bf/\u533a',
  search: '\u67e5\u8be2',
  reset: '\u91cd\u7f6e',
  viewStats: '\u67e5\u770b\u6570\u636e\u7edf\u8ba1',
  unitName: '\u8d77\u8349\u5355\u4f4d\u540d\u79f0',
  stdId: '\u6807\u51c6\u7f16\u53f7',
  stdName: '\u6807\u51c6\u540d\u79f0',
  stdType: '\u7c7b\u578b',
  releaseDate: '\u53d1\u5e03\u65e5\u671f',
  action: '\u64cd\u4f5c',
  detail: '\u8be6\u60c5',
  searchFail: '\u67e5\u8be2\u5931\u8d25',
  loadProvinceFail: '\u52a0\u8f7d\u7701\u4efd\u5217\u8868\u5931\u8d25',
  loadCityFail: '\u52a0\u8f7d\u57ce\u5e02\u5217\u8868\u5931\u8d25',
  loadCountyFail: '\u52a0\u8f7d\u533a\u53bf\u5217\u8868\u5931\u8d25',
  tabSearch: '\u8d77\u8349\u5355\u4f4d\u67e5\u8be2',
  tabFirstLead: '\u5386\u53f2\u9996\u5bb6\u7275\u5934\u56fd\u6807',
  tabFirstJoin: '\u5355\u4f4d\u9996\u6b21\u53c2\u4e0e',
  queryFirstLead: '\u67e5\u9996\u5bb6\u7275\u5934',
  queryFirstJoin: '\u67e5\u8be2',
  firstJoinYear: '\u9996\u6b21\u53c2\u4e0e\u5e74\u4efd',
  exportExcel: '\u5bfc\u51fa Excel',
  exportOk: '\u5bfc\u51fa\u6210\u529f',
  exportFail: '\u5bfc\u51fa\u5931\u8d25',
  firstJoinYearFrom: '\u9996\u6b21\u53c2\u4e0e\u5e74\u8d77',
  firstJoinYearTo: '\u9996\u6b21\u53c2\u4e0e\u5e74\u6b62',
  firstJoinYearRange: '\u53c2\u4e0e\u5e74\u4efd',
  firstJoinYearStartPh: '\u8d77',
  firstJoinYearEndPh: '\u6b62',
  firstJoinYearPh: '\u4e0d\u9650',
  firstJoinRank: '\u6392\u4f4d',
  firstJoinDataMode: '\u7c92\u5ea6',
  exportScope: '\u5bfc\u51fa',
  exportScopeAll: '\u5168\u90e8',
  exportScopePageRange: '\u8d77\u6b62\u9875',
  exportPageFromPh: '\u8d77',
  exportPageToPh: '\u6b62',
  advancedQuery: '\u9ad8\u7ea7\u67e5\u8be2',
  advancedActive: '\u5df2\u8bbe\u7f6e',
  advancedConfirm: '\u786e\u5b9a',
  exportModeDetail: '\u660e\u7ec6',
  exportModeSummary: '\u5355\u4f4d\u6c47\u603b',
  exportModeFirst: '\u5355\u4f4d\u9996\u6761',
  exportNeedQuery: '\u8bf7\u5148\u67e5\u8be2\u9996\u6b21\u53c2\u4e0e\u6570\u636e',
  firstJoinPreviewEmpty: '\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6682\u65e0\u6570\u636e\uff0c\u53ef\u8c03\u6574\u6761\u4ef6\u540e\u91cd\u65b0\u67e5\u8be2',
  noRecord: '\u672a\u627e\u5230\u8bb0\u5f55',
  selectProvinceTip: '\u8bf7\u5148\u9009\u62e9\u7701\u4efd',
  region: '\u5730\u533a',
  regionNationwide: '\u5168\u56fd',
  regionUnknown: '\u672a\u767b\u8bb0\u5730\u533a',
};

const formatRegionText = (region) => {
  if (!region) return T.regionUnknown;
  const parts = [region.province, region.city, region.county].filter(Boolean);
  return parts.length ? parts.join(' / ') : T.regionUnknown;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: 'ALL', label: '\u5168\u90e8\u5e74\u4efd' },
  ...Array.from({ length: 35 }, (_, i) => CURRENT_YEAR - i).map((y) => ({
    value: y,
    label: `${y} \u5e74`,
  })),
];
const STD_SCOPE_OPTIONS = [
  { value: '00', label: '国家标准 (GB)' },
  { value: '01', label: '行业标准 (HB)' },
  { value: '02', label: '地方标准 (DB)' },
  { value: '03', label: '团体标准 (TB)' },
];
const EXPORT_YEAR_OPTIONS = [
  ...Array.from({ length: 35 }, (_, i) => CURRENT_YEAR - i).map((y) => ({
    value: y,
    label: String(y),
  })),
];
const FIRST_JOIN_EXPORT_MODE_OPTIONS = [
  { value: 'detail', label: '明细' },
  { value: 'unit_summary', label: '单位汇总' },
  { value: 'unit_first', label: '单位首条' },
];
const FIRST_JOIN_EXPORT_SCOPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'page_range', label: '起止页' },
];
const STD_SCOPE_ALIAS = { GB: '00', HB: '01', DB: '02', TB: '03', '00': '00', '01': '01', '02': '02', '03': '03' };

const LEGACY_RANK_MAP = {
  eq1: '1',
  range_2_4: '2-3',
  gte4: '>=4',
};

const renderUnitNames = (names) => {
  const allNames = names || [];
  if (!allNames.length) return '—';

  const preview = (
    <div className="min-w-0 space-y-0.5 py-0.5 text-sm font-medium text-on-surface">
      {allNames.slice(0, 3).map((name) => (
        <div key={name} className="truncate leading-snug" title={name}>
          {name}
        </div>
      ))}
      {allNames.length > 3 ? (
        <div className="text-xs font-medium text-slate-400">等 {allNames.length} 家单位</div>
      ) : null}
    </div>
  );

  if (allNames.length <= 3) return preview;

  return (
    <Tooltip
      title={
        <div className="max-w-[360px]">
          {allNames.map((name) => (
            <div key={`all-${name}`} className="leading-snug">
              {name}
            </div>
          ))}
        </div>
      }
    >
      <div className="min-w-0 cursor-default">{preview}</div>
    </Tooltip>
  );
};

const normalizeRankInput = (value) => (value || '').trim();
const DRAFTING_UNIT_SNAPSHOT_KEY = 'drafting-unit-page-snapshot:v2';
const AUTO_QUERY_PAGE = AUTO_QUERY_PAGES.UNITS;
const AUTO_QUERY_PAGE_LEAD = AUTO_QUERY_PAGES.UNITS_FIRST_LEAD;
const AUTO_QUERY_PAGE_FIRST_JOIN = AUTO_QUERY_PAGES.UNITS_FIRST_JOIN;
const readSnapshot = () => {
  try {
    const raw = sessionStorage.getItem(DRAFTING_UNIT_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveSnapshot = (snapshot) => {
  if (!canPersistSessionData()) return;
  try {
    sessionStorage.setItem(DRAFTING_UNIT_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore cache failures
  }
};

const parseUrlFilters = (searchParams) => ({
  province: searchParams.get('province') || undefined,
  city: searchParams.get('city') || undefined,
  county: searchParams.get('county') || undefined,
  year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
  rank_query:
    normalizeRankInput(searchParams.get('rank_query')) ||
    LEGACY_RANK_MAP[searchParams.get('count_tier')] ||
    '1',
  std_scope: (searchParams.get('std_scope') || '')
    .split(',')
    .map((x) => STD_SCOPE_ALIAS[x.trim().toUpperCase()])
    .filter((x) => ['00', '01', '02', '03'].includes(x)),
});

const parseUrlFiltersWithDefault = (searchParams) => {
  const parsed = parseUrlFilters(searchParams);
  const hasScopeInUrl = !!searchParams.get('std_scope');
  const hasSearchedFlag = searchParams.get('searched') === '1';
  return {
    ...parsed,
    // 仅首次进入（未触发查询）默认国标；已查询后允许保持“空类别”
    std_scope: parsed.std_scope.length
      ? parsed.std_scope
      : (hasScopeInUrl || hasSearchedFlag ? [] : ['00']),
  };
};

const DraftingUnit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilters = useMemo(() => parseUrlFiltersWithDefault(searchParams), [searchParams]);
  const initialSnapshot = useMemo(() => readSnapshot(), []);
  const currentSearchKey = useMemo(() => searchParams.toString(), [searchParams]);
  const hasSearchedFlag = searchParams.get('searched') === '1';
  const pageAutoQueryDone = useMemo(
    () => !shouldPageAutoQueryOnFirstVisit(AUTO_QUERY_PAGE),
    [],
  );
  const canRestore = !!initialSnapshot && typeof initialSnapshot.total === 'number';
  const initialFilters = useMemo(
    () => (canRestore && initialSnapshot.filters ? initialSnapshot.filters : parseUrlFiltersWithDefault(searchParams)),
    [canRestore, initialSnapshot, searchParams],
  );

  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [counties, setCounties] = useState([]);
  const [province, setProvince] = useState(initialFilters.province);
  const [city, setCity] = useState(initialFilters.city);
  const [county, setCounty] = useState(initialFilters.county);
  const [filterYear, setFilterYear] = useState(
    canRestore ? (initialFilters.year ?? 'ALL') : (initialFilters.year ?? CURRENT_YEAR),
  );
  const [rankQuery, setRankQuery] = useState(initialFilters.rank_query);
  const [stdScope, setStdScope] = useState(initialFilters.std_scope);

  const [items, setItems] = useState(canRestore ? (initialSnapshot?.items || []) : []);
  const [total, setTotal] = useState(canRestore ? (initialSnapshot?.total ?? 0) : 0);
  const [page, setPage] = useState(canRestore ? (initialSnapshot?.page ?? 1) : 1);
  const [pageSize, setPageSize] = useState(canRestore ? (initialSnapshot?.pageSize ?? 20) : 20);
  const [loading, setLoading] = useState(false);
  const [awaitingAutoQuery, setAwaitingAutoQuery] = useState(
    !hasSearchedFlag && !canRestore && shouldPageAutoQueryOnFirstVisit(AUTO_QUERY_PAGE),
  );
  const [bootstrapReady, setBootstrapReady] = useState(canRestore || pageAutoQueryDone);
  // 登录后首次进入且无快照：用默认条件自动查一次；之后仅恢复快照，不再自动查
  const shouldAutoQueryOnInitRef = useRef(awaitingAutoQuery);
  const shouldAutoQueryFirstLeadRef = useRef(
    shouldPageAutoQueryOnFirstVisit(AUTO_QUERY_PAGE_LEAD)
    && !(canRestore && initialSnapshot?.leadResult != null),
  );
  const shouldAutoQueryFirstJoinRef = useRef(
    shouldPageAutoQueryOnFirstVisit(AUTO_QUERY_PAGE_FIRST_JOIN)
    && !(canRestore && (initialSnapshot?.firstJoinTotal > 0 || initialSnapshot?.firstJoinItems?.length > 0)),
  );
  const pageStateRef = useRef(null);
  const firstJoinRequestSeqRef = useRef(0);
  const [activeTab, setActiveTab] = useState(() => resolveUnitsTab(searchParams, initialSnapshot?.activeTab || 'search'));

  const [leadProvince, setLeadProvince] = useState(initialSnapshot?.leadProvince);
  const [leadCity, setLeadCity] = useState(initialSnapshot?.leadCity);
  const [leadCounty, setLeadCounty] = useState(initialSnapshot?.leadCounty);
  const [leadCities, setLeadCities] = useState(initialSnapshot?.leadCities || []);
  const [leadCounties, setLeadCounties] = useState(initialSnapshot?.leadCounties || []);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadResult, setLeadResult] = useState(initialSnapshot?.leadResult || null);

  const [firstJoinProvince, setFirstJoinProvince] = useState(initialSnapshot?.firstJoinProvince ?? '北京市');
  const [firstJoinCity, setFirstJoinCity] = useState(initialSnapshot?.firstJoinCity);
  const [firstJoinCounty, setFirstJoinCounty] = useState(initialSnapshot?.firstJoinCounty);
  const [firstJoinCities, setFirstJoinCities] = useState(initialSnapshot?.firstJoinCities || []);
  const [firstJoinCounties, setFirstJoinCounties] = useState(initialSnapshot?.firstJoinCounties || []);
  const [firstJoinStdScope, setFirstJoinStdScope] = useState(initialSnapshot?.firstJoinStdScope ?? ['00']);
  const [firstJoinLoading, setFirstJoinLoading] = useState(false);
  const [firstJoinItems, setFirstJoinItems] = useState(initialSnapshot?.firstJoinItems || []);
  const [firstJoinTotal, setFirstJoinTotal] = useState(initialSnapshot?.firstJoinTotal ?? 0);
  const [firstJoinPage, setFirstJoinPage] = useState(initialSnapshot?.firstJoinPage ?? 1);
  const [firstJoinPageSize, setFirstJoinPageSize] = useState(initialSnapshot?.firstJoinPageSize ?? 50);
  const [firstJoinExportYearFrom, setFirstJoinExportYearFrom] = useState(null);
  const [firstJoinExportYearTo, setFirstJoinExportYearTo] = useState(null);
  const [firstJoinExportRankQuery, setFirstJoinExportRankQuery] = useState('');
  const [firstJoinExportMode, setFirstJoinExportMode] = useState(initialSnapshot?.firstJoinExportMode ?? 'detail');
  const [firstJoinExportScope, setFirstJoinExportScope] = useState('all');
  const [firstJoinExportPageFrom, setFirstJoinExportPageFrom] = useState('1');
  const [firstJoinExportPageTo, setFirstJoinExportPageTo] = useState('1');
  const [firstJoinAdvancedOpen, setFirstJoinAdvancedOpen] = useState(false);
  const [firstJoinExporting, setFirstJoinExporting] = useState(false);
  const [firstJoinQueried, setFirstJoinQueried] = useState(
    !!(initialSnapshot?.firstJoinItems?.length || initialSnapshot?.firstJoinTotal > 0),
  );

  // 不再在恢复后清除快照，离开页面时会自动覆盖最新状态

  const queryParams = useMemo(
    () => ({
      ...(filterYear !== 'ALL' ? { year: filterYear } : {}),
      rank_query: rankQuery,
      ...(stdScope?.length ? { std_scope: stdScope.join(',') } : {}),
      ...(province ? { province } : {}),
      ...(city ? { city } : {}),
      ...(county ? { county } : {}),
    }),
    [filterYear, rankQuery, stdScope, province, city, county],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureValidToken();
        const data = await fetchProvinces();
        if (cancelled) return;
        setProvinces((data?.provinces || []).map((p) => ({ value: p, label: p })));
      } catch {
        if (!cancelled) message.error(T.loadProvinceFail);
      } finally {
        if (!cancelled) setBootstrapReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!province) {
      setCities([]);
      setCity(undefined);
      return;
    }
    fetchCities(province)
      .then((data) => setCities((data?.cities || []).map((c) => ({ value: c, label: c }))))
      .catch(() => message.error(T.loadCityFail));
  }, [province]);

  useEffect(() => {
    if (!province || !city) {
      setCounties([]);
      setCounty(undefined);
      return;
    }
    fetchCounties(province, city)
      .then((data) => setCounties((data?.counties || []).map((c) => ({ value: c, label: c }))))
      .catch(() => message.error(T.loadCountyFail));
  }, [province, city]);

  useEffect(() => {
    if (!leadProvince) {
      setLeadCities([]);
      setLeadCity(undefined);
      return;
    }
    fetchCities(leadProvince)
      .then((data) => setLeadCities((data?.cities || []).map((c) => ({ value: c, label: c }))))
      .catch(() => message.error(T.loadCityFail));
  }, [leadProvince]);

  useEffect(() => {
    if (!leadProvince || !leadCity) {
      setLeadCounties([]);
      setLeadCounty(undefined);
      return;
    }
    fetchCounties(leadProvince, leadCity)
      .then((data) => setLeadCounties((data?.counties || []).map((c) => ({ value: c, label: c }))))
      .catch(() => message.error(T.loadCountyFail));
  }, [leadProvince, leadCity]);

  useEffect(() => {
    if (!firstJoinProvince) {
      setFirstJoinCities([]);
      setFirstJoinCity(undefined);
      return;
    }
    fetchCities(firstJoinProvince)
      .then((data) => setFirstJoinCities((data?.cities || []).map((c) => ({ value: c, label: c }))))
      .catch(() => message.error(T.loadCityFail));
  }, [firstJoinProvince]);

  useEffect(() => {
    if (!firstJoinProvince || !firstJoinCity) {
      setFirstJoinCounties([]);
      setFirstJoinCounty(undefined);
      return;
    }
    fetchCounties(firstJoinProvince, firstJoinCity)
      .then((data) => setFirstJoinCounties((data?.counties || []).map((c) => ({ value: c, label: c }))))
      .catch(() => message.error(T.loadCountyFail));
  }, [firstJoinProvince, firstJoinCity]);

  const syncUrl = useCallback(
    (nextPage = 1) => {
      const params = new URLSearchParams();
      params.set('searched', '1');
      if (nextPage > 1) params.set('page', String(nextPage));
      if (filterYear !== 'ALL') params.set('year', String(filterYear));
      params.set('rank_query', rankQuery);
      if (stdScope?.length) params.set('std_scope', stdScope.join(','));
      if (province) params.set('province', province);
      if (city) params.set('city', city);
      if (county) params.set('county', county);
      if (activeTab !== 'search') params.set('tab', activeTab);
      setSearchParams(params, { replace: true });
    },
    [filterYear, rankQuery, stdScope, province, city, county, activeTab, setSearchParams],
  );

  const handleActiveTabChange = useCallback(
    (key) => {
      setActiveTab(key);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (key === 'search') params.delete('tab');
        else params.set('tab', key);
        return params;
      }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!location.pathname.startsWith('/units') || location.pathname.startsWith('/units/stats')) return;
    const nextTab = resolveUnitsTab(searchParams, 'search');
    if (nextTab !== activeTab) setActiveTab(nextTab);
  }, [location.pathname, searchParams, activeTab]);

  const runSearch = useCallback(
    async (nextPage = 1, nextSize = pageSize) => {
      setLoading(true);
      try {
        const data = await searchUnits({
          page: nextPage,
          size: nextSize,
          include_analysis: 0,
          ...queryParams,
        });
        setItems(data?.items || []);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? nextPage);
        setPageSize(data?.size ?? nextSize);
        if (data?.year) setFilterYear(data.year);
        if (data?.rank_query) setRankQuery(data.rank_query);
        if (Array.isArray(data?.std_scope)) setStdScope(data.std_scope);
        syncUrl(nextPage);
        saveSnapshot({
          searchKey: currentSearchKey,
          filters: {
            province,
            city,
            county,
            year: (data?.year ?? filterYear) === 'ALL' ? null : (data?.year ?? filterYear),
            rank_query: data?.rank_query ?? rankQuery,
            std_scope: Array.isArray(data?.std_scope) ? data.std_scope : (stdScope || []),
          },
          criteria: {
            year: data?.year ?? filterYear,
            rank_query: (data?.rank_query ?? rankQuery) || '1',
            std_scope: (Array.isArray(data?.std_scope) ? data.std_scope : (stdScope || [])).join(','),
            province: province || null,
            city: city || null,
            county: county || null,
          },
          items: data?.items || [],
          total: data?.total ?? 0,
          page: data?.page ?? nextPage,
          pageSize: data?.size ?? nextSize,
          activeTab,
          leadProvince,
          leadCity,
          leadCounty,
          leadCities,
          leadCounties,
          leadResult,
          firstJoinProvince,
          firstJoinCity,
          firstJoinCounty,
          firstJoinCities,
          firstJoinCounties,
          firstJoinStdScope,
          firstJoinItems,
          firstJoinTotal,
          firstJoinPage,
          firstJoinPageSize,
        });
        markPageAutoQueryDone(AUTO_QUERY_PAGE);
      } catch (e) {
        message.error(e.message || T.searchFail);
      } finally {
        setLoading(false);
      }
    },
    [
      queryParams,
      pageSize,
      syncUrl,
      currentSearchKey,
      province,
      city,
      county,
      filterYear,
      rankQuery,
      stdScope,
      activeTab,
      leadProvince,
      leadCity,
      leadCounty,
      leadCities,
      leadCounties,
      leadResult,
      firstJoinProvince,
      firstJoinCity,
      firstJoinCounty,
      firstJoinCities,
      firstJoinCounties,
      firstJoinStdScope,
      firstJoinItems,
    ],
  );

  useEffect(() => {
    if (!bootstrapReady || !shouldAutoQueryOnInitRef.current) return;
    shouldAutoQueryOnInitRef.current = false;
    setAwaitingAutoQuery(false);
    runSearch(1);
  }, [bootstrapReady, runSearch]);

  useEffect(() => {
    pageStateRef.current = {
      searchKey: currentSearchKey,
      filters: {
        province,
        city,
        county,
        year: filterYear === 'ALL' ? null : filterYear,
        rank_query: rankQuery,
        std_scope: stdScope || [],
      },
      criteria: {
        year: filterYear,
        rank_query: rankQuery || '1',
        std_scope: (stdScope || []).join(','),
        province: province || null,
        city: city || null,
        county: county || null,
      },
      items,
      total,
      page,
      pageSize,
      activeTab,
      leadProvince,
      leadCity,
      leadCounty,
      leadCities,
      leadCounties,
      leadResult,
      firstJoinProvince,
      firstJoinCity,
      firstJoinCounty,
      firstJoinCities,
      firstJoinCounties,
      firstJoinStdScope,
      firstJoinItems,
      firstJoinTotal,
      firstJoinPage,
      firstJoinPageSize,
      firstJoinExportMode,
    };
  });

  useEffect(
    () => () => {
      if (pageStateRef.current) {
        saveSnapshot(pageStateRef.current);
      }
    },
    [],
  );

  const handleReset = () => {
    setProvince(undefined);
    setCity(undefined);
    setCounty(undefined);
    setRankQuery('1');
    setStdScope(['00']);
    setFilterYear(CURRENT_YEAR);
    setItems([]);
    setTotal(0);
    setPage(1);
    setSearchParams(
      { searched: '1', rank_query: '1', std_scope: '00' },
      { replace: true },
    );
  };
  const statsPath = useMemo(() => {
    const params = new URLSearchParams();
    if (filterYear !== 'ALL') params.set('year', String(filterYear));
    params.set('rank_query', rankQuery || '1');
    if (stdScope?.length) params.set('std_scope', stdScope.join(','));
    if (province) params.set('province', province);
    if (city) params.set('city', city);
    if (county) params.set('county', county);
    return `/units/stats?${params.toString()}`;
  }, [filterYear, rankQuery, stdScope, province, city, county]);

  const handleViewStats = () => {
    if (pageStateRef.current) saveSnapshot(pageStateRef.current);
    navigate(statsPath, { state: { returnSearch: currentSearchKey } });
  };

  const handleQueryFirstLead = useCallback(async () => {
    setLeadLoading(true);
    try {
      const data = await fetchFirstLeadUnit({
        ...(leadProvince ? { province: leadProvince } : {}),
        ...(leadCity ? { city: leadCity } : {}),
        ...(leadCounty ? { county: leadCounty } : {}),
      });
      setLeadResult(data || null);
      markPageAutoQueryDone(AUTO_QUERY_PAGE_LEAD);
      if (pageStateRef.current) {
        saveSnapshot({ ...pageStateRef.current, leadResult: data || null, activeTab });
      }
    } catch (e) {
      message.error(e.message || T.searchFail);
    } finally {
      setLeadLoading(false);
    }
  }, [leadProvince, leadCity, leadCounty, activeTab]);

  const loadFirstJoinPage = useCallback(async (page = 1, size = firstJoinPageSize) => {
    if (!firstJoinProvince) {
      message.warning(T.selectProvinceTip);
      return;
    }
    if (
      firstJoinExportYearFrom != null
      && firstJoinExportYearTo != null
      && firstJoinExportYearFrom > firstJoinExportYearTo
    ) {
      message.warning('首次参与起始年不能大于结束年');
      return;
    }
    setFirstJoinLoading(true);
    setFirstJoinItems([]);
    const requestId = ++firstJoinRequestSeqRef.current;
    try {
      const data = await fetchUnitFirstParticipation({
        province: firstJoinProvince,
        ...(firstJoinCity ? { city: firstJoinCity } : {}),
        ...(firstJoinCounty ? { county: firstJoinCounty } : {}),
        ...(firstJoinStdScope?.length ? { std_scope: firstJoinStdScope.join(',') } : {}),
        ...(firstJoinExportYearFrom != null ? { first_year_from: firstJoinExportYearFrom } : {}),
        ...(firstJoinExportYearTo != null ? { first_year_to: firstJoinExportYearTo } : {}),
        ...(firstJoinExportRankQuery ? { rank_query: firstJoinExportRankQuery } : {}),
        list_mode: firstJoinExportMode,
        page,
        size,
      });
      if (requestId !== firstJoinRequestSeqRef.current) return;
      const rows = data?.items || [];
      setFirstJoinItems(rows);
      setFirstJoinTotal(data?.total ?? 0);
      setFirstJoinPage(data?.page ?? page);
      setFirstJoinPageSize(data?.size ?? size);
      setFirstJoinQueried(true);
      markPageAutoQueryDone(AUTO_QUERY_PAGE_FIRST_JOIN);
      if (pageStateRef.current) {
        saveSnapshot({
          ...pageStateRef.current,
          firstJoinProvince,
          firstJoinCity,
          firstJoinCounty,
          firstJoinCities,
          firstJoinCounties,
          firstJoinStdScope,
          firstJoinItems: rows,
          firstJoinTotal: data?.total ?? 0,
          firstJoinPage: data?.page ?? page,
          firstJoinPageSize: data?.size ?? size,
          firstJoinExportMode,
          activeTab,
        });
      }
    } catch (e) {
      message.error(e.message || T.searchFail);
    } finally {
      setFirstJoinLoading(false);
    }
  }, [
    firstJoinProvince,
    firstJoinCity,
    firstJoinCounty,
    firstJoinStdScope,
    firstJoinExportYearFrom,
    firstJoinExportYearTo,
    firstJoinExportRankQuery,
    firstJoinExportMode,
    firstJoinPageSize,
    firstJoinCities,
    firstJoinCounties,
    activeTab,
  ]);

  const handleQueryFirstJoin = useCallback(
    () => {
      setFirstJoinAdvancedOpen(false);
      loadFirstJoinPage(1, firstJoinPageSize);
    },
    [loadFirstJoinPage, firstJoinPageSize],
  );

  const handleResetFirstJoinAdvanced = useCallback(() => {
    setFirstJoinExportYearFrom(null);
    setFirstJoinExportYearTo(null);
    setFirstJoinExportRankQuery('');
    setFirstJoinExportMode('detail');
    setFirstJoinExportScope('all');
    setFirstJoinExportPageFrom('1');
    setFirstJoinExportPageTo('1');
  }, []);

  const handleFirstJoinExportScopeChange = useCallback((scope) => {
    setFirstJoinExportScope(scope);
    if (scope === 'page_range') {
      const current = String(firstJoinPage || 1);
      setFirstJoinExportPageFrom(current);
      setFirstJoinExportPageTo(current);
    }
  }, [firstJoinPage]);

  const handleFirstJoinExport = useCallback(async () => {
    if (!firstJoinProvince) {
      message.warning(T.selectProvinceTip);
      return;
    }
    if (
      firstJoinExportYearFrom != null
      && firstJoinExportYearTo != null
      && firstJoinExportYearFrom > firstJoinExportYearTo
    ) {
      message.warning('首次参与起始年不能大于结束年');
      return;
    }

    let pageFrom;
    let pageTo;
    if (firstJoinExportScope === 'page_range') {
      pageFrom = parseInt(firstJoinExportPageFrom, 10);
      pageTo = parseInt(firstJoinExportPageTo, 10);
      if (Number.isNaN(pageFrom) || Number.isNaN(pageTo) || pageFrom < 1 || pageTo < 1) {
        message.warning('请输入有效的导出起止页码');
        return;
      }
      if (pageFrom > pageTo) {
        message.warning('导出起始页不能大于结束页');
        return;
      }
    }

    setFirstJoinExporting(true);
    try {
      const response = await exportFirstParticipationExcel({
        province: firstJoinProvince,
        ...(firstJoinCity ? { city: firstJoinCity } : {}),
        ...(firstJoinCounty ? { county: firstJoinCounty } : {}),
        ...(firstJoinStdScope?.length ? { std_scope: firstJoinStdScope.join(',') } : {}),
        ...(firstJoinExportYearFrom != null ? { first_year_from: firstJoinExportYearFrom } : {}),
        ...(firstJoinExportYearTo != null ? { first_year_to: firstJoinExportYearTo } : {}),
        ...(firstJoinExportRankQuery ? { rank_query: firstJoinExportRankQuery } : {}),
        export_mode: firstJoinExportMode,
        export_scope: firstJoinExportScope,
        size: firstJoinPageSize,
        ...(firstJoinExportScope === 'page_range'
          ? { page_from: pageFrom, page_to: pageTo }
          : {}),
      });
      downloadBlobResponse(response, '单位首次参与.xlsx');
      message.success(T.exportOk);
    } catch (e) {
      message.error(e.message || T.exportFail);
    } finally {
      setFirstJoinExporting(false);
    }
  }, [
    firstJoinProvince,
    firstJoinCity,
    firstJoinCounty,
    firstJoinStdScope,
    firstJoinExportYearFrom,
    firstJoinExportYearTo,
    firstJoinExportRankQuery,
    firstJoinExportMode,
    firstJoinExportScope,
    firstJoinExportPageFrom,
    firstJoinExportPageTo,
    firstJoinPageSize,
  ]);

  useEffect(() => {
    if (!bootstrapReady) return;
    if (activeTab === 'firstLead' && shouldAutoQueryFirstLeadRef.current) {
      shouldAutoQueryFirstLeadRef.current = false;
      handleQueryFirstLead();
      return;
    }
    if (activeTab === 'firstJoin' && shouldAutoQueryFirstJoinRef.current) {
      shouldAutoQueryFirstJoinRef.current = false;
      loadFirstJoinPage(1, firstJoinPageSize);
    }
  }, [bootstrapReady, activeTab, handleQueryFirstLead, loadFirstJoinPage, firstJoinPageSize]);

  const firstJoinModeRef = useRef(firstJoinExportMode);
  useEffect(() => {
    if (firstJoinModeRef.current === firstJoinExportMode) return;
    firstJoinModeRef.current = firstJoinExportMode;
    if (firstJoinQueried && firstJoinProvince) {
      loadFirstJoinPage(1, firstJoinPageSize);
    }
  }, [firstJoinExportMode, firstJoinQueried, firstJoinProvince, firstJoinPageSize, loadFirstJoinPage]);

  const detailReturnPath = `/units?${searchParams.toString()}`;

  const openDetail = useCallback(
    (stdId) => {
      navigate(`/detail/${encodeURIComponent(stdId)}`, {
        state: { from: detailReturnPath },
      });
    },
    [navigate, detailReturnPath],
  );

  const searchColumns = useMemo(
    () => [
      {
        key: 'unit_names',
        title: T.unitName,
        width: '20%',
        cellClassName: 'align-top',
        render: (row) => renderUnitNames(row.unit_names),
      },
      {
        key: 'std_id',
        title: T.stdId,
        width: '14%',
        cellClassName: 'whitespace-nowrap font-bold tracking-tight text-primary',
        render: (row) => row.std_id,
      },
      {
        key: 'std_chinesename',
        title: T.stdName,
        width: '38%',
        cellClassName: 'font-medium text-on-surface',
        render: (row) => (
          <span className="block truncate" title={row.std_chinesename || undefined}>
            {row.std_chinesename || '—'}
          </span>
        ),
      },
      {
        key: 'std_type',
        title: T.stdType,
        width: '7%',
        cellClassName: 'whitespace-nowrap',
        render: (row) => (
          <TypeTag code={formatStdTypeCode(row.std_type, row.std_type_no)} />
        ),
      },
      {
        key: 'release_date',
        title: T.releaseDate,
        width: '10%',
        cellClassName: 'whitespace-nowrap font-medium text-on-surface-variant/80',
        render: (row) => row.release_date || '—',
      },
      {
        key: 'action',
        title: T.action,
        width: ACTION_COL_WIDTH,
        align: 'center',
        headerClassName: ACTION_COL_PAD,
        cellClassName: `${ACTION_COL_PAD} whitespace-nowrap align-top`,
        render: (row) => (
          <DetailButton
            variant="link"
            label={T.detail}
            onClick={(event) => {
              event.stopPropagation();
              openDetail(row.std_id);
            }}
          />
        ),
      },
    ],
    [openDetail],
  );

  const firstJoinDetailColumns = useMemo(
    () => [
      {
        key: 'unit_name',
        title: T.unitName,
        width: '14%',
        cellClassName: 'font-medium text-on-surface',
        render: (row) => (
          <span className="block truncate" title={row.unit_name || undefined}>
            {row.unit_name || '—'}
          </span>
        ),
      },
      {
        key: 'first_year',
        title: T.firstJoinYear,
        width: '7%',
        cellClassName: 'whitespace-nowrap font-medium text-on-surface-variant/80',
        render: (row) => row.first_year || '—',
      },
      {
        key: 'std_id',
        title: T.stdId,
        width: '12%',
        cellClassName: 'whitespace-nowrap font-bold tracking-tight text-primary',
        render: (row) => row.std_id,
      },
      {
        key: 'std_chinesename',
        title: T.stdName,
        width: '33%',
        cellClassName: 'font-medium text-on-surface',
        render: (row) => (
          <span className="block truncate" title={row.std_chinesename || undefined}>
            {row.std_chinesename || '—'}
          </span>
        ),
      },
      {
        key: 'std_type',
        title: T.stdType,
        width: '7%',
        cellClassName: 'whitespace-nowrap',
        render: (row) => (
          <TypeTag code={formatStdTypeCode(row.std_type, row.std_type_no)} />
        ),
      },
      {
        key: 'release_date',
        title: T.releaseDate,
        width: '11%',
        cellClassName: 'whitespace-nowrap font-medium text-on-surface-variant/80',
        render: (row) => row.release_date || '—',
      },
      {
        key: 'rank',
        title: T.rankTier,
        width: '6%',
        cellClassName: 'whitespace-nowrap font-medium text-on-surface-variant/80',
        render: (row) => row.rank || '—',
      },
      {
        key: 'action',
        title: T.action,
        width: ACTION_COL_WIDTH,
        align: 'center',
        headerClassName: ACTION_COL_PAD,
        cellClassName: `${ACTION_COL_PAD} whitespace-nowrap`,
        render: (row) => (
          <DetailButton
            variant="link"
            label={T.detail}
            onClick={(event) => {
              event.stopPropagation();
              openDetail(row.std_id);
            }}
          />
        ),
      },
    ],
    [openDetail],
  );

  const firstJoinSummaryColumns = useMemo(
    () => [
      {
        key: 'unit_name',
        title: T.unitName,
        width: '16%',
        cellClassName: 'font-medium text-on-surface',
        render: (row) => (
          <span className="block truncate" title={row.unit_name || undefined}>
            {row.unit_name || '—'}
          </span>
        ),
      },
      {
        key: 'first_year',
        title: T.firstJoinYear,
        width: '8%',
        cellClassName: 'whitespace-nowrap font-medium text-on-surface-variant/80',
        render: (row) => row.first_year || '—',
      },
      {
        key: 'std_count',
        title: '首次参与年内标准数',
        width: '10%',
        align: 'right',
        cellClassName: 'whitespace-nowrap font-bold tabular-nums text-primary',
        render: (row) => (
          typeof row.std_count === 'number'
            ? row.std_count.toLocaleString()
            : '—'
        ),
      },
      {
        key: 'std_id',
        title: '最早标准编号',
        width: '12%',
        cellClassName: 'whitespace-nowrap font-bold tracking-tight text-primary',
        render: (row) => row.std_id,
      },
      {
        key: 'std_chinesename',
        title: '最早标准名称',
        width: '28%',
        cellClassName: 'font-medium text-on-surface',
        render: (row) => (
          <span className="block truncate" title={row.std_chinesename || undefined}>
            {row.std_chinesename || '—'}
          </span>
        ),
      },
      {
        key: 'std_type',
        title: T.stdType,
        width: '7%',
        cellClassName: 'whitespace-nowrap',
        render: (row) => (
          <TypeTag code={formatStdTypeCode(row.std_type, row.std_type_no)} />
        ),
      },
      {
        key: 'release_date',
        title: '最早发布日期',
        width: '11%',
        cellClassName: 'whitespace-nowrap font-medium text-on-surface-variant/80',
        render: (row) => row.release_date || '—',
      },
      {
        key: 'rank',
        title: '最早参与排位',
        width: '7%',
        cellClassName: 'whitespace-nowrap font-medium text-on-surface-variant/80',
        render: (row) => (row.rank != null && row.rank !== '' ? row.rank : '—'),
      },
      {
        key: 'action',
        title: T.action,
        width: ACTION_COL_WIDTH,
        align: 'center',
        headerClassName: ACTION_COL_PAD,
        cellClassName: `${ACTION_COL_PAD} whitespace-nowrap`,
        render: (row) => (
          row.std_id ? (
            <DetailButton
              variant="link"
              label={T.detail}
              onClick={(event) => {
                event.stopPropagation();
                openDetail(row.std_id);
              }}
            />
          ) : (
            '—'
          )
        ),
      },
    ],
    [openDetail],
  );

  const firstJoinTableColumns = firstJoinExportMode === 'unit_summary'
    ? firstJoinSummaryColumns
    : firstJoinDetailColumns;

  const firstJoinFooterLabel = firstJoinExportMode === 'unit_summary' ? '家单位' : '条参与记录';

  const firstJoinAdvancedActive = useMemo(
    () => (
      firstJoinExportYearFrom != null
      || firstJoinExportYearTo != null
      || !!firstJoinExportRankQuery
      || firstJoinExportMode !== 'detail'
      || firstJoinExportScope !== 'all'
    ),
    [
      firstJoinExportYearFrom,
      firstJoinExportYearTo,
      firstJoinExportRankQuery,
      firstJoinExportMode,
      firstJoinExportScope,
    ],
  );

  const firstJoinAdvancedContent = useMemo(
    () => (
      <div className="first-join-advanced-panel w-[min(440px,calc(100vw-2rem))]">
        <div className="first-join-advanced-panel__head">
          <span className="material-symbols-outlined text-base leading-none text-primary">tune</span>
          <span className="text-sm font-semibold text-slate-800">{T.advancedQuery}</span>
          {firstJoinAdvancedActive ? (
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold leading-none text-primary">
              {T.advancedActive}
            </span>
          ) : null}
        </div>
        <div className="first-join-advanced-panel__body">
          <div className="first-join-advanced-panel__grid">
            <FilterField compact label={T.firstJoinYearRange}>
              <div className="flex min-w-0 items-center gap-1.5">
                <FilterSelect
                  allowClear
                  placeholder={T.firstJoinYearStartPh}
                  options={EXPORT_YEAR_OPTIONS}
                  value={firstJoinExportYearFrom}
                  onChange={setFirstJoinExportYearFrom}
                  className="min-w-0 flex-1"
                  getPopupContainer={() => document.body}
                />
                <span className="shrink-0 text-xs text-slate-400">—</span>
                <FilterSelect
                  allowClear
                  placeholder={T.firstJoinYearEndPh}
                  options={EXPORT_YEAR_OPTIONS}
                  value={firstJoinExportYearTo}
                  onChange={setFirstJoinExportYearTo}
                  className="min-w-0 flex-1"
                  getPopupContainer={() => document.body}
                />
              </div>
            </FilterField>
            <FilterField compact label={T.firstJoinRank}>
              <FilterInput
                value={firstJoinExportRankQuery}
                placeholder={T.rankTierPh}
                onChange={(e) => setFirstJoinExportRankQuery(normalizeRankInput(e.target.value))}
              />
            </FilterField>
            <FilterField compact label={T.firstJoinDataMode}>
              <FilterSelect
                options={FIRST_JOIN_EXPORT_MODE_OPTIONS}
                value={firstJoinExportMode}
                onChange={setFirstJoinExportMode}
                getPopupContainer={() => document.body}
              />
            </FilterField>
            <FilterField
              compact
              label={T.exportScope}
              className={firstJoinExportScope === 'page_range' ? 'first-join-advanced-panel__field-span' : ''}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <FilterSelect
                  className="min-w-0 flex-1"
                  options={FIRST_JOIN_EXPORT_SCOPE_OPTIONS}
                  value={firstJoinExportScope}
                  onChange={handleFirstJoinExportScopeChange}
                  getPopupContainer={() => document.body}
                />
                {firstJoinExportScope === 'page_range' ? (
                  <>
                    <FilterInput
                      className="!w-[3.25rem] shrink-0 text-center"
                      value={firstJoinExportPageFrom}
                      placeholder={T.exportPageFromPh}
                      onChange={(e) => setFirstJoinExportPageFrom(e.target.value.replace(/\D/g, ''))}
                    />
                    <span className="shrink-0 text-xs text-slate-400">—</span>
                    <FilterInput
                      className="!w-[3.25rem] shrink-0 text-center"
                      value={firstJoinExportPageTo}
                      placeholder={T.exportPageToPh}
                      onChange={(e) => setFirstJoinExportPageTo(e.target.value.replace(/\D/g, ''))}
                    />
                    <span className="shrink-0 text-xs text-slate-500">页</span>
                  </>
                ) : null}
              </div>
            </FilterField>
          </div>
        </div>
        <div className="first-join-advanced-panel__foot">
          <FilterSecondaryButton size="compact" icon="restart_alt" onClick={handleResetFirstJoinAdvanced}>
            {T.reset}
          </FilterSecondaryButton>
          <FilterPrimaryButton size="compact" icon="check" onClick={() => setFirstJoinAdvancedOpen(false)}>
            {T.advancedConfirm}
          </FilterPrimaryButton>
        </div>
      </div>
    ),
    [
      firstJoinAdvancedActive,
      firstJoinExportYearFrom,
      firstJoinExportYearTo,
      firstJoinExportRankQuery,
      firstJoinExportMode,
      firstJoinExportScope,
      firstJoinExportPageFrom,
      firstJoinExportPageTo,
      handleFirstJoinExportScopeChange,
      handleResetFirstJoinAdvanced,
    ],
  );

  const showTable = bootstrapReady && (loading || total > 0);
  const searchPanel = (
    <>
      <FilterPanel
        compact
        actions={
          <>
            <FilterSecondaryButton size="compact" icon="restart_alt" onClick={handleReset}>
              {T.reset}
            </FilterSecondaryButton>
            <FilterSecondaryButton size="compact" icon="leaderboard" onClick={handleViewStats}>
              {T.viewStats}
            </FilterSecondaryButton>
            <FilterPrimaryButton size="compact" loading={loading} onClick={() => runSearch(1)}>
              {T.search}
            </FilterPrimaryButton>
          </>
        }
      >
        <div className="page-grid-cols-6">
          <FilterField compact label={T.filterYear}>
            <FilterSelect
              options={YEAR_OPTIONS}
              value={filterYear}
              onChange={setFilterYear}
            />
          </FilterField>
          <FilterField compact label={T.rankTier}>
            <FilterInput
              value={rankQuery}
              placeholder={T.rankTierPh}
              onChange={(e) => setRankQuery(normalizeRankInput(e.target.value))}
            />
          </FilterField>
          <FilterField compact label={T.stdScope}>
            <FilterSelect
              mode="multiple"
              options={STD_SCOPE_OPTIONS}
              value={stdScope}
              onChange={(vals) => setStdScope(vals || [])}
            />
          </FilterField>
          <FilterField compact label={T.province}>
            <FilterSelect
              allowClear
              placeholder={T.provincePh}
              options={provinces}
              value={province}
              onChange={setProvince}
            />
          </FilterField>
          <FilterField compact label={T.city}>
            <FilterSelect
              allowClear
              placeholder={T.allCitiesPh}
              disabled={!province}
              options={cities}
              value={city}
              onChange={setCity}
            />
          </FilterField>
          <FilterField compact label={T.county}>
            <FilterSelect
              allowClear
              placeholder={T.allCountiesPh}
              disabled={!province || !city}
              options={counties}
              value={county}
              onChange={setCounty}
            />
          </FilterField>
        </div>
      </FilterPanel>

      {showTable ? (
        <GlassDataTable
          columns={searchColumns}
          data={items}
          loading={loading}
          rowKey={(row) => `${row.std_id}-${(row.ranks || []).join('-')}`}
          minWidth={1180}
          footerItemLabel="条标准记录"
          emptyIcon="corporate_fare"
          emptyTitle="暂无查询结果"
          emptyDescription="请设置年份、排位或地区等条件后点击「查询」"
          onRowClick={(row) => openDetail(row.std_id)}
          onRowMouseEnter={(row) => prefetchStandardDetail(row.std_id)}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
          }}
          onPageChange={(p, s) => runSearch(p, s)}
        />
      ) : !bootstrapReady || loading || awaitingAutoQuery ? (
        <LoadingPanel label={awaitingAutoQuery ? '正在按默认条件查询…' : '正在加载筛选数据…'} />
      ) : (
        <EmptyState
          icon="corporate_fare"
          title="暂无查询结果"
          description="请设置年份、排位或地区等条件后点击「查询」"
        />
      )}
    </>
  );

  const firstLeadPanel = (
    <FilterPanel
      compact
      actions={
        <FilterPrimaryButton size="compact" loading={leadLoading} onClick={handleQueryFirstLead}>
          {T.queryFirstLead}
        </FilterPrimaryButton>
      }
    >
      <div className="page-grid-cols-3">
        <FilterField compact label={T.province}>
          <FilterSelect
            allowClear
            placeholder={T.provincePh}
            options={provinces}
            value={leadProvince}
            onChange={setLeadProvince}
          />
        </FilterField>
        <FilterField compact label={T.city}>
          <FilterSelect
            allowClear
            placeholder={T.allCitiesPh}
            disabled={!leadProvince}
            options={leadCities}
            value={leadCity}
            onChange={setLeadCity}
          />
        </FilterField>
        <FilterField compact label={T.county}>
          <FilterSelect
            allowClear
            placeholder={T.allCountiesPh}
            disabled={!leadProvince || !leadCity}
            options={leadCounties}
            value={leadCounty}
            onChange={setLeadCounty}
          />
        </FilterField>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">全国口径：不选地区</span>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">地区口径：按省/市/区筛选</span>
      </div>
      {leadResult ? (
        <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm space-y-1.5">
          <div><span className="font-semibold text-slate-500">单位：</span>{leadResult.unit_name || '—'}</div>
          <div>
            <span className="font-semibold text-slate-500">{T.region}：</span>
            {formatRegionText(leadResult.unit_region || leadResult.region)}
          </div>
          <div><span className="font-semibold text-slate-500">标准号：</span>{leadResult.std_id || '—'}</div>
          <div><span className="font-semibold text-slate-500">标准名称：</span>{leadResult.std_chinesename || '—'}</div>
          <div><span className="font-semibold text-slate-500">发布日期：</span>{leadResult.release_date || '—'}</div>
        </div>
      ) : leadLoading ? (
        <LoadingPanel label="正在查询首家牵头…" />
      ) : (
        <EmptyState icon="history" title={T.noRecord} description="选择地区后点击查询，不选地区则按全国口径统计" />
      )}
    </FilterPanel>
  );

  const firstJoinPanel = (
    <>
      <FilterPanel compact className="!mb-3 !p-3">
        <div className="page-toolbar">
          <div className="min-w-0 flex-1">
            <div className="page-grid-cols-4">
              <FilterField compact label={T.province}>
                <FilterSelect
                  allowClear
                  placeholder={T.provincePh}
                  options={provinces}
                  value={firstJoinProvince}
                  onChange={setFirstJoinProvince}
                />
              </FilterField>
              <FilterField compact label={T.city}>
                <FilterSelect
                  allowClear
                  placeholder={T.allCitiesPh}
                  disabled={!firstJoinProvince}
                  options={firstJoinCities}
                  value={firstJoinCity}
                  onChange={setFirstJoinCity}
                />
              </FilterField>
              <FilterField compact label={T.county}>
                <FilterSelect
                  allowClear
                  placeholder={T.allCountiesPh}
                  disabled={!firstJoinProvince || !firstJoinCity}
                  options={firstJoinCounties}
                  value={firstJoinCounty}
                  onChange={setFirstJoinCounty}
                />
              </FilterField>
              <FilterField compact label={T.stdScope}>
                <FilterSelect
                  mode="multiple"
                  options={STD_SCOPE_OPTIONS}
                  value={firstJoinStdScope}
                  onChange={(vals) => setFirstJoinStdScope(vals || [])}
                />
              </FilterField>
            </div>
          </div>
          <div className="page-toolbar-end flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Popover
              open={firstJoinAdvancedOpen}
              onOpenChange={setFirstJoinAdvancedOpen}
              trigger="click"
              placement="bottomRight"
              arrow={{ pointAtCenter: true }}
              align={{ offset: [0, 8] }}
              overlayClassName="first-join-advanced-popover"
              content={firstJoinAdvancedContent}
              destroyOnHidden
            >
              <span className="inline-flex">
                <FilterSecondaryButton size="compact" icon="tune">
                  {T.advancedQuery}
                  {firstJoinAdvancedActive ? (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
                      {T.advancedActive}
                    </span>
                  ) : null}
                </FilterSecondaryButton>
              </span>
            </Popover>
            <FilterSecondaryButton
              size="compact"
              icon="download"
              loading={firstJoinExporting}
              disabled={firstJoinLoading}
              onClick={handleFirstJoinExport}
            >
              {firstJoinExporting ? '导出中' : T.exportExcel}
            </FilterSecondaryButton>
            <FilterPrimaryButton size="compact" loading={firstJoinLoading} onClick={handleQueryFirstJoin}>
              {T.queryFirstJoin}
            </FilterPrimaryButton>
          </div>
        </div>
      </FilterPanel>

      {firstJoinQueried ? (
        <GlassDataTable
          columns={firstJoinTableColumns}
          data={firstJoinItems}
          loading={firstJoinLoading}
          rowKey={(row) => (
            firstJoinExportMode === 'unit_summary'
              ? `${row.unit_name}-${row.first_year}`
              : `${row.unit_id}-${row.std_id}-${row.rank}-${row.release_date}`
          )}
          minWidth={firstJoinExportMode === 'unit_summary' ? 1200 : 1120}
          footerItemLabel={firstJoinFooterLabel}
          emptyIcon="groups"
          emptyTitle={T.noRecord}
          emptyDescription={T.firstJoinPreviewEmpty}
          onRowClick={(row) => row.std_id && openDetail(row.std_id)}
          onRowMouseEnter={(row) => row.std_id && prefetchStandardDetail(row.std_id)}
          pagination={{
            current: firstJoinPage,
            pageSize: firstJoinPageSize,
            total: firstJoinTotal,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
          }}
          onPageChange={(p, ps) => loadFirstJoinPage(p, ps)}
        />
      ) : firstJoinLoading ? (
        <LoadingPanel label="正在查询首次参与列表…" />
      ) : (
        <EmptyState
          icon="groups"
          title={T.noRecord}
          description="设置地区、标准类别与筛选条件后点击「查询」预览数据"
        />
      )}
    </>
  );

  return (
    <div className="page-content animate-fade-in-up min-w-0 w-full pb-8">
      <Tabs
        className="drafting-unit-tabs"
        activeKey={activeTab}
        onChange={handleActiveTabChange}
        destroyInactiveTabPane
        items={[
          { key: 'search', label: T.tabSearch, children: searchPanel },
          { key: 'firstLead', label: T.tabFirstLead, children: firstLeadPanel },
          { key: 'firstJoin', label: T.tabFirstJoin, children: firstJoinPanel },
        ]}
      />
    </div>
  );
};

export default DraftingUnit;

