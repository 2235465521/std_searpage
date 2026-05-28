import React, { useState } from 'react';
import { Select } from 'antd';
import AnalyticsCharts from './AnalyticsCharts';
import EmptyState from '../../../components/ui/EmptyState';
import GlassDataTable from '../../../components/ui/GlassDataTable';
import { FilterPrimaryButton } from '../../../components/ui/FilterPanel';
const YEAR_SELECT_CLASS = 'w-full min-w-[6.5rem] max-w-[7.5rem]';

function YearField({ label, value, options, onChange }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      <Select
        className={YEAR_SELECT_CLASS}
        size="middle"
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function YearFilterBar({ children, action }) {
  return (
    <div className="page-year-toolbar">
      <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-3 sm:gap-x-4 sm:px-4">
        {children}
      </div>
      <div className="page-toolbar-end flex shrink-0 justify-end">
        {action}
      </div>
    </div>
  );
}

function YearConnector({ icon = 'arrow_forward' }) {
  return (
    <div className="page-year-connector hidden shrink-0 self-end pb-2 text-slate-300">
      <span className="material-symbols-outlined text-xl leading-none">{icon}</span>
    </div>
  );
}

function ModeSwitch({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/70">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              active
                ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-base leading-none">{opt.icon}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MetricCard({ icon, label, value, sub, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-50/90 to-white border-blue-100/80 text-blue-600',
    emerald: 'from-emerald-50/90 to-white border-emerald-100/80 text-emerald-600',
    amber: 'from-amber-50/90 to-white border-amber-100/80 text-amber-600',
    slate: 'from-slate-50/90 to-white border-slate-100 text-slate-600',
    rose: 'from-rose-50/90 to-white border-rose-100/80 text-rose-600',
  };
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm',
        tones[tone] || tones.blue,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-slate-800">{value}</p>
          {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
        </div>
        <span
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-black/5',
            tone === 'blue' ? 'text-blue-600' : '',
            tone === 'emerald' ? 'text-emerald-600' : '',
            tone === 'amber' ? 'text-amber-600' : '',
            tone === 'rose' ? 'text-rose-600' : 'text-slate-600',
          ].join(' ')}
        >
          <span className="material-symbols-outlined text-xl leading-none">{icon}</span>
        </span>
      </div>
    </div>
  );
}

function FilterShell({ title, hint, children, action }) {
  return (
    <div className="page-card-pad rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/20 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800">{title}</h4>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function PanelSection({ title, subtitle, icon, children, className = '' }) {
  return (
    <section
      className={[
        'min-w-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)]',
        className,
      ].join(' ')}
    >
      <header className="page-panel-header flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-white px-4 py-3">
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-lg leading-none">{icon}</span>
          </span>
        ) : null}
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-800">{title}</h4>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </header>
      <div className="page-card-pad-sm">{children}</div>
    </section>
  );
}

