import React from 'react';

export default function EmptyState({
  icon = 'inbox',
  title = '暂无数据',
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <span className="material-symbols-outlined text-[28px] leading-none">{icon}</span>
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
