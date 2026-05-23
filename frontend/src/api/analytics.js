import request from './axios';

export const fetchProvinces = () =>
  request({ url: '/analytics/regions', method: 'get' });

export const fetchCities = (province) =>
  request({ url: '/analytics/regions', method: 'get', params: { province } });

export const fetchCounties = (province, city) =>
  request({ url: '/analytics/regions', method: 'get', params: { province, city } });

export const fetchRegionalSummary = (params) =>
  request({ url: '/analytics/summary', method: 'get', params, timeout: 120000 });

export const fetchYearCompare = (params) =>
  request({ url: '/analytics/year-compare', method: 'get', params });

export const fetchYearRangeStats = (params) =>
  request({ url: '/analytics/year-range', method: 'get', params });

export const exportAnalyticsExcel = (params) =>
  request({
    url: '/analytics/export',
    method: 'get',
    params,
    responseType: 'blob',
  });

export const downloadBlobResponse = (response, fallbackName = '标准数据分析.xlsx') => {
  const disposition = response.headers?.['content-disposition'] || '';
  let filename = fallbackName;
  const match = disposition.match(/filename\*=UTF-8''(.+)/i);
  if (match?.[1]) {
    try {
      filename = decodeURIComponent(match[1]);
    } catch {
      /* use fallback */
    }
  }
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
