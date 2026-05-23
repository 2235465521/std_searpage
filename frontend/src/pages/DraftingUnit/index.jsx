import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Tooltip, message, Select, Table, Tabs } from 'antd';
import { fetchCities, fetchCounties, fetchProvinces } from '../../api/analytics';
import { canPersistSessionData, ensureValidToken } from '../../api/tokenAuth';
import { fetchFirstLeadUnit, fetchUnitFirstParticipation, searchUnits } from '../../api/units';
import { formatStdTypeCode } from '../../utils/stdType';
import {
  AUTO_QUERY_PAGES,
  markPageAutoQueryDone,
  shouldPageAutoQueryOnFirstVisit,
} from '../../utils/sessionAutoQuery';
import FilterPanel, {
  FilterField,
  FilterPrimaryButton,
  FilterSecondaryButton,
} from '../../components/ui/FilterPanel';
import LoadingPanel from '../../components/ui/LoadingPanel';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';

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
  queryFirstJoin: '\u67e5\u9996\u6b21\u53c2\u4e0e\u5217\u8868',
  firstJoinYear: '\u9996\u6b21\u53c2\u4e0e\u5e74\u4efd',
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
const STD_SCOPE_ALIAS = { GB: '00', HB: '01', DB: '02', TB: '03', '00': '00', '01': '01', '02': '02', '03': '03' };

const LEGACY_RANK_MAP = {
  eq1: '1',
  range_2_4: '2-3',
  gte4: '>=4',
};

