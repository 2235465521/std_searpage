import React from 'react';
import { NavLink } from 'react-router-dom';
import { MAIN_NAV_ITEMS, ADMIN_NAV_ITEM } from '../../config/nav';

function MobileNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors',
          isActive ? 'text-blue-600' : 'text-slate-500',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
              isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">{icon}</span>
          </span>
          <span className={`truncate text-[10px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function MobileNav() {
  const isSuperAdmin = localStorage.getItem('user_role') === 'superadmin';
  const items = isSuperAdmin ? [...MAIN_NAV_ITEMS, ADMIN_NAV_ITEM] : MAIN_NAV_ITEMS;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden"
      aria-label="移动端导航"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5">
        {items.map((item) => (
          <MobileNavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.mobileLabel || item.label}
          />
        ))}
      </div>
    </nav>
  );
}
