const CHART_COLORS = [
  '#0058bc',
  '#0070eb',
  '#3b82f6',
  '#60a5fa',
  '#10b981',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

export { CHART_COLORS };

/** @returns {{ bar, pie, list, barTitle, pieTitle, horizontal } | null} */
export function buildSummaryChartOptions(summary) {
  if (!summary) return null;

  if (summary.breakdown?.length) {
    const sorted = summary.breakdown
      .map((row) => ({
        name: row.region_name,
        value: row.total || 0,
      }))
      .sort((a, b) => b.value - a.value);

    const isProvince = summary.breakdown_level === 'province';

    return {
      barTitle: isProvince
        ? '\u5404\u7701\u6807\u51c6\u6570\u91cf\uff08\u67f1\u72b6\u56fe\uff09'
        : '\u5404\u533a\u57df\u6807\u51c6\u6570\u91cf\uff08\u67f1\u72b6\u56fe\uff09',
      pieTitle: isProvince
        ? '\u5404\u7701\u6807\u51c6\u5360\u6bd4\uff08\u997c\u56fe\uff09'
        : '\u5404\u533a\u57df\u6807\u51c6\u5360\u6bd4\uff08\u997c\u56fe\uff09',
      horizontal: sorted.length > 8,
      bar: {
        categories: sorted.map((d) => d.name),
        values: sorted.map((d) => d.value),
      },
      pie: sorted,
      list: sorted,
    };
  }

  const typeItems = (summary.by_type || [])
    .map((row) => ({
      name: row.label || row.std_type,
      value: row.count || 0,
    }))
    .filter((d) => d.value > 0);

  if (!typeItems.length) return null;

  return {
    barTitle: '\u5404\u7c7b\u522b\u6807\u51c6\u6570\u91cf\uff08\u67f1\u72b6\u56fe\uff09',
    pieTitle: '\u6807\u51c6\u7c7b\u522b\u5360\u6bd4\uff08\u997c\u56fe\uff09',
    horizontal: false,
    bar: {
      categories: typeItems.map((d) => d.name),
      values: typeItems.map((d) => d.value),
    },
    pie: typeItems,
    list: typeItems,
  };
}

/** @returns {{ bar, pie, barTitle, pieTitle } | null} */
export function buildCompareChartOptions(compare) {
  if (!compare?.items?.length) return null;

  const categories = compare.items.map((row) => row.label || row.std_type);
  const countA = compare.items.map((row) => row.count_a || 0);
  const countB = compare.items.map((row) => row.count_b || 0);

  const pieItems = compare.items
    .map((row) => ({
      name: row.label || row.std_type,
      value: row.count_b || 0,
    }))
    .filter((d) => d.value > 0);

  return {
    barTitle: `\u5e74\u5ea6\u53d1\u5e03\u91cf\u5bf9\u6bd4\uff08${compare.year_a} vs ${compare.year_b}\uff09`,
    pieTitle: `${compare.year_b} \u5e74\u53d1\u5e03\u7c7b\u522b\u5360\u6bd4\uff08\u997c\u56fe\uff09`,
    horizontal: false,
    bar: {
      categories,
      series: [
        { name: `${compare.year_a}\u5e74`, data: countA },
        { name: `${compare.year_b}\u5e74`, data: countB },
      ],
    },
    pie: pieItems,
    list: pieItems,
  };
}

/** @returns {{ trend, stack, pie, trendTitle, stackTitle, pieTitle } | null} */
export function buildYearRangeChartOptions(rangeStats) {
  if (!rangeStats?.by_year?.length) return null;

  const yf = rangeStats.year_from;
  const yt = rangeStats.year_to;
  const categories = rangeStats.years.map((y) => `${y}年`);
  const totals = rangeStats.by_year.map((row) => row.total || 0);

  const pieItems = rangeStats.by_year
    .map((row) => ({
      name: `${row.year}年`,
      year: row.year,
      value: row.total || 0,
    }))
    .filter((d) => d.value > 0);

  const stackSeries = (rangeStats.items || [])
    .filter((row) => row.total > 0)
    .map((row) => ({
      name: row.label || row.std_type,
      data: rangeStats.years.map((y) => row.year_counts?.[y] ?? row.year_counts?.[String(y)] ?? 0),
    }));

  return {
    trendTitle: `${yf}—${yt} 年度发布趋势`,
    stackTitle: `${yf}—${yt} 各类别年度发布量`,
    pieTitle: `${yf}—${yt} 各年发布占比`,
    trend: {
      categories,
      values: totals,
    },
    stack: {
      categories,
      series: stackSeries,
    },
    pie: pieItems,
    list: pieItems,
  };
}

export function barChartHeight(categoryCount, horizontal) {
  if (!horizontal) return 300;
  return Math.min(480, Math.max(300, categoryCount * 22 + 64));
}

export function makeBarOption({ categories, values, series, title, horizontal = false, stacked = false }) {
  const isGrouped = series?.length;

  if (horizontal) {
    return {
      color: CHART_COLORS,
      title: title
        ? { text: title, left: 'center', textStyle: { fontSize: 14, fontWeight: 600 } }
        : undefined,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v) => (v != null ? Number(v).toLocaleString() : v),
      },
      grid: { left: 108, right: 32, top: title ? 52 : 28, bottom: 28 },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: (v) => (v >= 10000 ? `${v / 10000}\u4e07` : v) },
      },
      yAxis: {
        type: 'category',
        data: categories,
        inverse: true,
        axisLabel: { width: 96, overflow: 'truncate', fontSize: 11 },
      },
      series: isGrouped
        ? series.map((s) => ({
            name: s.name,
            type: 'bar',
            data: s.data,
            barMaxWidth: 20,
            stack: stacked ? 'total' : undefined,
          }))
        : [
            {
              type: 'bar',
              data: values,
              barMaxWidth: 22,
              itemStyle: { borderRadius: [0, 4, 4, 0] },
            },
          ],
      legend: isGrouped ? { top: title ? 28 : 4, right: 16 } : undefined,
    };
  }

  return {
    color: CHART_COLORS,
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14, fontWeight: 600 } } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => (v != null ? Number(v).toLocaleString() : v),
    },
    grid: { left: 48, right: 24, top: title ? 48 : 24, bottom: categories.length > 8 ? 72 : 40 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        interval: 0,
        rotate: categories.length > 6 ? 35 : 0,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v) => (v >= 10000 ? `${v / 10000}\u4e07` : v) },
    },
    series: isGrouped
      ? series.map((s) => ({
          name: s.name,
          type: 'bar',
          data: s.data,
          barMaxWidth: stacked ? 36 : 28,
          stack: stacked ? 'total' : undefined,
        }))
      : [
          {
            type: 'bar',
            data: values,
            barMaxWidth: 36,
            itemStyle: { borderRadius: [4, 4, 0, 0] },
          },
        ],
    legend: isGrouped ? { top: title ? 28 : 4, right: 16 } : undefined,
  };
}

