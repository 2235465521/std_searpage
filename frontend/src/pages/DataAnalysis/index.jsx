import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { message, Tabs } from 'antd';
import {
  downloadBlobResponse,
  exportAnalyticsExcel,
  fetchCities,
  fetchCounties,
  fetchProvinces,
  fetchRegionalSummary,
  fetchYearCompare,
  fetchYearRangeStats,
} from '../../api/analytics';
import { ensureValidToken } from '../../api/tokenAuth';
import {
  AUTO_QUERY_PAGES,
  markPageAutoQueryDone,
  shouldPageAutoQueryOnFirstVisit,
} from '../../utils/sessionAutoQuery';
import AnalyticsCharts from './components/AnalyticsCharts';
import YearAnalysisPanel from './components/YearAnalysisPanel';
import FilterPanel, {
  FilterField,
  FilterPrimaryButton,
  FilterSecondaryButton,
  FilterSelect,
} from '../../components/ui/FilterPanel';
import LoadingPanel from '../../components/ui/LoadingPanel';
import EmptyState from '../../components/ui/EmptyState';
import GlassDataTable, { TypeTag } from '../../components/ui/GlassDataTable';
import { resolveAnalyticsTab } from '../../config/nav';
import {
  buildRegionKey,
  getPageSnapshot,
  getSummaryFromCache,
  savePageSnapshot,
  setSummaryInCache,
} from './analyticsSessionCache';
import { STD_TYPE_CODES, STD_TYPE_LABELS } from './constants';

