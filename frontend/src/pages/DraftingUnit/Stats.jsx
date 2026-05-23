import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Spin, message } from 'antd';
import ReactECharts from 'echarts-for-react';
import { downloadBlobResponse } from '../../api/analytics';
import { exportUnitsExcel, searchUnits } from '../../api/units';
import {
  AUTO_QUERY_PAGES,
  markPageAutoQueryDone,
  shouldPageAutoQueryOnFirstVisit,
} from '../../utils/sessionAutoQuery';

const T = {
  pageTitle: '起草单位数据统计',
  back: '返回查询',
  queryStats: '查询统计',
  exportExcel: '导出 Excel',
  exportOk: '导出成功',
  exportFail: '导出失败',
  loadFail: '加载统计失败',
  totalStandards: '命中标准',
  totalUnits: '命中起草单位',
  rankQueryLabel: '排位查询',
  regionDistPrefix: '按',
  regionDistSuffix: '分布',
  noData: '暂无数据',
};

const CURRENT_YEAR = new Date().getFullYear();
const AUTO_QUERY_PAGE = AUTO_QUERY_PAGES.UNITS_STATS;

const LEGACY_RANK_MAP = {
  eq1: '1',
  range_2_4: '2-3',
  gte4: '>=4',
};
const STD_SCOPE_ALIAS = { GB: '00', HB: '01', DB: '02', TB: '03', '00': '00', '01': '01', '02': '02', '03': '03' };

const normalizeRankInput = (value) => (value || '').trim();

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
    std_scope: parsed.std_scope.length
      ? parsed.std_scope
      : (hasScopeInUrl || hasSearchedFlag ? [] : ['00']),
  };
};

const calcChartHeight = (rows = []) => {
  const count = rows.length || 1;
  return Math.min(560, Math.max(220, count * 28 + 90));
};

const makeHorizontalBarOption = ({ title, rows, nameKey = 'name', valueKey = 'count' }) => ({
  title: {
    text: title,
    left: 'left',
    textStyle: { fontSize: 14, fontWeight: 600 },
  },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 120, right: 24, top: 44, bottom: 24 },
  xAxis: {
    type: 'value',
    axisLabel: { color: '#64748b' },
    splitLine: { lineStyle: { color: '#e2e8f0' } },
  },
  yAxis: {
    type: 'category',
    data: rows.map((r) => r[nameKey]),
    axisLabel: { color: '#334155' },
  },
  series: [
    {
      type: 'bar',
      data: rows.map((r) => r[valueKey] || 0),
      barMaxWidth: 18,
      itemStyle: { color: '#4f46e5', borderRadius: [0, 8, 8, 0] },
      label: { show: true, position: 'right', color: '#334155' },
    },
  ],
});

const DraftingUnitStats = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filters = useMemo(() => parseUrlFiltersWithDefault(searchParams), [searchParams]);
  const queryParams = useMemo(
    () => ({
      year: filters.year ?? CURRENT_YEAR,
      rank_query: filters.rank_query,
      ...(filters.std_scope?.length ? { std_scope: filters.std_scope.join(',') } : {}),
      ...(filters.province ? { province: filters.province } : {}),
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.county ? { county: filters.county } : {}),
    }),
    [filters],
  );

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [queried, setQueried] = useState(false);
  const shouldAutoQueryRef = useRef(shouldPageAutoQueryOnFirstVisit(AUTO_QUERY_PAGE));
  const regionRows = analysis?.region_breakdown?.rows || [];

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchUnits({ page: 1, size: 1, include_analysis: 1, ...queryParams });
      setAnalysis(data?.analysis || null);
      setQueried(true);
      markPageAutoQueryDone(AUTO_QUERY_PAGE);
    } catch (e) {
      message.error(e.message || T.loadFail);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    if (!shouldAutoQueryRef.current) return;
    shouldAutoQueryRef.current = false;
    loadStats();
  }, [loadStats]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportUnitsExcel(queryParams);
      downloadBlobResponse(response, '起草单位查询.xlsx');
      message.success(T.exportOk);
    } catch (e) {
      message.error(e.message || T.exportFail);
    } finally {
      setExporting(false);
    }
  };

  const returnSearch = location.state?.returnSearch || searchParams.toString();
  const returnPath = `/units?${returnSearch}`;

  return (
    <div className="animate-fade-in-up max-w-6xl pb-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-headline font-bold text-[1.5rem] text-on-surface">{T.pageTitle}</h2>
        <div className="flex gap-2">
          <Button size="small" onClick={() => navigate(returnPath, { state: { fromStats: true } })}>
            {T.back}
          </Button>
          <Button size="small" loading={loading} onClick={loadStats}>
            {T.queryStats}
          </Button>
          <Button size="small" loading={exporting} onClick={handleExport} disabled={loading || !analysis}>
            {T.exportExcel}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-10 flex items-center justify-center">
          <Spin />
        </div>
      ) : analysis ? (
        <div className="glass-card rounded-xl p-4 mb-4 bg-white/95">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs text-on-surface-variant">{T.totalStandards}</div>
              <div className="text-lg font-semibold text-primary">{analysis?.total ?? 0}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs text-on-surface-variant">{T.totalUnits}</div>
              <div className="text-lg font-semibold text-primary">{analysis?.unit_total ?? 0}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs text-on-surface-variant">{T.rankQueryLabel}</div>
              <div className="text-lg font-semibold text-primary">{analysis?.rank_filter || filters.rank_query}</div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50/70 p-2">
            {regionRows.length ? (
              <ReactECharts
                option={makeHorizontalBarOption({
                  title: `${T.regionDistPrefix}${analysis?.region_breakdown?.label || '区域'}${T.regionDistSuffix}`,
                  rows: regionRows,
                })}
                style={{ height: calcChartHeight(regionRows), width: '100%' }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div className="text-xs text-on-surface-variant p-2">{T.noData}</div>
            )}
          </div>
        </div>
      ) : queried ? (
        <div className="glass-card rounded-xl p-6 text-sm text-on-surface-variant bg-white/95">{T.noData}</div>
      ) : null}
    </div>
  );
};

export default DraftingUnitStats;
