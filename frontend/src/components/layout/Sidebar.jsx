import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAuthTokens } from '../../api/tokenAuth';
import { ADMIN_NAV_ITEM, MAIN_NAV_ITEMS } from '../../config/nav';

function NavItem({ to, icon, label, desc }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-200',
          isActive
            ? 'bg-white text-blue-700 shadow-[0_2px_12px_rgba(37,99,235,0.10)] ring-1 ring-blue-100/80'
            : 'text-slate-600 hover:bg-white/70 hover:text-slate-800 hover:shadow-sm',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-500 to-blue-600"
              aria-hidden
            />
          )}
          <span
            className={[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
              isActive
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200/60'
                : 'bg-slate-100/90 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-[18px] leading-none">{icon}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[13px] leading-tight ${isActive ? 'font-bold' : 'font-semibold'}`}>
              {label}
            </span>
            <span
              className={[
                'mt-0.5 block truncate text-[10px] leading-tight transition-colors',
                isActive ? 'text-blue-500/80' : 'text-slate-400 group-hover:text-slate-500',
              ].join(' ')}
            >
              {desc}
            </span>
          </span>
        </>
      )}
    </NavLink>
  );
}

const Sidebar = () => {
  const navigate = useNavigate();
  const isSuperAdmin = localStorage.getItem('user_role') === 'superadmin';

  const handleLogout = () => {
    clearAuthTokens();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-[15rem] flex-col border-r border-slate-200/60 bg-gradient-to-b from-slate-50/95 via-white/90 to-slate-50/80 p-4 font-manrope backdrop-blur-2xl md:flex">
      <div className="mb-8 px-1 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200/50">
            <span className="material-symbols-outlined text-[22px] leading-none">hub</span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-tight text-slate-800">智审平台</h1>
            <p className="truncate text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              Luminous Curator
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          功能导航
        </p>
        {MAIN_NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        {isSuperAdmin && (
          <NavItem {...ADMIN_NAV_ITEM} />
        )}
      </nav>

      <div className="mt-auto space-y-1 border-t border-slate-200/70 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-slate-600 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100/90 text-slate-500 transition-all group-hover:bg-red-100 group-hover:text-red-500">
            <span className="material-symbols-outlined text-[18px] leading-none">logout</span>
          </span>
          <span className="min-w-0 truncate">退出登录</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
