import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  CHART_COLORS,
  barChartHeight,
  buildCompareChartOptions,
  buildSummaryChartOptions,
  buildYearRangeChartOptions,
  makeBarOption,
  makePieOption,
  pieChartHeight,
  sortPieData,
} from '../chartData';
import ChartCard, { ChartDetailsToggle, ChartRankList } from '../../../components/ui/ChartCard';
import EmptyState from '../../../components/ui/EmptyState';

const ChartPanel = ({ option, height = 320 }) => (
  <div className="overflow-auto rounded-lg border border-slate-100/80 bg-white/60" style={{ maxHeight: height + 24 }}>
    <ReactECharts option={option} style={{ height, width: '100%', minHeight: height }} notMerge lazyUpdate />
  </div>
);

const PieRankList = ({ data, scopeTotal, sortBy = 'value' }) => {
  const sorted = useMemo(() => sortPieData(data, sortBy), [data, sortBy]);
  const sumListed = sorted.reduce((sum, item) => sum + item.value, 0);
  const denom = scopeTotal > 0 ? scopeTotal : sumListed;
  if (!sorted.length) {
    return (
      <EmptyState
        icon="pie_chart"
        title="暂无图表数据"
        description="当前筛选条件下没有可展示的分类统计"
      />
    );
  }

  return (
    <ul className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
      {sorted.map((item, index) => {
        const pct = denom > 0 ? ((item.value / denom) * 100).toFixed(1) : '0.0';
        const color = CHART_COLORS[index % CHART_COLORS.length];
        return (
          <li key={item.name} className="flex items-center gap-2 py-0.5 text-sm">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-on-surface" title={item.name}>
              {item.name}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-on-surface-variant">
              {item.value.toLocaleString()}
            </span>
            <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums text-primary">
              {pct}%
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/** @param {{ summary?: object, compare?: object, yearRange?: object, view: string, embedded?: boolean }} */
const AnalyticsCharts = ({ summary, compare, yearRange, view, embedded = false }) => {
  const summaryCharts = useMemo(() => buildSummaryChartOptions(summary), [summary]);
  const compareCharts = useMemo(() => buildCompareChartOptions(compare), [compare]);
  const rangeCharts = useMemo(() => buildYearRangeChartOptions(yearRange), [yearRange]);
  const scopeTotal = summary?.total ?? 0;
  const rangeTotal = yearRange?.total ?? 0;

  const chartShell = (title, subtitle, children, footer) => {
    if (embedded) {
      return (
        <div className="rounded-xl border border-slate-100/80 bg-gradient-to-b from-white to-slate-50/30 p-3">
          {children}
        </div>
      );
    }
    return (
      <ChartCard title={title} subtitle={subtitle} footer={footer}>
        {children}
      </ChartCard>
    );
  };

  if (view === 'bar' && summaryCharts) {
    const h = Math.min(
      480,
      barChartHeight(summaryCharts.bar.categories?.length || 0, summaryCharts.horizontal),
    );
    return (
      <ChartCard
        title={summaryCharts.barTitle}
        subtitle={
          summaryCharts.list?.length
            ? `共 ${summaryCharts.list.length} 个区域`
            : undefined
        }
      >
        <ChartPanel
          option={makeBarOption({
            categories: summaryCharts.bar.categories,
            values: summaryCharts.bar.values,
            series: summaryCharts.bar.series,
            horizontal: summaryCharts.horizontal,
          })}
          height={h}
        />
      </ChartCard>
    );
  }

  if (view === 'pie' && summaryCharts) {
    const h = Math.max(260, pieChartHeight(summaryCharts.pie?.filter((d) => d.value > 0).length || 0) - 40);
    return (
      <ChartCard
        title={summaryCharts.pieTitle}
        subtitle={`共 ${summaryCharts.list?.length || 0} 个区域 · 合计 ${scopeTotal.toLocaleString()} 项`}
      >
        <div className="page-chart-row min-w-0">
          <div className="page-chart-main min-w-0">
            <ChartPanel
              option={makePieOption({ data: summaryCharts.pie, centerTotal: scopeTotal })}
              height={h}
            />
          </div>
          <div className="page-chart-side min-w-0">
            <ChartRankList title={`区域明细（${summaryCharts.list?.length || 0}）`}>
              <PieRankList data={summaryCharts.list} scopeTotal={scopeTotal} />
            </ChartRankList>
          </div>
        </div>
      </ChartCard>
    );
  }

  if (view === 'compare-bar' && compareCharts) {
    return chartShell(
      compareCharts.barTitle,
      '年度对比 · 柱状图',
      (
        <ChartPanel
          option={makeBarOption({
            categories: compareCharts.bar.categories,
            series: compareCharts.bar.series,
            horizontal: compareCharts.horizontal,
          })}
          height={300}
        />
      ),
    );
  }

  if (view === 'compare-pie' && compareCharts) {
    return chartShell(
      compareCharts.pieTitle,
      '年度对比 · 结构占比',
      (
        <ChartPanel
          option={makePieOption({ data: compareCharts.pie })}
          height={pieChartHeight(compareCharts.pie?.length || 0)}
        />
      ),
      embedded ? null : (
        <ChartDetailsToggle label="查看类别明细">
          <ChartRankList>
            <PieRankList data={compareCharts.list} />
          </ChartRankList>
        </ChartDetailsToggle>
      ),
    );
  }

  if (view === 'range-trend' && rangeCharts) {
    return chartShell(
      rangeCharts.trendTitle,
      '年段统计 · 年度趋势',
      (
        <ChartPanel
          option={makeBarOption({
            categories: rangeCharts.trend.categories,
            values: rangeCharts.trend.values,
          })}
          height={300}
        />
      ),
    );
  }

  if (view === 'range-stack' && rangeCharts?.stack?.series?.length) {
    return chartShell(
      rangeCharts.stackTitle,
      '年段统计 · 类别分布',
      (
        <ChartPanel
          option={makeBarOption({
            categories: rangeCharts.stack.categories,
            series: rangeCharts.stack.series,
            stacked: true,
          })}
          height={320}
        />
      ),
    );
  }

  if (view === 'range-pie' && rangeCharts) {
    const h = Math.max(260, pieChartHeight(rangeCharts.pie?.length || 0) - 40);
    const piePanel = (
      <ChartPanel
        option={makePieOption({ data: rangeCharts.pie, centerTotal: rangeTotal, sortBy: 'year' })}
        height={h}
      />
    );
    const rankPanel = (
      <ChartRankList title={`各年明细（${rangeCharts.list?.length || 0}）`}>
        <PieRankList data={rangeCharts.list} scopeTotal={rangeTotal} sortBy="year" />
      </ChartRankList>
    );

    return chartShell(
      rangeCharts.pieTitle,
      `段内合计 ${rangeTotal.toLocaleString()} 项 · 按年拆分`,
      embedded ? (
        <div className="page-chart-row min-w-0">
          <div className="page-chart-main min-w-0">{piePanel}</div>
          <div className="page-chart-side min-w-0">{rankPanel}</div>
        </div>
      ) : (
        piePanel
      ),
      embedded ? null : (
        <ChartDetailsToggle label="查看各年明细">
          {rankPanel}
        </ChartDetailsToggle>
      ),
    );
  }

  return (
    <EmptyState
      icon="bar_chart"
      title="暂无图表数据"
      description="请先完成统计查询后再查看图表"
    />
  );
};

export default AnalyticsCharts;
