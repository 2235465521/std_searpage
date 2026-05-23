import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MAIN_NAV_ITEMS } from '../../config/nav';

function getDisplayUser() {
  const username =
    localStorage.getItem('user_name') ||
    localStorage.getItem('remembered_username') ||
    '用户';
  const role = localStorage.getItem('user_role');
  const roleLabel = role === 'superadmin' ? '超级管理员' : '业务员';
  const initial = (username.trim().charAt(0) || 'U').toUpperCase();
  return { username, roleLabel, initial };
}

const Header = () => {
  const location = useLocation();
  const user = useMemo(() => getDisplayUser(), []);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/detail/')) return '标准详情';
    const match = MAIN_NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
    if (match) return match.label;
    if (location.pathname.startsWith('/register')) return '分配人员账号';
    return '智审平台';
  }, [location.pathname]);

  return (
    <header className="fixed top-0 right-0 z-30 hidden h-16 w-full items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 font-manrope shadow-[0_4px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl md:flex md:w-[calc(100%-15rem)] md:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-800">{pageTitle}</p>
        <p className="truncate text-[11px] text-slate-400">Luminous Curator</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-full border border-slate-100 bg-white/80 py-1 pl-1 pr-3 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-sm font-bold text-white shadow-sm">
            {user.initial}
          </div>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-slate-700">{user.username}</p>
            <p className="truncate text-[10px] text-slate-400">{user.roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
