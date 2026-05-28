import React, { useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { getReplaceTypeMeta } from '../../utils/replaceType';

const DEFAULT_VISIBLE = 5;

export default function ReplaceHistoryTimeline({
  items = [],
  onNavigate,
  maxVisible = DEFAULT_VISIBLE,
}) {
  const [expanded, setExpanded] = useState(false);

  const list = useMemo(
    () => (items || []).filter((item) => item?.replace_std_name || item?.replace_id),
    [items],
  );

  if (!list.length) return null;

  const hiddenCount = Math.max(0, list.length - maxVisible);
  const visibleItems = expanded || hiddenCount === 0 ? list : list.slice(0, maxVisible);

  return (
    <div className="page-card-pad mb-6 rounded-xl border border-slate-100 bg-slate-50/60">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
          <ArrowRightLeft size={15} />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800">替代关系</p>
          <p className="text-[11px] text-slate-400">共 {list.length} 条被替代记录</p>
        </div>
      </div>

      <ol className="relative space-y-0 pl-1">
        {visibleItems.map((item, index) => {
          const meta = getReplaceTypeMeta(item.replace_type);
          const isLast = index === visibleItems.length - 1 && (expanded || hiddenCount === 0);
          const targetName = item.replace_std_name?.trim();
          const targetId = item.replace_id;

          return (
            <li key={`${targetName || targetId}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200"
                  aria-hidden
                />
              ) : null}
              <span
                className="relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: `${meta.color}18`, boxShadow: `0 0 0 1px ${meta.color}40` }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="m-0 text-sm leading-relaxed text-slate-700">
                  该版本
                  <span
                    className="mx-1 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-bold"
                    style={{ color: meta.color, backgroundColor: `${meta.color}14` }}
                  >
                    {meta.shortLabel}
                  </span>
                  替代了旧版标准
                </p>
                <div className="mt-1">
                  {targetName ? (
                    <button
                      type="button"
                      onClick={() => onNavigate?.(targetName)}
                      className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-700"
                    >
                      {targetName}
                    </button>
                  ) : (
                    <span className="text-sm font-medium text-slate-500">{targetId ?? '—'}</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-lg border border-slate-200/80 bg-white py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600"
        >
          {expanded ? '收起' : `展开其余 ${hiddenCount} 条`}
        </button>
      ) : null}
    </div>
  );
}
