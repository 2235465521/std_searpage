/**
 * 将 Axios / DRF / 业务接口错误转为用户可读文案
 */
export function getApiErrorMessage(error, fallback = '请求失败，请稍后重试') {
  if (!error) return fallback;

  const data = error.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === 'object') {
    if (data.message) return String(data.message);
    if (data.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        const first = data.detail[0];
        return first?.msg || first?.message || String(first);
      }
    }
  }

  const status = error.response?.status;
  if (status === 401) return '登录已过期，请重新登录';
  if (status === 403) return '没有权限执行此操作';
  if (status === 404) return '请求的资源不存在';
  if (status >= 500) return '服务器繁忙，请稍后重试';

  const msg = error.message || '';
  if (msg && !/^Request failed with status code \d+$/i.test(msg)) {
    return msg;
  }

  return fallback;
}