export function pieChartHeight(sliceCount) {
  return sliceCount > 12 ? 360 : 300;
}

export function parseLabelYear(name) {
  const match = String(name || '').match(/(\d{4})/);
  return match ? Number(match[1]) : 0;
}

export function sortPieData(data, sortBy = 'value') {
  const items = [...(data || [])];
  if (sortBy === 'year') {
    return items.sort((a, b) => {
      const yearA = a.year ?? parseLabelYear(a.name);
      const yearB = b.year ?? parseLabelYear(b.name);
      return yearA - yearB;
    });
  }
  if (sortBy === 'none') return items;
  return items.sort((a, b) => b.value - a.value);
}

export function makePieOption({ data, centerTotal, sortBy = 'value' }) {
  const sorted = sortPieData(data, sortBy);
  const pieData = sorted.filter((d) => d.value > 0);
  const total = centerTotal ?? pieData.reduce((sum, item) => sum + item.value, 0);
  const sliceCount = pieData.length;

  if (!pieData.length) {
    return {
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: '\u6682\u65e0\u6570\u636e', fill: '#94a3b8', fontSize: 14 },
      },
    };
  }

  const manySlices = sliceCount > 10;
  const innerRadius = manySlices ? '40%' : '48%';
  const outerRadius = manySlices ? '76%' : '82%';

  return {
    color: CHART_COLORS,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#334155', fontSize: 13 },
      extraCssText: 'box-shadow: 0 4px 16px rgba(0,88,188,0.08); border-radius: 8px;',
      formatter: (params) => {
        const val = Number(params.value || 0).toLocaleString();
        const pct = Number(params.percent || 0).toFixed(1);
        return (
          `<div style="font-weight:600;margin-bottom:6px;color:#191c1d">${params.name}</div>` +
          `<div>\u6570\u91cf\uff1a<b style="color:#0058bc">${val}</b> \u9879</div>` +
          `<div>\u5360\u6bd4\uff1a<b style="color:#0058bc">${pct}%</b></div>`
        );
      },
    },
    legend: { show: false },
    series: [
      {
        type: 'pie',
        radius: [innerRadius, outerRadius],
        center: ['50%', '50%'],
        minAngle: manySlices ? 2 : 3,
        padAngle: manySlices ? 0.5 : 1,
        itemStyle: {
          borderRadius: manySlices ? 2 : 6,
          borderColor: '#fff',
          borderWidth: 1,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            formatter: (params) =>
              `${params.name}\n${Number(params.value).toLocaleString()} (${params.percent.toFixed(1)}%)`,
          },
        },
        data: pieData,
      },
    ],
    graphic: manySlices
      ? undefined
      : [
          {
            type: 'group',
            left: '50%',
            top: '50%',
            z: 100,
            children: [
              {
                type: 'text',
                style: {
                  text: total.toLocaleString(),
                  textAlign: 'center',
                  x: 0,
                  y: -10,
                  fill: '#0058bc',
                  fontSize: 18,
                  fontWeight: 700,
                },
              },
              {
                type: 'text',
                style: {
                  text: '\u603b\u8ba1',
                  textAlign: 'center',
                  x: 0,
                  y: 14,
                  fill: '#64748b',
                  fontSize: 11,
                },
              },
            ],
          },
        ],
  };
}
