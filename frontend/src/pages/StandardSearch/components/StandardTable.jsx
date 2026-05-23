import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton, message, Spin } from 'antd';
import { prefetchStandardDetail } from '../../../api/standards';
import { formatStdTypeCode } from '../../../utils/stdType';
import { ExStateBadge } from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';

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
    <Spin spinning={loading}>
      <div className="glass-card flex flex-col overflow-hidden rounded-xl transition-all">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/40 bg-surface-container-low/50">
                <th className="whitespace-nowrap px-6 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">标准编号</th>
                <th className="whitespace-nowrap px-6 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">中文名称</th>
                <th className="whitespace-nowrap px-6 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">标准类型</th>
                <th className="whitespace-nowrap px-6 py-4 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">发布日期</th>
                <th className="whitespace-nowrap px-6 py-4 text-center font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">执行状态</th>
                <th className="whitespace-nowrap px-6 py-4 text-right font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">操作</th>
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
                    <td className="whitespace-nowrap px-6 py-4 font-bold tracking-tight text-primary group-hover:underline">
                      {item.std_id}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 font-medium text-on-surface xl:max-w-md">
                      {item.std_chinesename}
                    </td>
                    <td className="px-6 py-4">
                      {renderTypeTag(item.std_type, item.std_type_no)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-on-surface-variant/80">
                      {item.release_date || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ExStateBadge exState={item.ex_state} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDetail(item.std_id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/40 px-4 py-2 text-xs font-bold text-primary shadow-sm transition-all hover:bg-white/80 hover:text-primary-container"
                      >
                        <span className="material-symbols-outlined text-[16px] leading-none">visibility</span>
                        查看详情
                      </button>
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
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/40 bg-surface-container-low/30 px-6 py-4 sm:flex-row">
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

              <div className="flex items-center gap-2 border-l border-white/40 pl-4">
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
    </Spin>
  );
};

export default StandardTable;