const T = {
  pageTitle: '\u6570\u636e\u5206\u6790',
  regionTitle: '\u884c\u653f\u533a\u5212',
  province: '\u7701',
  city: '\u5e02',
  county: '\u53bf/\u533a',
  filterYear: '\u5e74\u4efd',
  provincePh: '\u5168\u90e8\u7701\u4efd',
  allCitiesPh: '\u5168\u90e8\u57ce\u5e02',
  allCountiesPh: '\u5168\u90e8\u53bf/\u533a',
  regionCol: '\u533a\u57df',
  querySummary: '\u67e5\u8be2',
  exportExcel: '\u5bfc\u51fa Excel',
  tabTable: '\u6570\u636e\u8868\u683c',
  tabBar: '\u67f1\u72b6\u56fe',
  tabPie: '\u997c\u56fe',
  tabYear: '\u5e74\u5ea6\u5206\u6790',
  yearModeCompare: '\u4e24\u5e74\u5bf9\u6bd4',
  yearModeRange: '\u5e74\u6bb5\u7edf\u8ba1',
  compareTitle: '\u4e24\u5e74\u53d1\u5e03\u91cf\u5bf9\u6bd4',
  compareHint: '\u5bf9\u6bd4\u4e24\u4e2a\u5e74\u4efd\u7684\u6807\u51c6\u53d1\u5e03\u6570\u91cf\u4e0e\u589e\u51cf\u53d8\u5316',
  rangeTitle: '\u5e74\u6bb5\u53d1\u5e03\u7edf\u8ba1',
  rangeHint: '\u6c47\u603b\u9009\u5b9a\u5e74\u6bb5\u5185\u7684\u53d1\u5e03\u603b\u91cf\u3001\u5e74\u5747\u6c34\u5e73\u4e0e\u7c7b\u522b\u7ed3\u6784',
  yearCompareTitle: '\u5e74\u5ea6\u53d1\u5e03\u5bf9\u6bd4',
  yearA: '\u57fa\u51c6\u5e74',
  yearB: '\u5bf9\u6bd4\u5e74',
  yearFrom: '\u8d77\u59cb\u5e74',
  yearTo: '\u7ed3\u675f\u5e74',
  compareBtn: '\u5bf9\u6bd4\u5206\u6790',
  rangeBtn: '\u6bb5\u5185\u7edf\u8ba1',
  rangeTotal: '\u6bb5\u5185\u5408\u8ba1',
  rangeAvg: '\u5e74\u5747\u53d1\u5e03',
  rangeSpan: '\u5e74\u4efd\u8de8\u5ea6',
  yearTrend: '\u5e74\u5ea6\u8d8b\u52bf',
  sharePct: '\u5360\u6bd4',
  avgPerYear: '\u5e74\u5747',
  stdCategory: '\u6807\u51c6\u7c7b\u522b',
  typeCode: '\u7c7b\u578b\u4ee3\u7801',
  type: '\u7c7b\u578b',
  count: '\u6570\u91cf',
  delta: '\u589e\u51cf',
  nation: '\u5168\u56fd',
  regionStats: '\u7edf\u8ba1\u8303\u56f4\uff1a',
  total: '\u5408\u8ba1',
  item: '\u9879',
  totalChange: '\u5408\u8ba1\u53d8\u5316\uff1a',
  totalChangeSuffix: '\u9879',
  yearPublish: '\u5e74\u53d1\u5e03',
  loadProvinceFail: '\u52a0\u8f7d\u7701\u4efd\u5217\u8868\u5931\u8d25',
  loadCityFail: '\u52a0\u8f7d\u57ce\u5e02\u5217\u8868\u5931\u8d25',
  loadCountyFail: '\u52a0\u8f7d\u533a\u53bf\u5217\u8868\u5931\u8d25',
  summaryFail: '\u533a\u57df\u7edf\u8ba1\u5931\u8d25',
  breakdownFail: '\u5206\u533a\u660e\u7ec6\u52a0\u8f7d\u5931\u8d25',
  breakdownLoading: '\u5206\u533a\u660e\u7ec6\u52a0\u8f7d\u4e2d\u2026',
  loadBreakdown: '\u52a0\u8f7d\u5206\u533a\u660e\u7ec6',
  breakdownHint: '\u5206\u533a\u660e\u7ec6\u52a0\u8f7d\u5931\u8d25\u6216\u672a\u5b8c\u6210\uff0c\u53ef\u70b9\u51fb\u91cd\u8bd5',
  summaryLoading: '\u52a0\u8f7d\u4e2d',
  pickYears: '\u8bf7\u9009\u62e9\u5bf9\u6bd4\u5e74\u4efd',
  pickRangeYears: '\u8bf7\u9009\u62e9\u8d77\u6b62\u5e74\u4efd',
  compareFail: '\u5e74\u5ea6\u5bf9\u6bd4\u5931\u8d25',
  rangeFail: '\u5e74\u6bb5\u7edf\u8ba1\u5931\u8d25',
  exportOk: '\u5bfc\u51fa\u6210\u529f',
  exportFail: '\u5bfc\u51fa\u5931\u8d25',
  scopeHintNation: '\u5168\u56fd\uff08\u6309\u7701\u7edf\u8ba1\uff09',
  scopeHintProvince: '\u6309\u300c\u5e02\u300d\u7edf\u8ba1',
  scopeHintCity: '\u6309\u300c\u53bf/\u533a\u300d\u7edf\u8ba1',
  scopeHintCounty: '\u5355\u533a\u7edf\u8ba1',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 35 }, (_, i) => CURRENT_YEAR - i).map((y) => ({
  value: y,
  label: `${y} \u5e74`,
}));
const STD_SCOPE_OPTIONS = [
  { value: '00', label: '国家标准 (GB)' },
  { value: '01', label: '行业标准 (HB)' },
  { value: '02', label: '地方标准 (DB)' },
  { value: '03', label: '团体标准 (TB)' },
];
const STD_SCOPE_ALIAS = { GB: '00', HB: '01', DB: '02', TB: '03', '00': '00', '01': '01', '02': '02', '03': '03' };
const normalizeStdScopeValues = (values, fallback = ['00']) => {
  const list = Array.isArray(values) ? values : [];
  const normalized = list
    .map((x) => STD_SCOPE_ALIAS[String(x || '').trim().toUpperCase()])
    .filter((x) => ['00', '01', '02', '03'].includes(x));
  return normalized.length ? normalized : fallback;
};

