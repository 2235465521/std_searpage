import React from 'react';
import { getStatusDisplay } from '../../utils/replaceType';

const EX_STATE_META = {
  1: {
    label: '现行',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  },
  2: {
    label: '即将实施',
    className: 'bg-blue-50 text-blue-600 ring-blue-100/80',
  },
  0: {
    label: '废止',
    className: 'bg-rose-50 text-rose-600 ring-rose-200/60',
  },
};

const SIZE_CLASS = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-2.5 py-1 text-[11px]',
  lg: 'px-3 py-1.5 text-xs',
};

function BadgeShell({ label, className, size = 'sm' }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold ring-1 ring-inset',
        SIZE_CLASS[size] || SIZE_CLASS.sm,
        className,
      ].join(' ')}
    >
      {label}
    </span>
  );
}

/** 列表页：ex_state 0/1/2 */
export function ExStateBadge({ exState, size = 'sm' }) {
  const meta = EX_STATE_META[exState] ?? EX_STATE_META[0];
  return <BadgeShell label={meta.label} className={meta.className} size={size} />;
}

/** 详情页：internal_status + ex_state */
export function InternalStatusBadge({ internalStatus, exState, size = 'md', icon }) {
  const meta = getStatusDisplay(internalStatus, exState);
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-lg border font-bold uppercase tracking-wide',
        SIZE_CLASS[size] || SIZE_CLASS.md,
        meta.color,
      ].join(' ')}
    >
      {icon}
      {meta.label}
    </span>
  );
}