function SegmentedTabs({ value, onChange, items }) {
  return (
    <div className="mb-3 inline-flex flex-wrap gap-1 rounded-lg bg-slate-100/80 p-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            value === item.key
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          ].join(' ')}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ComparePanel({
  yearA,
  yearB,
  yearOptions,
  onYearAChange,
  onYearBChange,
  loading,
  onAnalyze,
  compare,
  compareColumns,
  labels,
}) {
  const [chartView, setChartView] = useState('bar');
  const growthPct = compare?.total_a
    ? (((compare.total_b - compare.total_a) / compare.total_a) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-5">
      <FilterShell
        title={labels.compareTitle}
        hint={labels.compareHint}
      >
        <YearFilterBar
          action={(
            <FilterPrimaryButton
              size="compact"
              icon="compare_arrows"
              loading={loading}
              onClick={onAnalyze}
            >
              {labels.compareBtn}
            </FilterPrimaryButton>
          )}
        >
          <YearField label={labels.yearA} value={yearA} options={yearOptions} onChange={onYearAChange} />
          <YearConnector icon="arrow_forward" />
          <YearField label={labels.yearB} value={yearB} options={yearOptions} onChange={onYearBChange} />
        </YearFilterBar>
      </FilterShell>

      {!compare ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <EmptyState
            icon="compare_arrows"
            title="选择两个年份开始对比"
            description="将按当前筛选的行政区划与标准类别，统计各类型发布数量及增减变化"
            action={
              <FilterPrimaryButton loading={loading} onClick={onAnalyze}>
                {labels.compareBtn}
              </FilterPrimaryButton>
            }
          />
        </div>
      ) : (
        <>
          <div className="page-grid-cols-3">
            <MetricCard
              icon="calendar_today"
              label={`${compare.year_a} ${labels.yearPublish}`}
              value={(compare.total_a ?? 0).toLocaleString()}
              sub="基准年发布总量"
              tone="blue"
            />
            <MetricCard
              icon="event"
              label={`${compare.year_b} ${labels.yearPublish}`}
              value={(compare.total_b ?? 0).toLocaleString()}
              sub="对比年发布总量"
              tone="amber"
            />
            <MetricCard
              icon="insights"
              label={labels.totalChange.replace('：', '')}
              value={
                compare.total_delta > 0
                  ? `+${compare.total_delta.toLocaleString()}`
                  : compare.total_delta.toLocaleString()
              }
              sub={
                growthPct != null
                  ? `同比 ${Number(growthPct) > 0 ? '+' : ''}${growthPct}% · ${labels.totalChangeSuffix}`
                  : undefined
              }
              tone={compare.total_delta > 0 ? 'emerald' : compare.total_delta < 0 ? 'rose' : 'slate'}
            />
          </div>

          <PanelSection
            title="类别对比明细"
            subtitle={`${compare.year_a} → ${compare.year_b} · 共 ${compare.items?.length ?? 0} 个类别`}
            icon="table_chart"
          >
            <GlassDataTable
              embedded
              compact
              columns={compareColumns}
              data={compare.items || []}
              rowKey="std_type"
              minWidth={640}
              maxBodyHeight={280}
              footerItemLabel="个类别"
              emptyIcon="compare_arrows"
              emptyTitle="暂无对比明细"
            />          </PanelSection>

          <PanelSection title="可视化分析" subtitle="柱状对比与结构占比" icon="bar_chart">
            <SegmentedTabs
              value={chartView}
              onChange={setChartView}
              items={[
                { key: 'bar', label: labels.tabBar },
                { key: 'pie', label: labels.tabPie },
              ]}
            />
            <AnalyticsCharts
              compare={compare}
              view={chartView === 'bar' ? 'compare-bar' : 'compare-pie'}
              embedded
            />
          </PanelSection>
        </>
      )}
    </div>
  );
}

