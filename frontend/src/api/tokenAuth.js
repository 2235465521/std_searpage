import axios from 'axios';
import { clearAnalyticsSessionCache } from '../pages/DataAnalysis/analyticsSessionCache';
import {
  clearSessionAutoQueryState,
  markSessionPendingAutoQuery,
} from '../utils/sessionAutoQuery';
import { resetSessionPrefetchState } from '../utils/sessionPrefetch';
import { API_BASE } from './config';

/** 到期前多少毫秒触发续期 */
const REFRESH_BUFFER_MS = 60 * 1000;

const SESSION_SNAPSHOT_KEYS = [
  'drafting-unit-page-snapshot:v2',
  'analytics_page_snapshot:v1',
  'standard_search_last_params:v1',
];

const SESSION_PREFIXES_TO_CLEAR = [
  'standard_search_list:',
  'standard_detail_cache_',
];

function removeSessionStorageKeys(keys) {
  keys.forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
}

function clearSessionStorageByPrefix(prefixes) {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && prefixes.some((prefix) => k.startsWith(prefix))) {
        keys.push(k);
      }
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

const bareClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

let refreshTimer = null;
let refreshPromise = null;

export function isAuthenticated() {
  return Boolean(localStorage.getItem('token') && localStorage.getItem('refresh_token'));
}

/** 页面卸载时仅在仍登录状态下才允许写入 session 快照，避免登出后被 cleanup 写回 */
export function canPersistSessionData() {
  return isAuthenticated();
}

export function decodeJwtExpiry(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function prepareSessionForFreshLogin() {
  clearSessionAutoQueryState();
  resetSessionPrefetchState();
  clearAnalyticsSessionCache();
  clearSessionStorageByPrefix(SESSION_PREFIXES_TO_CLEAR);
  removeSessionStorageKeys(SESSION_SNAPSHOT_KEYS);
  markSessionPendingAutoQuery();
}

export function persistAuthTokens({ access, refresh }) {
  if (access) localStorage.setItem('token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
  prepareSessionForFreshLogin();
  scheduleTokenRefresh();
}

export function clearAuthTokens() {
  cancelTokenRefresh();
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  clearAnalyticsSessionCache();
  clearSessionStorageByPrefix(SESSION_PREFIXES_TO_CLEAR);
  removeSessionStorageKeys(SESSION_SNAPSHOT_KEYS);
  clearSessionAutoQueryState();
}

export function cancelTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export function scheduleTokenRefresh() {
  cancelTokenRefresh();

  const token = localStorage.getItem('token');
  const refresh = localStorage.getItem('refresh_token');
  if (!token || !refresh) return;

  const exp = decodeJwtExpiry(token);
  if (!exp) return;

  const delay = Math.max(exp - Date.now() - REFRESH_BUFFER_MS, 0);

  refreshTimer = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch {
      redirectToLogin();
    }
  }, delay);
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) {
    throw new Error('缺少 refresh_token');
  }

  refreshPromise = bareClient
    .post('/auth/refresh', { refresh })
    .then(({ data }) => {
      const access = data?.access;
      if (!access) throw new Error('续期响应无效');
      localStorage.setItem('token', access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      scheduleTokenRefresh();
      return access;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/** 请求发出前：若 access 即将过期则先续期 */
export async function ensureValidToken() {
  const token = localStorage.getItem('token');
  const refresh = localStorage.getItem('refresh_token');
  if (!token || !refresh) return token;

  const exp = decodeJwtExpiry(token);
  if (!exp) return token;

  if (exp - Date.now() > REFRESH_BUFFER_MS) return token;

  return refreshAccessToken();
}

export function redirectToLogin() {
  clearAuthTokens();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}
