import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Spin, message } from 'antd';
import { motion } from 'motion/react';
import {
  ArrowLeft, Download, FileText, LayoutGrid, Clock,
  AlertCircle, CheckCircle2, History,
} from 'lucide-react';
import {
  getStandardDetail,
  getStandardFileStatus,
  downloadStandardFile,
  readDetailCache,
  writeDetailCache,
} from '../api/standards';
import MetadataCard from '../components/Detail/MetadataCard';
import EvolutionGraph from '../components/Detail/EvolutionGraph';
import ReplaceHistoryTimeline from '../components/Detail/ReplaceHistoryTimeline';
import SectionCard from '../components/ui/SectionCard';
import { InternalStatusBadge } from '../components/ui/StatusBadge';
import { getStatusDisplay } from '../utils/replaceType';

const DetailPage = () => {
  const { std_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    const from = location.state?.from ?? location.state?.returnPath;
    if (from) {
      // replace 避免历史栈堆积；prevState 恢复上一级详情页自带的返回目标（如检索列表）
      navigate(from, { replace: true, state: location.state?.prevState ?? undefined });
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/search', { replace: true });
  };
  const displayStdId = decodeURIComponent(std_id || '');
  const cachedDetail = readDetailCache(displayStdId);
  const [loading, setLoading] = useState(!cachedDetail);
  const [detailData, setDetailData] = useState(cachedDetail);
  const [hasFile, setHasFile] = useState(null);
  const [fileStatusLoading, setFileStatusLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  useEffect(() => {
    let cancelled = false;

    const fetchDetail = async () => {
      try {
        if (!detailData) setLoading(true);
        setFetchError(null);
        const res = await getStandardDetail(std_id);
        if (cancelled) return;
        setDetailData(res);
        writeDetailCache(displayStdId, res);
      } catch (error) {
        if (cancelled) return;
        console.error('Fetch detail failed:', error);
        const errMsg = error?.message || '详情加载失败，请重试';
        setFetchError(errMsg);
        if (!detailData) message.error(errMsg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [std_id]);

  useEffect(() => {
    let cancelled = false;
    setFileStatusLoading(true);
    setHasFile(null);

    getStandardFileStatus(std_id)
      .then((res) => {
        if (!cancelled) setHasFile(res?.has_file ?? null);
      })
      .catch(() => {
        if (!cancelled) setHasFile(null);
      })
      .finally(() => {
        if (!cancelled) setFileStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [std_id]);

  const parseFilenameFromHeader = (disposition) => {
    if (!disposition) return null;
    const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition);
    if (utf8Match) {
      try {
        return decodeURIComponent(utf8Match[1].trim());
      } catch {
        return utf8Match[1].trim();
      }
    }
    const quoted = /filename="([^"]+)"/i.exec(disposition);
    if (quoted) {
      try {
        return decodeURIComponent(quoted[1]);
      } catch {
        return quoted[1];
      }
    }
    return null;
  };

  const handleDownload = async () => {
    try {
      message.loading({ content: '文件获取中...', key: 'download' });
      const res = await downloadStandardFile(std_id);
      const rawBlob = res.data;

      // 后端报错时可能返回 JSON，被 axios 当成 blob
      if (rawBlob.type?.includes('json') || rawBlob.type?.includes('text/html')) {
        const text = await rawBlob.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err.detail || err.message || '文件不存在或无权下载');
        } catch (e) {
          if (e instanceof SyntaxError) throw new Error('下载失败，服务器未返回有效文件');
          throw e;
        }
      }

      const serverFilename = parseFilenameFromHeader(res.headers['content-disposition']);
      const fallbackBase = decodeURIComponent(std_id).replace(/\//g, ' ');
      const mimeType = res.headers['content-type'] || rawBlob.type || 'application/octet-stream';
      let downloadName = serverFilename;
      if (!downloadName) {
        const ext = mimeType.includes('wordprocessingml') || mimeType.includes('msword')
          ? '.docx'
          : mimeType.includes('pdf')
            ? '.pdf'
            : '';
        downloadName = `${fallbackBase}${ext}`;
      }
      const blob = new Blob([rawBlob], { type: mimeType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success({ content: '已开始下载', key: 'download' });
    } catch (error) {
      message.error({ content: error.message || '下载失败', key: 'download' });
    }
  };

  if (loading && !detailData) {
    return (
      <div className="page-content mx-auto min-h-screen min-w-0 w-full max-w-6xl px-4 pb-20 sm:px-6">
        <motion.div className="flex items-center gap-5 mb-10 mt-8">
          <button
            type="button"
            onClick={handleBack}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm text-slate-400 hover:text-blue-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{displayStdId}</h1>
            <p className="text-slate-400 text-sm mt-1">正在加载标准详情...</p>
          </div>
        </motion.div>
        <motion.div className="flex flex-col justify-center items-center h-[50vh] gap-4">
          <Spin size="large" />
        </motion.div>
      </div>
    );
  }

  const navigateToStandard = (targetStdId) => {
    const name = (targetStdId || '').trim();
    if (!name) return;
    navigate(`/detail/${encodeURIComponent(name)}`, {
      state: {
        from: `${location.pathname}${location.search}`,
        prevState: location.state,
      },
    });
  };

  if (!detailData) {
    const isNotFound = !fetchError;
    return (
      <div className="page-content mx-auto mt-20 max-w-xl min-w-0 px-4 text-center">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl sm:p-12">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} className="text-slate-300" />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">
          {isNotFound ? '未找到该标准' : '详情加载失败'}
        </h3>
        <p className="text-slate-500 mb-8">
          {isNotFound
            ? '可能该标准尚未收录或 ID 输入有误'
            : fetchError}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isNotFound && (
            <button
              type="button"
              onClick={() => {
                setFetchError(null);
                setLoading(true);
                getStandardDetail(std_id)
                  .then((res) => {
                    setDetailData(res);
                    writeDetailCache(displayStdId, res);
                  })
                  .catch((e) => {
                    setFetchError(e?.message || '详情加载失败，请重试');
                    message.error(e?.message || '详情加载失败，请重试');
                  })
                  .finally(() => setLoading(false));
              }}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              重试
            </button>
          )}
          <button
            type="button"
            onClick={handleBack}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            返回
          </button>
        </div>
        </div>
      </div>
    );
  }

  const { base_info, detail_info, replace_history, ped_chain } = detailData;

  const statusMeta = getStatusDisplay(base_info.internal_status, base_info.ex_state);
  const statusIcon = statusMeta.iconKey === 'current'
    ? <CheckCircle2 size={12} />
    : statusMeta.iconKey === 'pending'
      ? <Clock size={12} />
      : <AlertCircle size={12} />;

  return (
    <div className="page-content mx-auto min-h-screen min-w-0 w-full max-w-6xl px-4 pb-20 sm:px-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="page-detail-header">
        <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
          <button 
            onClick={handleBack} 
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-400 shadow-sm transition-all hover:border-blue-100 hover:bg-blue-50/30 hover:text-blue-600 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="break-all text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{base_info.std_id}</h1>
              <InternalStatusBadge
                internalStatus={base_info.internal_status}
                exState={base_info.ex_state}
                icon={statusIcon}
              />
            </div>
            <p className="text-sm font-bold tracking-wide text-slate-500 break-words">{base_info.std_chinesename}</p>
          </div>
        </div>
        
        <div className="page-detail-header-actions">
        {fileStatusLoading ? (
          <button
            type="button"
            disabled
            className="bg-slate-100 text-slate-400 px-6 py-3 rounded-2xl flex items-center gap-2.5 text-sm font-bold cursor-wait"
          >
            <Download size={18} />
            检测文件中...
          </button>
        ) : hasFile === false ? (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              disabled
              className="bg-slate-200 text-slate-400 px-6 py-3 rounded-2xl flex items-center gap-2.5 text-sm font-bold cursor-not-allowed"
              title="该标准暂无电子版"
            >
              <Download size={18} />
              暂无源文件
            </button>
            <span className="text-xs text-slate-400">该标准暂无电子版，请联系管理员</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDownload}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2.5 text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Download size={18} />
            {hasFile === null ? '尝试下载' : '下载源文件'}
          </button>
        )}
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="mb-10 page-detail-2col">
        <MetadataCard
          title="基础元数据"
          icon={FileText}
          fields={[
            [
              { label: '英文名称', value: base_info.std_englishname, colSpan: 'full' },
              { label: '标准类别', value: base_info.std_type, highlight: true },
              {
                label: '内部状态',
                value: statusMeta.label,
                statusBadge: statusMeta.color,
              },
              { label: '发布日期', value: base_info.release_date },
              { label: '实施日期', value: base_info.implement_date },
            ],
          ]}
        />
        <MetadataCard
          title="领域扩展明细"
          icon={LayoutGrid}
          fields={[
            [
              { label: 'ICS 分类码', value: detail_info?.ics },
              { label: 'CCS 分类码', value: detail_info?.ccs },
              {
                label: '起草单位',
                value: detail_info?.top_drafters?.length ? detail_info.top_drafters : null,
                colSpan: 'full',
              },
              { label: '归口单位', value: detail_info?.governing_unit, colSpan: 'full' },
            ],
          ]}
        />
      </div>

      {/* 标准演进图谱 */}
      <SectionCard title="标准演进图谱" icon={History} className="mb-10">
        {replace_history?.length > 0 && (
          <ReplaceHistoryTimeline
            items={replace_history}
            onNavigate={navigateToStandard}
          />
        )}

        <EvolutionGraph
          chainData={ped_chain}
          currentStdId={base_info.std_id}
          returnPath={`/detail/${encodeURIComponent(base_info.std_id)}`}
          parentNavState={location.state}
          embedded
        />
      </SectionCard>
      
      {/* Additional Details (Scope) */}
      {detail_info?.scope && (
        <SectionCard title="规范适用范围" icon={FileText}>
          <p className="text-base leading-relaxed text-slate-600 md:text-lg">
            {detail_info.scope}
          </p>
        </SectionCard>
      )}
    </div>
  );
};

export default DetailPage;