function RangePanel({
  yearFrom,
  yearTo,
  yearOptions,
  onYearFromChange,
  onYearToChange,
  loading,
  onAnalyze,
  yearRange,
  rangeTrendColumns,
  rangeTypeColumns,
  rangeDetailColumns,
  labels,
}) {
  const [dataTab, setDataTab] = useState('trend');
  const [chartView, setChartView] = useState('trend');

  const dataTabs = [
    { key: 'trend', label: labels.yearTrend },
    { key: 'type', label: labels.stdCategory },
    { key: 'matrix', label: '类别 × 年份' },
  ];

  const chartTabs = [
    { key: 'trend', label: '年度趋势' },
    { key: 'stack', label: '堆叠分布' },
    { key: 'pie', label: '各年占比' },
  ];

  return (
    <div className="space-y-5">
      <FilterShell
        title={labels.rangeTitle}
        hint={labels.rangeHint}
      >
        <YearFilterBar
          action={(
            <FilterPrimaryButton
              size="compact"
              icon="query_stats"
              loading={loading}
              onClick={onAnalyze}
            >
              {labels.rangeBtn}
            </FilterPrimaryButton>
          )}
        >
          <YearField label={labels.yearFrom} value={yearFrom} options={yearOptions} onChange={onYearFromChange} />
          <YearConnector icon="more_horiz" />
          <YearField label={labels.yearTo} value={yearTo} options={yearOptions} onChange={onYearToChange} />
        </YearFilterBar>
      </FilterShell>

      {!yearRange ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <EmptyState
            icon="date_range"
            title="选择起止年份进行段内统计"
            description="汇总年段内发布总量、年均水平，并展示年度趋势与类别结构"
            action={
              <FilterPrimaryButton loading={loading} onClick={onAnalyze}>
                {labels.rangeBtn}
              </FilterPrimaryButton>
            }
          />
        </div>
      ) : (
        <>
          <div className="page-grid-cols-3">
            <MetricCard
              icon="inventory_2"
              label={labels.rangeTotal}
              value={(yearRange.total ?? 0).toLocaleString()}
              sub={`${yearRange.year_from}—${yearRange.year_to} 累计`}
              tone="blue"
            />
            <MetricCard
              icon="speed"
              label={labels.rangeAvg}
              value={yearRange.avg_per_year ?? 0}
              sub="段内年均发布量"
              tone="emerald"
            />
            <MetricCard
              icon="timeline"
              label={labels.rangeSpan}
              value={`${yearRange.year_count} 年`}
              sub={`${yearRange.year_from} — ${yearRange.year_to}`}
              tone="amber"
            />
          </div>

          <PanelSection
            title="数据明细"
            subtitle="按年度、类别及交叉维度查看"
            icon="table_rows"
          >
            <SegmentedTabs value={dataTab} onChange={setDataTab} items={dataTabs} />
            {dataTab === 'trend' ? (
              <GlassDataTable
                embedded
                compact
                columns={rangeTrendColumns}
                data={yearRange.by_year || []}
                rowKey="year"
                minWidth={Math.max(640, 180 + (yearRange.years?.length || 8) * 88)}
                maxBodyHeight={260}
                footerItemLabel="个年份"
                emptyIcon="timeline"
                emptyTitle="暂无年度趋势数据"
              />
            ) : null}
            {dataTab === 'type' ? (
              <GlassDataTable
                embedded
                compact
                columns={rangeTypeColumns}
                data={yearRange.by_type || []}
                rowKey="std_type"
                minWidth={560}
                maxBodyHeight={260}
                footerItemLabel="个类别"
                emptyIcon="category"
                emptyTitle="暂无类别统计数据"
              />
            ) : null}
            {dataTab === 'matrix' ? (
              <GlassDataTable
                embedded
                compact
                columns={rangeDetailColumns}
                data={yearRange.items || []}
                rowKey="std_type"
                minWidth={Math.max(640, (yearRange.years?.length || 0) * 96 + 220)}
                maxBodyHeight={260}
                footerItemLabel="个类别"
                emptyIcon="grid_on"
                emptyTitle="暂无交叉明细"
              />
            ) : null}          </PanelSection>

          <PanelSection title="可视化分析" subtitle="趋势、堆叠与占比多角度展示" icon="monitoring">
            <SegmentedTabs value={chartView} onChange={setChartView} items={chartTabs} />
            {chartView === 'trend' ? (
              <AnalyticsCharts yearRange={yearRange} view="range-trend" embedded />
            ) : null}
            {chartView === 'stack' ? (
              <AnalyticsCharts yearRange={yearRange} view="range-stack" embedded />
            ) : null}
            {chartView === 'pie' ? (
              <AnalyticsCharts yearRange={yearRange} view="range-pie" embedded />
            ) : null}
          </PanelSection>
        </>
      )}
    </div>
  );
}

export default function YearAnalysisPanel({
  mode,
  onModeChange,
  yearA,
  yearB,
  yearFrom,
  yearTo,
  yearOptions,
  onYearAChange,
  onYearBChange,
  onYearFromChange,
  onYearToChange,
  loadingCompare,
  loadingRange,
  onCompare,
  onRange,
  compare,
  yearRange,
  compareColumns,
  rangeTrendColumns,
  rangeTypeColumns,
  rangeDetailColumns,
  labels,
}) {
  return (
    <div className="year-analysis-panel space-y-5 pt-1">
      <ModeSwitch
        value={mode}
        onChange={onModeChange}
        options={[
          { key: 'compare', label: labels.yearModeCompare, icon: 'compare_arrows' },
          { key: 'range', label: labels.yearModeRange, icon: 'date_range' },
        ]}
      />

      {mode === 'compare' ? (
        <ComparePanel
          yearA={yearA}
          yearB={yearB}
          yearOptions={yearOptions}
          onYearAChange={onYearAChange}
          onYearBChange={onYearBChange}
          loading={loadingCompare}
          onAnalyze={onCompare}
          compare={compare}
          compareColumns={compareColumns}
          labels={labels}
        />
      ) : (
        <RangePanel
          yearFrom={yearFrom}
          yearTo={yearTo}
          yearOptions={yearOptions}
          onYearFromChange={onYearFromChange}
          onYearToChange={onYearToChange}
          loading={loadingRange}
          onAnalyze={onRange}
          yearRange={yearRange}
          rangeTrendColumns={rangeTrendColumns}
          rangeTypeColumns={rangeTypeColumns}
          rangeDetailColumns={rangeDetailColumns}
          labels={labels}
        />
      )}
    </div>
  );
}