const normalizeRankInput = (value) => (value || '').trim();
const DRAFTING_UNIT_SNAPSHOT_KEY = 'drafting-unit-page-snapshot:v2';
const AUTO_QUERY_PAGE = AUTO_QUERY_PAGES.UNITS;
const AUTO_QUERY_PAGE_LEAD = AUTO_QUERY_PAGES.UNITS_FIRST_LEAD;
const AUTO_QUERY_PAGE_FIRST_JOIN = AUTO_QUERY_PAGES.UNITS_FIRST_JOIN;
const selectSuffix = (
  <span className="material-symbols-outlined text-lg text-slate-400">expand_more</span>
);

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
  const [activeTab, setActiveTab] = useState(initialSnapshot?.activeTab || 'search');

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
      setSearchParams(params, { replace: true });
    },
    [filterYear, rankQuery, stdScope, province, city, county, setSearchParams],
  );

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
    setFirstJoinLoading(true);
    try {
      const data = await fetchUnitFirstParticipation({
        province: firstJoinProvince,
        ...(firstJoinCity ? { city: firstJoinCity } : {}),
        ...(firstJoinCounty ? { county: firstJoinCounty } : {}),
        ...(firstJoinStdScope?.length ? { std_scope: firstJoinStdScope.join(',') } : {}),
        page,
        size,
      });
      const rows = data?.items || [];
      setFirstJoinItems(rows);
      setFirstJoinTotal(data?.total ?? 0);
      setFirstJoinPage(data?.page ?? page);
      setFirstJoinPageSize(data?.size ?? size);
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
    firstJoinPageSize,
    firstJoinCities,
    firstJoinCounties,
    activeTab,
  ]);

  const handleQueryFirstJoin = useCallback(
    () => loadFirstJoinPage(1, firstJoinPageSize),
    [loadFirstJoinPage, firstJoinPageSize],
  );

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

  const columns = [
    {
      title: T.unitName,
      dataIndex: 'unit_names',
      key: 'unit_names',
      ellipsis: true,
      render: (names) => {
        const allNames = names || [];
        const preview = (
          <div className="space-y-0.5 py-0.5">
            {allNames.slice(0, 3).map((name) => (
              <div key={name} className="leading-snug">
                {name}
              </div>
            ))}
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
            <div className="cursor-pointer">{preview}</div>
          </Tooltip>
        );
      },
    },
    { title: T.stdId, dataIndex: 'std_id', key: 'std_id', width: 140, ellipsis: true },
    { title: T.stdName, dataIndex: 'std_chinesename', key: 'std_chinesename', ellipsis: true },
    {
      title: T.stdType,
      dataIndex: 'std_type',
      key: 'std_type',
      width: 72,
      render: (val, row) => formatStdTypeCode(val, row.std_type_no) || '—',
    },
    { title: T.releaseDate, dataIndex: 'release_date', key: 'release_date', width: 110 },
    {
      title: T.action,
      key: 'action',
      width: 72,
      render: (_, row) => (
        <Button
          type="link"
          size="small"
          onClick={() =>
            navigate(`/detail/${encodeURIComponent(row.std_id)}`, {
              state: { from: `/units?${searchParams.toString()}` },
            })
          }
        >
          {T.detail}
        </Button>
      ),
    },
  ];

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterField compact label={T.filterYear}>
            <Select
              options={YEAR_OPTIONS}
              value={filterYear}
              onChange={setFilterYear}
              suffixIcon={selectSuffix}
            />
          </FilterField>
          <FilterField compact label={T.rankTier}>
            <Input
              value={rankQuery}
              placeholder={T.rankTierPh}
              onChange={(e) => setRankQuery(normalizeRankInput(e.target.value))}
            />
          </FilterField>
          <FilterField compact label={T.stdScope}>
            <Select
              mode="multiple"
              maxTagCount="responsive"
              options={STD_SCOPE_OPTIONS}
              value={stdScope}
              onChange={(vals) => setStdScope(vals || [])}
              suffixIcon={selectSuffix}
            />
          </FilterField>
          <FilterField compact label={T.province}>
            <Select
              allowClear
              placeholder={T.provincePh}
              options={provinces}
              value={province}
              onChange={setProvince}
              suffixIcon={selectSuffix}
            />
          </FilterField>
          <FilterField compact label={T.city}>
            <Select
              allowClear
              placeholder={T.allCitiesPh}
              disabled={!province}
              options={cities}
              value={city}
              onChange={setCity}
              suffixIcon={selectSuffix}
            />
          </FilterField>
          <FilterField compact label={T.county}>
            <Select
              allowClear
              placeholder={T.allCountiesPh}
              disabled={!province || !city}
              options={counties}
              value={county}
              onChange={setCounty}
              suffixIcon={selectSuffix}
            />
          </FilterField>
        </div>
      </FilterPanel>

      {showTable ? (
        <div className="glass-card overflow-hidden rounded-xl p-3 md:p-4">
          <Table
            rowKey={(row) => `${row.std_id}-${(row.ranks || []).join('-')}`}
            size="small"
            loading={loading}
            columns={columns}
            dataSource={items}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (n) => `共 ${n} 条`,
              onChange: (p, s) => runSearch(p, s),
            }}
          />
        </div>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FilterField compact label={T.province}>
          <Select
            allowClear
            placeholder={T.provincePh}
            options={provinces}
            value={leadProvince}
            onChange={setLeadProvince}
            suffixIcon={selectSuffix}
          />
        </FilterField>
        <FilterField compact label={T.city}>
          <Select
            allowClear
            placeholder={T.allCitiesPh}
            disabled={!leadProvince}
            options={leadCities}
            value={leadCity}
            onChange={setLeadCity}
            suffixIcon={selectSuffix}
          />
        </FilterField>
        <FilterField compact label={T.county}>
          <Select
            allowClear
            placeholder={T.allCountiesPh}
            disabled={!leadProvince || !leadCity}
            options={leadCounties}
            value={leadCounty}
            onChange={setLeadCounty}
            suffixIcon={selectSuffix}
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
      <FilterPanel
        compact
        actions={
          <FilterPrimaryButton size="compact" loading={firstJoinLoading} onClick={handleQueryFirstJoin}>
            {T.queryFirstJoin}
          </FilterPrimaryButton>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField compact label={T.province}>
            <Select
              allowClear
              placeholder={T.provincePh}
              options={provinces}
              value={firstJoinProvince}
              onChange={setFirstJoinProvince}
              suffixIcon={selectSuffix}
            />
          </FilterField>
          <FilterField compact label={T.city}>
            <Select
              allowClear
              placeholder={T.allCitiesPh}
              disabled={!firstJoinProvince}
              options={firstJoinCities}
              value={firstJoinCity}
              onChange={setFirstJoinCity}
              suffixIcon={selectSuffix}
            />
          </FilterField>
          <FilterField compact label={T.county}>
            <Select
              allowClear
              placeholder={T.allCountiesPh}
              disabled={!firstJoinProvince || !firstJoinCity}
              options={firstJoinCounties}
              value={firstJoinCounty}
              onChange={setFirstJoinCounty}
              suffixIcon={selectSuffix}
            />
          </FilterField>
          <FilterField compact label={T.stdScope}>
            <Select
              mode="multiple"
              maxTagCount="responsive"
              options={STD_SCOPE_OPTIONS}
              value={firstJoinStdScope}
              onChange={(vals) => setFirstJoinStdScope(vals || [])}
              suffixIcon={selectSuffix}
            />
          </FilterField>
        </div>
      </FilterPanel>

      {firstJoinTotal > 0 || firstJoinItems.length ? (
        <div className="glass-card overflow-hidden rounded-xl p-3 md:p-4">
          <Table
            rowKey={(row) => `${row.unit_id}-${row.std_id}-${row.rank}-${row.release_date}`}
            size="small"
            loading={firstJoinLoading}
            pagination={{
              current: firstJoinPage,
              pageSize: firstJoinPageSize,
              total: firstJoinTotal,
              showSizeChanger: true,
              showTotal: (n) => `共 ${n} 条`,
              onChange: (p, ps) => loadFirstJoinPage(p, ps),
            }}
            columns={[
              { title: T.unitName, dataIndex: 'unit_name', key: 'unit_name', width: 220 },
              { title: T.firstJoinYear, dataIndex: 'first_year', key: 'first_year', width: 110 },
              { title: T.stdId, dataIndex: 'std_id', key: 'std_id', width: 140, ellipsis: true },
              { title: T.stdName, dataIndex: 'std_chinesename', key: 'std_chinesename', ellipsis: true },
              {
                title: T.stdType,
                dataIndex: 'std_type',
                key: 'std_type',
                width: 100,
                render: (val, row) => formatStdTypeCode(val, row.std_type_no) || '—',
              },
              { title: T.releaseDate, dataIndex: 'release_date', key: 'release_date', width: 120 },
              { title: T.rankTier, dataIndex: 'rank', key: 'rank', width: 110 },
            ]}
            dataSource={firstJoinItems}
          />
        </div>
      ) : firstJoinLoading ? (
        <LoadingPanel label="正在查询首次参与列表…" />
      ) : (
        <EmptyState
          icon="groups"
          title={T.noRecord}
          description="选择地区与标准类别后点击查询首次参与列表"
        />
      )}
    </>
  );

  return (
    <div className="animate-fade-in-up max-w-6xl pb-8">
      <PageHeader
        compact
        title={T.pageTitle}
        subtitle="按起草单位、地区与标准类别检索，支持首家牵头国标与首次参与查询"
        badge={total > 0 ? `${total.toLocaleString()} 条` : undefined}
      />
      <Tabs
        className="drafting-unit-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
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

