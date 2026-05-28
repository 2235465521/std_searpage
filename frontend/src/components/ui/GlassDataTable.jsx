import React, { useEffect, useState } from 'react';
import { Skeleton, message } from 'antd';
import EmptyState from './EmptyState';

export const ACTION_COL_WIDTH = '96px';
export const ACTION_COL_PAD = '!px-2 sm:!px-3';

const thBase =
  'px-4 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant sm:px-6';
const thCompact = 'px-3 py-3 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant sm:px-4';
const tdBase = 'px-4 py-4 sm:px-6';
const tdCompact = 'px-3 py-3 sm:px-4';

function resolveRowKey(row, index, rowKey) {
  if (typeof rowKey === 'function') return rowKey(row, index);
  if (rowKey && row[rowKey] != null) return row[rowKey];
  return index;
}

/** @param {Array<any>} columns antd-style column definitions */
export function adaptAntdColumns(columns = []) {
  return columns.map((col) => {
    const key = col.key ?? col.dataIndex;
    const adapted = {
      key: String(key),
      title: col.title,
      align: col.align,
      headerClassName: col.headerClassName,
      cellClassName: col.cellClassName,
    };

    if (col.fixed === 'left') {
      adapted.headerClassName = [
        'sticky left-0 z-20 bg-surface-container-low/95 backdrop-blur-sm shadow-[2px_0_8px_-4px_rgba(15,23,42,0.08)]',
        col.headerClassName,
      ]
        .filter(Boolean)
        .join(' ');
      adapted.cellClassName = [
        'sticky left-0 z-10 bg-white/95 group-hover:bg-blue-50/50 font-medium text-on-surface shadow-[2px_0_8px_-4px_rgba(15,23,42,0.05)]',
        col.cellClassName,
      ]
        .filter(Boolean)
        .join(' ');
    } else if (col.fixed === 'right') {
      adapted.headerClassName = [
        'sticky right-0 z-20 bg-surface-container-low/95 backdrop-blur-sm shadow-[-2px_0_8px_-4px_rgba(15,23,42,0.08)]',
        col.headerClassName,
      ]
        .filter(Boolean)
        .join(' ');
      adapted.cellClassName = [
        'sticky right-0 z-10 bg-white/95 group-hover:bg-blue-50/50 shadow-[-2px_0_8px_-4px_rgba(15,23,42,0.05)]',
        col.cellClassName,
      ]
        .filter(Boolean)
        .join(' ');
    }

    if (col.render) {
      adapted.render = (row, index) => col.render(row[col.dataIndex], row, index);
    } else if (col.dataIndex != null) {
      adapted.key = col.dataIndex;
    }

    return adapted;
  });
}

/**
 * @param {{
 *   columns: Array<{ key: string, title: string, align?: string, headerClassName?: string, cellClassName?: string, render?: (row: any, index: number) => React.ReactNode }>,
 *   data: any[],
 *   loading?: boolean,
 *   idle?: boolean,
 *   pagination?: { current: number, pageSize: number, total: number, showSizeChanger?: boolean, pageSizeOptions?: number[] },
 *   onPageChange?: (page: number, pageSize?: number) => void,
 *   rowKey?: string | ((row: any, index: number) => string | number),
 *   minWidth?: number,
 *   footerItemLabel?: string,
 *   emptyIcon?: string,
 *   emptyTitle?: string,
 *   emptyDescription?: string,
 *   onRowClick?: (row: any) => void,
 *   onRowMouseEnter?: (row: any) => void,
 *   getRowClassName?: (row: any) => string,
 *   embedded?: boolean,
 *   compact?: boolean,
 *   maxBodyHeight?: number,
 *   tableLayout?: 'auto' | 'fixed',
 * }} props
 */
