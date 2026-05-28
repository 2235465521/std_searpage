/** 登录会话内各查询页「首次进入自动查一次」状态（登出清空）。 */

const PENDING_KEY = 'app-pending-auto-query';

/** 各查询入口对应的 page 标识（markPageAutoQueryDone 须一致） */
export const AUTO_QUERY_PAGES = {
  SEARCH: 'search',
  ANALYTICS: 'analytics',
  UNITS: 'units',
  UNITS_FIRST_LEAD: 'units-first-lead',
  UNITS_FIRST_JOIN: 'units-first-join',
  UNITS_STATS: 'units-stats',
};

const pageDoneKey = (page) => `app-auto-query-done:${page}`;

export function markSessionPendingAutoQuery() {
  try {
    sessionStorage.setItem(PENDING_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasSessionPendingAutoQuery() {
  try {
    return sessionStorage.getItem(PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function isPageAutoQueryDone(page) {
  try {
    return sessionStorage.getItem(pageDoneKey(page)) === '1';
  } catch {
    return false;
  }
}

export function markPageAutoQueryDone(page) {
  try {
    sessionStorage.setItem(pageDoneKey(page), '1');
  } catch {
    /* ignore */
  }
}

/** 登录后会话内，本页是否尚未用默认条件自动查询过 */
export function shouldPageAutoQueryOnFirstVisit(page) {
  return hasSessionPendingAutoQuery() && !isPageAutoQueryDone(page);
}

export function clearSessionAutoQueryState() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k?.startsWith('app-auto-query-done:')) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
