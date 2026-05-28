import React, { useState } from 'react';

export function ChartCardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default function ChartCard({ title, subtitle, children, footer, className = '' }) {
  return (
    <div
      className={[
        'min-w-0 rounded-xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-sm',
        className,
      ].join(' ')}
    >
      {title ? <ChartCardHeader title={title} subtitle={subtitle} /> : null}
      {children}
      {footer ? <div className="mt-3 border-t border-slate-100 pt-3">{footer}</div> : null}
    </div>
  );
}

export function ChartRankList({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white/80 p-3">
      {title ? (
        <p className="mb-2 text-xs font-semibold text-slate-500">{title}</p>
      ) : null}
      {children}
    </div>
  );
}

export function ChartDetailsToggle({ label = '查看类别明细', children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600"
      >
        {label}
        <span className="material-symbols-outlined text-base leading-none">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