const TABLE_SCROLL_Y = 400;
const BREAKDOWN_MIN_WIDTH = 200 + STD_TYPE_CODES.length * 96;
const DataAnalysis = () => {
  const restoredSnapshot = useMemo(() => getPageSnapshot(), []);
  const [searchParams, setSearchParams] = useSearchParams();

  const [provinces, setProvinces] = useState(restoredSnapshot?.provinces ?? []);
  const [cities, setCities] = useState(restoredSnapshot?.cities ?? []);
  const [counties, setCounties] = useState(restoredSnapshot?.counties ?? []);
  const [province, setProvince] = useState(restoredSnapshot?.province);
  const [city, setCity] = useState(restoredSnapshot?.city);
  const [county, setCounty] = useState(restoredSnapshot?.county);
  const [filterYear, setFilterYear] = useState(restoredSnapshot?.filterYear ?? CURRENT_YEAR);
  const [stdScope, setStdScope] = useState(normalizeStdScopeValues(restoredSnapshot?.stdScope, ['00']));

  const initialRegionKey = buildRegionKey({
    year: restoredSnapshot?.filterYear ?? CURRENT_YEAR,
    std_scope: normalizeStdScopeValues(restoredSnapshot?.stdScope, ['00']).join(','),
    province: restoredSnapshot?.province,
    city: restoredSnapshot?.city,
    county: restoredSnapshot?.county,
  });
  const initialSummary =
    restoredSnapshot?.summary ??
    getSummaryFromCache(initialRegionKey) ??
    null;

  const [summary, setSummary] = useState(initialSummary);
  const [compare, setCompare] = useState(restoredSnapshot?.compare ?? null);
  const [yearRange, setYearRange] = useState(restoredSnapshot?.yearRange ?? null);
  const [yearA, setYearA] = useState(restoredSnapshot?.yearA ?? CURRENT_YEAR - 1);
  const [yearB, setYearB] = useState(restoredSnapshot?.yearB ?? CURRENT_YEAR);
  const [yearFrom, setYearFrom] = useState(restoredSnapshot?.yearFrom ?? CURRENT_YEAR - 4);
  const [yearTo, setYearTo] = useState(restoredSnapshot?.yearTo ?? CURRENT_YEAR);
  const [yearAnalysisMode, setYearAnalysisMode] = useState(restoredSnapshot?.yearAnalysisMode ?? 'compare');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingBreakdown, setLoadingBreakdown] = useState(
    !!initialSummary?.breakdown_pending && !initialSummary?.breakdown?.length,
  );
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [loadingRange, setLoadingRange] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resultTab, setResultTab] = useState(() => resolveAnalyticsTab(searchParams, restoredSnapshot?.resultTab ?? 'table'));
  const [bootstrapReady, setBootstrapReady] = useState(!!restoredSnapshot?.bootstrapReady);
  const shouldAutoQueryOnInitRef = useRef(
    !initialSummary && shouldPageAutoQueryOnFirstVisit(AUTO_QUERY_PAGES.ANALYTICS),
  );
  const loadSummaryRef = useRef(null);
  const loadBreakdownRef = useRef(null);
  const summaryRequestIdRef = useRef(0);
  const pageStateRef = useRef({});
  const skipProvinceCascadeRef = useRef(
    !!(restoredSnapshot?.province && restoredSnapshot?.cities?.length),
  );
  const skipCountyCascadeRef = useRef(
    !!(restoredSnapshot?.province && restoredSnapshot?.city && restoredSnapshot?.counties?.length),
  );

  const applyResultTab = useCallback((tab) => {
    setResultTab(tab);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (tab === 'table') params.delete('tab');
      else params.set('tab', tab);
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/analytics') return;
    const nextTab = resolveAnalyticsTab(searchParams, 'table');
    if (nextTab !== resultTab) setResultTab(nextTab);
  }, [location.pathname, searchParams, resultTab]);

  const regionParams = useMemo(
    () => ({
      year: filterYear,
      ...(stdScope?.length ? { std_scope: stdScope.join(',') } : {}),
      ...(province ? { province } : {}),
      ...(city ? { city } : {}),
      ...(county ? { county } : {}),
    }),
    [filterYear, stdScope, province, city, county],
  );

  const scopeParams = useMemo(
    () => ({
      ...(stdScope?.length ? { std_scope: stdScope.join(',') } : {}),
      ...(province ? { province } : {}),
      ...(city ? { city } : {}),
      ...(county ? { county } : {}),
    }),
    [stdScope, province, city, county],
  );

  const queryScopeHint = useMemo(() => {
    if (county && city && province) {
      return `${province} ${city} ${county}（${T.scopeHintCounty}）`;
    }
    if (city && province) {
      return `${province} ${city}（${T.scopeHintCity}）`;
    }
    if (province) {
      return `${province}（${T.scopeHintProvince}）`;
    }
    return T.scopeHintNation;
  }, [province, city, county]);

  const invalidateResults = useCallback(() => {
    setSummary(null);
    setCompare(null);
    setYearRange(null);
  }, []);

  const handleProvinceChange = (val) => {
    setProvince(val);
    setCity(undefined);
    setCounty(undefined);
    invalidateResults();
  };

  const handleCityChange = (val) => {
    setCity(val);
    setCounty(undefined);
    invalidateResults();
  };

  const handleCountyChange = (val) => {
    setCounty(val);
    invalidateResults();
  };

  const persistSnapshot = useCallback(
    (overrides = {}) => {
      const regionKey = buildRegionKey(regionParams);
      const snapshot = {
        provinces,
        cities,
        counties,
        province,
        city,
        county,
        filterYear,
        stdScope,
        summary,
        compare,
        yearRange,
        yearA,
        yearB,
        yearFrom,
        yearTo,
        yearAnalysisMode,
        resultTab,
        bootstrapReady,
        regionKey,
        ...overrides,
      };
      if (snapshot.regionKey && snapshot.summary) {
        setSummaryInCache(snapshot.regionKey, snapshot.summary);
      }
      savePageSnapshot(snapshot);
    },
    [
      regionParams,
      provinces,
      cities,
      counties,
      province,
      city,
      county,
      filterYear,
      stdScope,
      summary,
      compare,
      yearRange,
      yearA,
      yearB,
      yearFrom,
      yearTo,
      yearAnalysisMode,
      resultTab,
      bootstrapReady,
    ],
  );

  useEffect(() => {
    const snap = getPageSnapshot();
    if (snap?.bootstrapReady && snap?.provinces?.length) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        await ensureValidToken();
        const data = await fetchProvinces();
        if (cancelled) return;
        setProvinces((data?.provinces || []).map((p) => ({ value: p, label: p })));

        const effectiveYear =
          data?.latest_year && !getPageSnapshot()
            ? data.latest_year
            : restoredSnapshot?.filterYear ?? filterYear;
        if (data?.latest_year && !getPageSnapshot()) {
          setFilterYear(data.latest_year);
        }

        if (shouldAutoQueryOnInitRef.current && !initialSummary) {
          shouldAutoQueryOnInitRef.current = false;
          loadSummaryRef.current?.(
            {
              year: effectiveYear,
              ...(stdScope?.length ? { std_scope: stdScope.join(',') } : {}),
            },
            { fetchBreakdown: true },
          );
        }
      } catch {
        if (!cancelled) message.error(T.loadProvinceFail);
      } finally {
        if (!cancelled) setBootstrapReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!province) {
      setCities([]);
      setCity(undefined);
      return;
    }
    const skipFetch = skipProvinceCascadeRef.current;
    if (skipProvinceCascadeRef.current) {
      skipProvinceCascadeRef.current = false;
    }
    if (!skipFetch) {
      fetchCities(province)
        .then((data) => setCities((data?.cities || []).map((c) => ({ value: c, label: c }))))
        .catch(() => message.error(T.loadCityFail));
      setCity(undefined);
      setCounty(undefined);
      invalidateResults();
    }
  }, [province, invalidateResults]);

  useEffect(() => {
    if (!province || !city) {
      setCounties([]);
      setCounty(undefined);
      return;
    }
    if (skipCountyCascadeRef.current) {
      skipCountyCascadeRef.current = false;
      return;
    }
    fetchCounties(province, city)
      .then((data) => setCounties((data?.counties || []).map((c) => ({ value: c, label: c }))))
      .catch(() => message.error(T.loadCountyFail));
    setCounty(undefined);
  }, [province, city]);

  const applySummaryResult = useCallback(
    (data, key, extras = {}) => {
      setSummaryInCache(key, data);
      setSummary(data);
      setCompare(null);
      if (!extras.keepResultTab) {
        applyResultTab('table');
      }
      markPageAutoQueryDone(AUTO_QUERY_PAGES.ANALYTICS);
      persistSnapshot({
        summary: data,
        compare: null,
        resultTab: extras.keepResultTab ? resultTab : 'table',
        regionKey: key,
      });
    },
    [persistSnapshot, resultTab, applyResultTab],
  );

  const loadBreakdownOnly = useCallback(
    async (paramOverrides = {}) => {
      const params = { ...regionParams, ...paramOverrides };
      const key = buildRegionKey(params);
      if (params.county || loadingBreakdown) return;

      const requestId = ++summaryRequestIdRef.current;
      const isStale = () => requestId !== summaryRequestIdRef.current;

      setLoadingBreakdown(true);
      try {
        const fullData = await fetchRegionalSummary(params);
        if (isStale()) return;
        applySummaryResult(fullData, key, { keepResultTab: true });
      } catch (e) {
        if (!isStale()) message.error(e.message || T.breakdownFail);
      } finally {
        if (!isStale()) setLoadingBreakdown(false);
      }
    },
    [regionParams, applySummaryResult, loadingBreakdown],
  );

  loadBreakdownRef.current = loadBreakdownOnly;

  const loadSummary = useCallback(
    async (paramOverrides = {}, { fetchBreakdown = true } = {}) => {
      const requestId = ++summaryRequestIdRef.current;
      const params = { ...regionParams, ...paramOverrides };
      const key = buildRegionKey(params);
      const needsBreakdown = !params.county;
      const isStale = () => requestId !== summaryRequestIdRef.current;

      setLoadingSummary(true);
      setLoadingBreakdown(false);

      try {
        if (needsBreakdown) {
          const fastData = await fetchRegionalSummary({ ...params, include_breakdown: 0 });
          if (isStale()) return;
          applySummaryResult(fastData, key);
          setLoadingSummary(false);

          if (!fetchBreakdown) {
            return;
          }

          setLoadingBreakdown(true);
          try {
            const fullData = await fetchRegionalSummary(params);
            if (isStale()) return;
            applySummaryResult(fullData, key);
          } catch (e) {
            if (!isStale()) message.error(e.message || T.breakdownFail);
          } finally {
            if (!isStale()) setLoadingBreakdown(false);
          }
          return;
        }

        const data = await fetchRegionalSummary(params);
        if (isStale()) return;
        applySummaryResult(data, key);
      } catch (e) {
        if (!isStale()) message.error(e.message || T.summaryFail);
      } finally {
        if (!isStale()) {
          setLoadingSummary(false);
          setLoadingBreakdown(false);
        }
      }
    },
    [regionParams, applySummaryResult],
  );

  loadSummaryRef.current = loadSummary;

  useEffect(() => {
    if (!summary?.breakdown_level || summary?.breakdown?.length || loadingBreakdown) return;
    if (!summary.breakdown_pending) return;
    if (!['table', 'bar', 'pie'].includes(resultTab)) return;
    loadBreakdownRef.current?.();
  }, [summary, resultTab, loadingBreakdown]);

  useEffect(() => {
    pageStateRef.current = {
      provinces,
      cities,
      counties,
      province,
      city,
      county,
      filterYear,
      stdScope,
      summary,
      compare,
      yearRange,
      yearA,
      yearB,
      yearFrom,
      yearTo,
      yearAnalysisMode,
      resultTab,
      bootstrapReady,
      regionKey: buildRegionKey(regionParams),
    };
  });

  useEffect(
    () => () => {
      const snapshot = pageStateRef.current;
      if (snapshot.regionKey && snapshot.summary) {
        setSummaryInCache(snapshot.regionKey, snapshot.summary);
      }
      savePageSnapshot(snapshot);
    },
    [],
  );

  const loadCompare = useCallback(async () => {
    if (!yearA || !yearB) {
      message.warning(T.pickYears);
      return;
    }
    setLoadingCompare(true);
    try {
      const data = await fetchYearCompare({ ...scopeParams, year_a: yearA, year_b: yearB });
      setCompare(data);
      setYearAnalysisMode('compare');
      applyResultTab('year');
      persistSnapshot({ compare: data, yearAnalysisMode: 'compare', resultTab: 'year' });
    } catch (e) {
      message.error(e.message || T.compareFail);
    } finally {
      setLoadingCompare(false);
    }
  }, [scopeParams, yearA, yearB, persistSnapshot, applyResultTab]);

  const loadYearRange = useCallback(async () => {
    if (!yearFrom || !yearTo) {
      message.warning(T.pickRangeYears);
      return;
    }
    setLoadingRange(true);
    try {
      const data = await fetchYearRangeStats({
        ...scopeParams,
        year_from: yearFrom,
        year_to: yearTo,
      });
      setYearRange(data);
      setYearAnalysisMode('range');
      applyResultTab('year');
      persistSnapshot({ yearRange: data, yearAnalysisMode: 'range', resultTab: 'year' });
    } catch (e) {
      message.error(e.message || T.rangeFail);
    } finally {
      setLoadingRange(false);
    }
  }, [scopeParams, yearFrom, yearTo, persistSnapshot, applyResultTab]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { ...regionParams };
      if (yearA && yearB) {
        params.year_a = yearA;
        params.year_b = yearB;
      }
      if (yearFrom && yearTo) {
        params.year_from = yearFrom;
        params.year_to = yearTo;
      }
      const res = await exportAnalyticsExcel(params);
      downloadBlobResponse(res);
      message.success(T.exportOk);
    } catch (e) {
      message.error(e.message || T.exportFail);
    } finally {
      setExporting(false);
    }
  };

  const breakdownColumns = useMemo(() => {
    const typeCols = STD_TYPE_CODES.map((code) => ({
      key: code,
      title: STD_TYPE_LABELS[code] || code,
      align: 'right',
      cellClassName: 'tabular-nums font-medium text-on-surface-variant',
      render: (row) => (row.counts?.[code] ?? 0).toLocaleString(),
    }));
    return [
      {
        key: 'region_name',
        title: T.regionCol,
        headerClassName: 'sticky left-0 z-20 bg-surface-container-low/95 backdrop-blur-sm',
        cellClassName:
          'sticky left-0 z-10 whitespace-nowrap bg-white/95 font-semibold text-on-surface group-hover:bg-blue-50/50',
        render: (row) => row.region_name,
      },
      {
        key: 'total',
        title: T.total,
        align: 'right',
        cellClassName: 'font-bold tabular-nums text-primary',
        render: (row) => row.total?.toLocaleString?.() ?? row.total,
      },
      ...typeCols,
    ];
  }, []);

  const summaryColumns = useMemo(
    () => [
      {
        key: 'label',
        title: T.stdCategory,
        cellClassName: 'font-medium text-on-surface',
        render: (row) => row.label,
      },
      {
        key: 'std_type',
        title: T.typeCode,
        render: (row) => <TypeTag code={row.std_type} />,
      },
      {
        key: 'count',
        title: T.count,
        align: 'right',
        cellClassName: 'font-bold tabular-nums text-primary',
        render: (row) => row.count?.toLocaleString?.() ?? row.count,
      },
    ],
    [],
  );

  const compareColumns = useMemo(
    () => [
      {
        key: 'label',
        title: T.stdCategory,
        cellClassName: 'font-medium text-on-surface',
        render: (row) => row.label,
      },
      {
        key: 'std_type',
        title: T.type,
        render: (row) => <TypeTag code={row.std_type} />,
      },
      {
        key: 'count_a',
        title: compare ? `${compare.year_a} ${T.yearPublish}` : T.yearA,
        align: 'right',
        cellClassName: 'tabular-nums font-medium text-on-surface-variant',
        render: (row) => row.count_a?.toLocaleString?.() ?? row.count_a,
      },
      {
        key: 'count_b',
        title: compare ? `${compare.year_b} ${T.yearPublish}` : T.yearB,
        align: 'right',
        cellClassName: 'tabular-nums font-medium text-on-surface-variant',
        render: (row) => row.count_b?.toLocaleString?.() ?? row.count_b,
      },
      {
        key: 'delta',
        title: T.delta,
        align: 'right',
        render: (row) => {
          const v = row.delta;
          return (
            <span
              className={[
                'inline-flex min-w-[3rem] justify-end rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                v > 0 ? 'bg-emerald-50 text-emerald-700' : v < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500',
              ].join(' ')}
            >
              {v > 0 ? `+${v.toLocaleString()}` : v?.toLocaleString?.() ?? v}
            </span>
          );
        },
      },
    ],
    [compare],
  );

  const rangeTrendColumns = useMemo(() => {
    const typeCols = STD_TYPE_CODES.map((code) => ({
      key: code,
      title: STD_TYPE_LABELS[code] || code,
      align: 'right',
      cellClassName: 'tabular-nums font-medium text-on-surface-variant',
      render: (row) => {
        const match = (row.by_type || []).find((item) => item.std_type === code);
        return (match?.count ?? 0).toLocaleString();
      },
    }));
    return [
      {
        key: 'year',
        title: T.filterYear,
        headerClassName: 'sticky left-0 z-20 bg-surface-container-low/95 backdrop-blur-sm',
        cellClassName:
          'sticky left-0 z-10 whitespace-nowrap bg-white/95 font-semibold text-on-surface group-hover:bg-blue-50/50',
        render: (row) => `${row.year}年`,
      },
      {
        key: 'total',
        title: T.total,
        align: 'right',
        cellClassName: 'font-bold tabular-nums text-primary',
        render: (row) => row.total?.toLocaleString?.() ?? row.total,
      },
      ...typeCols,
    ];
  }, []);

  const rangeTypeColumns = useMemo(
    () => [
      {
        key: 'label',
        title: T.stdCategory,
        cellClassName: 'font-medium text-on-surface',
        render: (row) => row.label,
      },
      {
        key: 'std_type',
        title: T.type,
        render: (row) => <TypeTag code={row.std_type} />,
      },
      {
        key: 'count',
        title: T.rangeTotal,
        align: 'right',
        cellClassName: 'font-bold tabular-nums text-primary',
        render: (row) => row.count?.toLocaleString?.() ?? row.count,
      },
      {
        key: 'avg_per_year',
        title: T.avgPerYear,
        align: 'right',
        cellClassName: 'tabular-nums font-medium text-on-surface-variant',
        render: (row) => row.avg_per_year,
      },
      {
        key: 'share_pct',
        title: T.sharePct,
        align: 'right',
        cellClassName: 'tabular-nums font-medium text-on-surface-variant',
        render: (row) => `${row.share_pct ?? 0}%`,
      },
    ],
    [],
  );

  const rangeDetailColumns = useMemo(() => {
    const years = yearRange?.years || [];
    const yearCols = years.map((y) => ({
      key: `y-${y}`,
      title: `${y}年`,
      align: 'right',
      cellClassName: 'tabular-nums font-medium text-on-surface-variant',
      render: (row) => (row.year_counts?.[y] ?? row.year_counts?.[String(y)] ?? 0).toLocaleString(),
    }));
    return [
      {
        key: 'label',
        title: T.stdCategory,
        headerClassName: 'sticky left-0 z-20 bg-surface-container-low/95 backdrop-blur-sm',
        cellClassName:
          'sticky left-0 z-10 bg-white/95 font-medium text-on-surface group-hover:bg-blue-50/50',
        render: (row) => row.label,
      },
      ...yearCols,
      {
        key: 'total',
        title: T.rangeTotal,
        align: 'right',
        headerClassName: 'sticky right-0 z-20 bg-surface-container-low/95 backdrop-blur-sm',
        cellClassName:
          'sticky right-0 z-10 bg-white/95 font-bold tabular-nums text-primary group-hover:bg-blue-50/50',
        render: (row) => row.total?.toLocaleString?.() ?? row.total,
      },
    ];
  }, [yearRange?.years]);

  const resultTabItems = useMemo(() => {
    if (!summary) return [];

    const tableNode = summary.breakdown?.length ? (
      <GlassDataTable
        columns={breakdownColumns}
        data={summary.breakdown}
        rowKey="region_name"
        minWidth={BREAKDOWN_MIN_WIDTH}
        maxBodyHeight={TABLE_SCROLL_Y}
        compact
        footerItemLabel="个区域"
        emptyIcon="map"
        emptyTitle="暂无分区明细"
        pagination={{
          pageSize:
            summary?.breakdown_level === 'province'
              ? 34
              : Math.min(100, Math.max(20, summary.breakdown?.length || 20)),
          pageSizeOptions: [20, 34, 50, 100],
          showSizeChanger: true,
        }}
      />
    ) : (
      <div className="space-y-3">
        {loadingBreakdown && summary.breakdown_level ? (
          <p className="flex items-center gap-1.5 text-xs text-primary">
            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
            {T.breakdownLoading}
          </p>
        ) : null}
        {summary.breakdown_pending && summary.breakdown_level && !loadingBreakdown ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-on-surface-variant">
            <span>{T.breakdownHint}</span>
            <button
              type="button"
              className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary/90"
              onClick={() => loadBreakdownOnly()}
            >
              {T.loadBreakdown}
            </button>
          </div>
        ) : null}
        <GlassDataTable
          columns={summaryColumns}
          data={summary.by_type || []}
          rowKey="std_type"
          minWidth={480}
          maxBodyHeight={TABLE_SCROLL_Y}
          compact
          footerItemLabel="个类别"
          emptyIcon="category"
          emptyTitle="暂无类别统计"
        />
      </div>
    );

    const yearNode = (
      <YearAnalysisPanel
        mode={yearAnalysisMode}
        onModeChange={setYearAnalysisMode}
        yearA={yearA}
        yearB={yearB}
        yearFrom={yearFrom}
        yearTo={yearTo}
        yearOptions={YEAR_OPTIONS}
        onYearAChange={setYearA}
        onYearBChange={setYearB}
        onYearFromChange={setYearFrom}
        onYearToChange={setYearTo}
        loadingCompare={loadingCompare}
        loadingRange={loadingRange}
        onCompare={loadCompare}
        onRange={loadYearRange}
        compare={compare}
        yearRange={yearRange}
        compareColumns={compareColumns}
        rangeTrendColumns={rangeTrendColumns}
        rangeTypeColumns={rangeTypeColumns}
        rangeDetailColumns={rangeDetailColumns}
        labels={T}
      />
    );

    return [
      {
        key: 'table',
        label: T.tabTable,
        children: <div className="pt-1">{tableNode}</div>,
      },
      {
        key: 'bar',
        label: T.tabBar,
        children: <AnalyticsCharts summary={summary} view="bar" />,
      },
      {
        key: 'pie',
        label: T.tabPie,
        children: <AnalyticsCharts summary={summary} view="pie" />,
      },
      {
        key: 'year',
        label: T.tabYear,
        children: yearNode,
      },
    ];
  }, [
    summary,
    compare,
    yearRange,
    breakdownColumns,
    compareColumns,
    rangeTrendColumns,
    rangeTypeColumns,
    rangeDetailColumns,
    yearA,
    yearB,
    yearFrom,
    yearTo,
    yearAnalysisMode,
    loadingCompare,
    loadingRange,
    loadingBreakdown,
    loadCompare,
    loadYearRange,
    loadBreakdownOnly,
  ]);

  return (
    <div className="page-content animate-fade-in-up min-w-0 w-full pb-8">
      <FilterPanel
        compact
        hint={
          <>
            将按以下条件统计：
            <span className="font-medium text-on-surface">{queryScopeHint}</span>
          </>
        }
        actions={
          <>
            <FilterPrimaryButton
              size="compact"
              loading={loadingSummary}
              disabled={loadingBreakdown}
              onClick={() => loadSummary()}
            >
              {T.querySummary}
            </FilterPrimaryButton>
            <FilterSecondaryButton
              size="compact"
              icon="download"
              disabled={!summary || exporting}
              onClick={handleExport}
            >
              {exporting ? '导出中...' : T.exportExcel}
            </FilterSecondaryButton>
          </>
        }
      >
        <div className="page-grid-cols-5">
          <FilterField compact label={T.province}>
            <FilterSelect
              allowClear
              placeholder={T.provincePh}
              options={provinces}
              value={province}
              onChange={handleProvinceChange}
            />
          </FilterField>
          <FilterField compact label={T.city}>
            <FilterSelect
              allowClear
              placeholder={T.allCitiesPh}
              disabled={!province}
              options={cities}
              value={city ?? null}
              onChange={handleCityChange}
            />
          </FilterField>
          <FilterField compact label={T.county}>
            <FilterSelect
              allowClear
              placeholder={T.allCountiesPh}
              disabled={!province || !city}
              options={counties}
              value={county ?? null}
              onChange={handleCountyChange}
            />
          </FilterField>
          <FilterField compact label={T.filterYear}>
            <FilterSelect
              options={YEAR_OPTIONS}
              value={filterYear}
              onChange={(y) => {
                setFilterYear(y);
                invalidateResults();
              }}
            />
          </FilterField>
          <FilterField compact label={T.stdCategory}>
            <FilterSelect
              allowClear
              mode="multiple"
              options={STD_SCOPE_OPTIONS}
              value={stdScope}
              onChange={(vals) => {
                setStdScope(vals || []);
                invalidateResults();
              }}
            />
          </FilterField>
        </div>
      </FilterPanel>

      {summary ? (
        <div className="glass-card page-card-pad-sm min-w-0 rounded-xl">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-on-surface">
              {T.regionStats}
              {summary.region?.label || T.nation}
            </span>
            {loadingBreakdown ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                {T.breakdownLoading}
              </span>
            ) : null}
          </div>
          <Tabs
            className="analytics-result-tabs"
            activeKey={resultTab}
            onChange={applyResultTab}
            destroyInactiveTabPane
            items={resultTabItems}
          />
        </div>
      ) : !bootstrapReady || loadingSummary ? (
        <LoadingPanel label="正在加载统计数据…" />
      ) : (
        <EmptyState
          icon="bar_chart"
          title="暂无统计数据"
          description="请设置筛选条件后点击「查询」获取区域统计结果"
        />
      )}
    </div>
  );
};

export default DataAnalysis;