export default function GlassDataTable({
  columns,
  data,
  loading = false,
  idle = false,
  pagination,
  onPageChange,
  rowKey = 'id',
  minWidth = 640,
  footerItemLabel = '条记录',
  emptyIcon = 'search_off',
  emptyTitle = '暂无符合条件的数据',
  emptyDescription = '试试调整筛选条件后重新查询',
  onRowClick,
  onRowMouseEnter,
  getRowClassName,
  embedded = false,
  compact = false,
  maxBodyHeight,
  tableLayout = 'fixed',
}) {
  const clientSide = pagination != null && pagination.current == null;
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(pagination?.pageSize ?? 20);

  useEffect(() => {
    setLocalPage(1);
  }, [data.length]);

  useEffect(() => {
    if (pagination?.pageSize != null) {
      setLocalPageSize(pagination.pageSize);
    }
  }, [pagination?.pageSize]);

  const activePage = clientSide ? localPage : pagination?.current ?? 1;
  const activePageSize = clientSide ? localPageSize : pagination?.pageSize ?? 20;
  const activeTotal = clientSide ? data.length : pagination?.total ?? data.length;
  const visibleData =
    clientSide && pagination
      ? data.slice((activePage - 1) * activePageSize, activePage * activePageSize)
      : data;

  const handlePageChange = (page, pageSize) => {
    if (clientSide) {
      setLocalPage(page);
      if (pageSize != null) setLocalPageSize(pageSize);
    }
    onPageChange?.(page, pageSize);
  };

  const [jumpPage, setJumpPage] = useState('');
  const totalPages = pagination ? Math.ceil(activeTotal / activePageSize) || 1 : 1;

  const handleJump = () => {
    const page = parseInt(jumpPage, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      message.warning(`请输入 1 到 ${totalPages} 之间的有效页码`);
      return;
    }
    handlePageChange(page, activePageSize);
    setJumpPage('');
  };

  const thClass = compact ? thCompact : thBase;
  const tdClass = compact ? tdCompact : tdBase;
  const wrapperClass = embedded
    ? 'flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/50 bg-white/30'
    : 'glass-card flex min-w-0 flex-col rounded-xl transition-all';

  if (idle) return null;

  if (loading && data.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const alignClass = (align) => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <div className={wrapperClass}>
      <div
        className="table-scroll-x overflow-y-auto"
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
      >
        <table
          className="glass-data-table w-full border-collapse text-left font-body text-sm"
          style={{ minWidth, tableLayout }}
        >
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={col.width ? { width: col.width } : undefined} />
            ))}
          </colgroup>
          <thead className={maxBodyHeight ? 'sticky top-0 z-10 bg-surface-container-low/95 backdrop-blur-sm' : undefined}>
            <tr className="border-b border-white/40 bg-surface-container-low/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    thClass,
                    alignClass(col.align),
                    'align-middle whitespace-nowrap',
                    col.headerClassName,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {visibleData.length > 0 ? (
              visibleData.map((row, index) => (
                <tr
                  key={resolveRowKey(row, index, rowKey)}
                  className={[
                    'group transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-blue-50/30',
                    getRowClassName?.(row),
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onMouseEnter={onRowMouseEnter ? () => onRowMouseEnter(row) : undefined}
                >
                  {columns.map((col) => {
                    const hasVerticalAlign = /\balign-(top|bottom|baseline)\b/.test(col.cellClassName || '');
                    return (
                    <td
                      key={col.key}
                      className={[
                        tdClass,
                        alignClass(col.align),
                        hasVerticalAlign ? null : 'align-middle',
                        col.cellClassName,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {col.render ? col.render(row, index) : row[col.key] ?? '—'}
                    </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (visibleData.length > 0 || data.length > 0) ? (
        <div className="page-table-footer border-t border-white/40 bg-surface-container-low/30 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold text-on-surface-variant">
              共 <span className="text-primary">{activeTotal.toLocaleString()}</span> {footerItemLabel}
            </div>
            {pagination.showSizeChanger ? (
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                每页
                <select
                  value={activePageSize}
                  onChange={(e) => handlePageChange(1, Number(e.target.value))}
                  className="h-8 rounded-lg border border-white/60 bg-white/50 px-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {(pagination.pageSizeOptions || [10, 20, 50]).map((size) => (
                    <option key={size} value={Number(size)}>
                      {size}
                    </option>
                  ))}
                </select>
                条
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={activePage <= 1 || loading}
                onClick={() => handlePageChange(activePage - 1, activePageSize)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-white/40 hover:bg-white/60 hover:text-primary disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              <div className="flex items-center gap-1">
                <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-primary/20">
                  {activePage}
                </span>
                <span className="px-1 text-xs text-slate-300">/</span>
                <span className="px-1 text-xs font-bold text-slate-500">{totalPages}</span>
              </div>

              <button
                type="button"
                disabled={activePage >= totalPages || loading}
                onClick={() => handlePageChange(activePage + 1, activePageSize)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-white/40 hover:bg-white/60 hover:text-primary disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>

            <div className="page-table-footer-actions flex flex-wrap items-center justify-center gap-2">
              <span className="whitespace-nowrap text-xs font-medium text-slate-500">跳转到</span>
              <input
                type="text"
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                className="h-9 w-12 rounded-lg border border-white/60 bg-white/50 text-center text-xs font-bold transition-all focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="..."
              />
              <span className="text-xs font-medium text-slate-500">页</span>
              <button
                type="button"
                onClick={handleJump}
                className="h-9 rounded-lg border border-white/60 bg-white/40 px-3 text-xs font-bold text-primary transition-all hover:bg-white/80 active:scale-95"
              >
                跳转
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TypeTag({ code }) {
  return (
    <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
      {code || '—'}
    </span>
  );
}

export function DetailButton({ onClick, label = '查看详情', variant = 'default' }) {
  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={(event) => onClick?.(event)}
        aria-label={label}
        className="inline-flex items-center gap-0.5 rounded-md px-0.5 py-1 text-xs font-semibold text-primary/65 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 group-hover:text-primary group-hover:underline"
      >
        {label}
        <span className="material-symbols-outlined text-[14px] leading-none opacity-60 transition-opacity group-hover:opacity-100">
          chevron_right
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => onClick?.(event)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/40 px-4 py-2 text-xs font-bold text-primary shadow-sm transition-all hover:bg-white/80 hover:text-primary-container"
    >
      <span className="material-symbols-outlined text-[16px] leading-none">visibility</span>
      {label}
    </button>
  );
}
