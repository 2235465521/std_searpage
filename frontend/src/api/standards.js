import request from './axios';

// ========================
// 认证与用户相关
// ========================
export const login = (data) => {
  return request({
    url: '/auth/login',
    method: 'post',
    data, // { username, password }
  });
};

export const selfRegister = (data) => {
  return request({
    url: '/auth/self-register',
    method: 'post',
    data, // { username }
  });
};

// ========================
// 标准检索与详情
// ========================
export const searchStandards = (params) => {
  return request({
    url: '/standards/search',
    method: 'get',
    params, // { keyword, std_type, status, page, size, skip_count }
  });
};

/** skip_count 时后端 total 可能为 -1，需用已有总数兜底 */
export const resolveListTotal = (apiTotal, fallbackTotal) => {
  if (typeof apiTotal === 'number' && apiTotal >= 0) return apiTotal;
  if (typeof fallbackTotal === 'number' && fallbackTotal >= 0) return fallbackTotal;
  return 0;
};

/** 根据总数将页码限制在有效范围内，避免 URL 页码与 total 不一致时出现 27/1 */
export const normalizePagination = (requestedPage, pageSize, total) => {
  const safeTotal = resolveListTotal(total, 0);
  const totalPages = safeTotal > 0 ? Math.max(1, Math.ceil(safeTotal / pageSize)) : 1;
  const current =
    safeTotal > 0
      ? Math.min(Math.max(1, requestedPage), totalPages)
      : Math.max(1, requestedPage);
  return { current, pageSize, total: safeTotal };
};

const LIST_CACHE_PREFIX = 'standard_search_list:';
const LIST_CACHE_TTL_MS = 5 * 60 * 1000;

export const getListCacheKey = (queryKey) => `${LIST_CACHE_PREFIX}${queryKey}`;

export const readListCache = (queryKey) => {
  try {
    const raw = sessionStorage.getItem(getListCacheKey(queryKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.cachedAt && Date.now() - parsed.cachedAt > LIST_CACHE_TTL_MS) {
      sessionStorage.removeItem(getListCacheKey(queryKey));
      return null;
    }
    const { cachedAt, ...rest } = parsed;
    if (rest.pagination?.total != null && rest.pagination.total < 0) {
      sessionStorage.removeItem(getListCacheKey(queryKey));
      return null;
    }
    if (
      rest.totalPending &&
      rest.data?.length > 0 &&
      (rest.pagination?.total ?? 0) === rest.data.length
    ) {
      return { ...rest, totalPending: true };
    }
    return rest;
  } catch {
    return null;
  }
};

export const writeListCache = (queryKey, payload) => {
  try {
    sessionStorage.setItem(
      getListCacheKey(queryKey),
      JSON.stringify({ ...payload, cachedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
};

export const invalidateListCache = (queryKey) => {
  try {
    sessionStorage.removeItem(getListCacheKey(queryKey));
  } catch {
    /* ignore */
  }
};

/** 登出时清空检索列表缓存 */
export const clearAllListCache = () => {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(LIST_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

export const prefetchSearchList = (params, queryKey, knownTotal) => {
  if (!queryKey || readListCache(queryKey)) return;
  searchStandards(params)
    .then((res) => {
      writeListCache(queryKey, {
        data: res.items || [],
        pagination: {
          current: res.page || params.page,
          pageSize: res.size || params.size,
          total: resolveListTotal(res.total, knownTotal),
        },
        filters: {
          ...(params.keyword ? { keyword: params.keyword } : {}),
          ...(params.std_type ? { std_type: params.std_type } : {}),
          ...(params.status !== undefined && params.status !== null && params.status !== ''
            ? { status: params.status }
            : {}),
        },
      });
    })
    .catch(() => {});
};

const DETAIL_CACHE_PREFIX = 'standard_detail_cache_';

/** 登出时清空详情页缓存 */
export const clearAllDetailCache = () => {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(DETAIL_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

export const normalizeStdId = (stdId) => {
  if (!stdId) return '';
  try {
    return decodeURIComponent(stdId);
  } catch {
    return stdId;
  }
};

export const getDetailCacheKey = (stdId) =>
  `${DETAIL_CACHE_PREFIX}${normalizeStdId(stdId)}`;

export const readDetailCache = (stdId) => {
  try {
    const raw = sessionStorage.getItem(getDetailCacheKey(stdId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeDetailCache = (stdId, data) => {
  try {
    sessionStorage.setItem(getDetailCacheKey(stdId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
};

export const prefetchStandardDetail = (stdId) => {
  if (!stdId || readDetailCache(stdId)) return;
  getStandardDetail(stdId)
    .then((data) => writeDetailCache(stdId, data))
    .catch(() => {});
};

export const getStandardDetail = (stdId) => {
  const encodedId = encodeURIComponent(stdId);
  return request({
    url: `/standards/${encodedId}/`,
    method: 'get',
  });
};

export const getStandardFileStatus = (stdId) => {
  const encodedId = encodeURIComponent(stdId);
  return request({
    url: `/standards/${encodedId}/file-status`,
    method: 'get',
  });
};

export const downloadStandardFile = (stdId) => {
  const encodedId = encodeURIComponent(stdId);
  return request({
    url: `/standards/${encodedId}/download`,
    method: 'get',
    responseType: 'blob', // 关键配置：指定浏览器以二进制流接收
  });
};

// ========================
// AI 解析与异步任务
// ========================
export const parseReferences = (stdId) => {
  return request({
    url: '/ai/parse-references',
    method: 'post',
    data: { std_id: stdId }
  });
};

export const evaluateCompliance = (stdId, businessDescription) => {
  return request({
    url: '/ai/compliance-evaluation',
    method: 'post',
    data: { std_id: stdId, business_description: businessDescription }
  });
};

export const checkTaskStatus = (taskId) => {
  return request({
    url: `/tasks/${taskId}/status`,
    method: 'get',
  });
};
