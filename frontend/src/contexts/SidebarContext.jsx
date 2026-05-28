import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sidebar-collapsed:v1';
export const SIDEBAR_AUTO_COLLAPSE_SESSION_KEY = 'sidebar-auto-collapse:v1';
/** sidebar 展开宽度动画（与 index.css 中 transition 一致） */
export const SIDEBAR_EXPAND_TRANSITION_MS = 250;
/** 标签完全可见后留给用户辨认导航的时间 */
export const SIDEBAR_LOGIN_GLANCE_MS = 600;
/** 登录后进主界面：先展开再停留，便于扫一眼导航 */
export const SIDEBAR_AUTO_COLLAPSE_AFTER_LOGIN_MS =
  SIDEBAR_EXPAND_TRANSITION_MS + SIDEBAR_LOGIN_GLANCE_MS;

export const SIDEBAR_WIDTH_EXPANDED = '15rem';
export const SIDEBAR_WIDTH_COLLAPSED = '4.5rem';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [loginSidebarReveal, setLoginSidebarReveal] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const isCollapsed = localStorage.getItem(STORAGE_KEY) === '1';
    if (typeof document !== 'undefined') {
      const width = isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
      document.documentElement.style.setProperty('--sidebar-width', width);
      document.documentElement.classList.toggle('sidebar-collapsed', isCollapsed);
    }
    return isCollapsed;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
    document.documentElement.style.setProperty('--sidebar-width', width);
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (sessionStorage.getItem(SIDEBAR_AUTO_COLLAPSE_SESSION_KEY) !== '1') return undefined;

    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktop) {
      sessionStorage.removeItem(SIDEBAR_AUTO_COLLAPSE_SESSION_KEY);
      return undefined;
    }

    setLoginSidebarReveal(true);
    setCollapsed(false);

    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(SIDEBAR_AUTO_COLLAPSE_SESSION_KEY);
      setLoginSidebarReveal(false);
      setCollapsed(true);
    }, SIDEBAR_AUTO_COLLAPSE_AFTER_LOGIN_MS);

    return () => window.clearTimeout(timer);
  }, [setCollapsed]);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleCollapsed: () => setCollapsed((open) => !open),
      loginSidebarReveal,
    }),
    [collapsed, loginSidebarReveal],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
