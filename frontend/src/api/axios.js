import axios from 'axios';
import { API_BASE } from './config';
import { getApiErrorMessage } from './errorMessage';
import {
  ensureValidToken,
  refreshAccessToken,
  redirectToLogin,
} from './tokenAuth';

const service = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

const AUTH_SKIP_PATHS = ['/auth/login', '/auth/refresh', '/auth/register'];

function shouldSkipAuth(url = '') {
  return AUTH_SKIP_PATHS.some((path) => url.includes(path));
}

service.interceptors.request.use(
  async (config) => {
    if (!shouldSkipAuth(config.url)) {
      try {
        const token = await ensureValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        redirectToLogin();
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

service.interceptors.response.use(
  (response) => {
    const res = response.data;

    if (response.config.responseType === 'blob') {
      return response;
    }

    if (!res || res.code === undefined) {
      return res;
    }

    if (res.code !== 0) {
      return Promise.reject(new Error(res.message || '系统繁忙，请稍后再试'));
    }

    return res.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipAuth(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return service(originalRequest);
      } catch {
        redirectToLogin();
      }
    }

    // 下载接口 404：解析 blob/json 中的业务提示
    if (
      error.response?.status === 404 &&
      error.config?.responseType === 'blob' &&
      error.response.data instanceof Blob
    ) {
      try {
        const text = await error.response.data.text();
        const errJson = JSON.parse(text);
        if (errJson?.message) {
          return Promise.reject(new Error(errJson.message));
        }
      } catch {
        /* ignore */
      }
    }

    return Promise.reject(new Error(getApiErrorMessage(error)));
  }
);

export default service;
