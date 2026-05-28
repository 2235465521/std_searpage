import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton, message } from 'antd';
import { prefetchStandardDetail } from '../../../api/standards';
import { formatStdTypeCode } from '../../../utils/stdType';
import { ExStateBadge } from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import { ACTION_COL_PAD, ACTION_COL_WIDTH, DetailButton } from '../../../components/ui/GlassDataTable';

const StandardTable = ({
  data,
  loading,
  idle,
  pagination,
  onPageChange,
  returnPath,
  totalPending = false,
}) => {
  const navigate = useNavigate();
  const [jumpPage, setJumpPage] = useState('');
  const totalPages = totalPending
    ? null
    : Math.ceil(pagination.total / pagination.pageSize) || 1;
  const pageTotalLabel = totalPending ? '…' : totalPages;

  const openDetail = (stdId) => {
    navigate(`/detail/${encodeURIComponent(stdId)}`, {
      state: { from: returnPath || '/search' },
    });
  };

  const handleJump = () => {
    if (totalPending || totalPages == null) {
      message.info('总数统计中，请稍后再跳转页码');
      return;
    }
    const page = parseInt(jumpPage, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      message.warning(`请输入 1 到 ${totalPages} 之间的有效页码`);
      return;
    }
    onPageChange(page);
    setJumpPage('');
  };

  const renderTypeTag = (type, stdTypeNo) => {
    const code = formatStdTypeCode(type, stdTypeNo) || '未知';
    return (
      <span className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        {code}
      </span>
    );
  };

  if (idle) {
    return null;
  }

  if (loading && data.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const totalDisplay = totalPending
    ? '统计中…'
    : pagination.total.toLocaleString();

  return (
    <div className="glass-card flex min-w-0 flex-col rounded-xl transition-all">
      <div className="table-scroll-x">
        <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '36%' }} />
            <col style={{ width: '88px' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: ACTION_COL_WIDTH }} />
          </colgroup>
          <thead>
            <tr className="border-b border-white/40 bg-surface-container-low/50">
              <th className="whitespace-nowrap px-4 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant sm:px-6">标准编号</th>
              <th className="min-w-0 whitespace-nowrap px-4 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant sm:px-6">中文名称</th>
              <th className="whitespace-nowrap px-4 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant sm:px-6">标准类型</th>
              <th className="whitespace-nowrap px-4 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant sm:px-6">发布日期</th>
              <th className="whitespace-nowrap px-4 py-4 text-center font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant sm:px-6">执行状态</th>
              <th className={`whitespace-nowrap text-center font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant ${ACTION_COL_PAD} py-4`}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20 font-body text-sm">
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr
                  key={item.std_id || index}
                  className="group cursor-pointer transition-colors hover:bg-blue-50/40"
                  onMouseEnter={() => prefetchStandardDetail(item.std_id)}
                  onClick={() => openDetail(item.std_id)}
                >
                  <td className="whitespace-nowrap px-4 py-4 font-bold tracking-tight text-primary group-hover:underline sm:px-6">
                    {item.std_id}
                  </td>
                  <td className="min-w-0 px-4 py-4 font-medium text-on-surface sm:px-6">
                    <span className="block truncate" title={item.std_chinesename || undefined}>
                      {item.std_chinesename}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    {renderTypeTag(item.std_type, item.std_type_no)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-medium text-on-surface-variant/80 sm:px-6">
                    {item.release_date || '-'}
                  </td>
                  <td className="px-4 py-4 text-center sm:px-6">
                    <ExStateBadge exState={item.ex_state} />
                  </td>
                  <td className={`whitespace-nowrap text-center ${ACTION_COL_PAD} py-4`}>
                    <DetailButton
                      variant="link"
                      label="详情"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDetail(item.std_id);
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-0">
                  <EmptyState
                    icon="search_off"
                    title="暂无符合条件的数据"
                    description="试试放宽筛选条件，或清空关键词后重新查询"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="page-table-footer border-t border-white/40 bg-surface-container-low/30 px-4 py-4 sm:px-6">
          <div className="text-xs font-semibold text-on-surface-variant">
            为您精准匹配到{' '}
            <span className={totalPending ? 'text-slate-400' : 'text-primary'}>{totalDisplay}</span>
            {!totalPending ? ' 条标准条目' : ''}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.current <= 1 || loading}
                onClick={() => onPageChange(pagination.current - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-white/40 hover:bg-white/60 hover:text-primary disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              <div className="flex items-center gap-1">
                <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-primary/20">
                  {pagination.current}
                </span>
                <span className="px-1 text-xs text-slate-300">/</span>
                <span className="px-1 text-xs font-bold text-slate-500">
                  {pageTotalLabel}
                </span>
              </div>

              <button
                type="button"
                disabled={totalPending || pagination.current >= (totalPages ?? 1) || loading}
                onClick={() => onPageChange(pagination.current + 1)}
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
      )}
    </div>
  );
};

export default StandardTable;
