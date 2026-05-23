import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MAIN_NAV_ITEMS } from '../../config/nav';

function getDisplayUser() {
  const username =
    localStorage.getItem('user_name') ||
    localStorage.getItem('remembered_username') ||
    '用户';
  const initial = (username.trim().charAt(0) || 'U').toUpperCase();
  return { username, initial };
}

export default function MobileTopBar() {
  const location = useLocation();
  const user = useMemo(() => getDisplayUser(), []);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/detail/')) return '标准详情';
    const match = MAIN_NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
    if (match) return match.label;
    if (location.pathname.startsWith('/register')) return '分配账号';
    return '智审平台';
  }, [location.pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-xl md:hidden">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-800">{pageTitle}</p>
      </div>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-xs font-bold text-white shadow-sm"
        title={user.username}
      >
        {user.initial}
      </div>
    </header>
  );
}
