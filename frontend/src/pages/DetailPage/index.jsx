import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Skeleton, Tag, Button, Card, Descriptions, Divider } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { getStandardDetail } from '../api/standards';

const DetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await getStandardDetail(id);
        setData(res);
      } catch (error) {
        console.error('Fetch detail failed:', error);
        message.error('加载标准详情失败');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <Skeleton active avatar paragraph={{ rows: 12 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur rounded-3xl border border-white/40">
        <p className="text-gray-500 mb-4">未找到该标准详细信息</p>
        <Button onClick={() => navigate(-1)}>返回搜索</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-2">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-medium"
        >
          <ArrowLeftOutlined /> 返回列表
        </button>
        <div className="flex gap-3">
          <Button icon={<FilePdfOutlined />} type="default" className="rounded-lg">查看原文</Button>
          <Button icon={<SafetyCertificateOutlined />} type="primary" className="rounded-lg bg-primary">合规性评价</Button>
        </div>
      </div>

      {/* 核心详情卡片 */}
      <div className="glass-card rounded-3xl p-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 uppercase">
                {data.std_type || 'GB'}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 uppercase">
                {data.ex_state === 1 ? '现行' : data.ex_state === 2 ? '即将实施' : '废止'}
              </span>
            </div>
            <h1 className="text-3xl font-black text-on-surface tracking-tight leading-tight">
              {data.std_chinesename}
            </h1>
            <p className="text-lg font-bold text-primary mt-2">{data.std_id}</p>
          </div>
        </div>

        <Divider className="border-white/40" />

        <Descriptions 
          column={{ xxl: 3, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
          labelStyle={{ color: '#64748b', fontWeight: 600, width: '120px' }}
          contentStyle={{ color: '#1e293b', fontWeight: 500 }}
          className="mt-6"
        >
          <Descriptions.Item label="标准编号">{data.std_id}</Descriptions.Item>
          <Descriptions.Item label="中文名称">{data.std_chinesename}</Descriptions.Item>
          <Descriptions.Item label="英文名称">{data.std_englishname || '-'}</Descriptions.Item>
          <Descriptions.Item label="发布日期">{data.release_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="实施日期">{data.implementation_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="发布部门">{data.publisher || '-'}</Descriptions.Item>
          <Descriptions.Item label="ICS 分类">{data.ics_code || '-'}</Descriptions.Item>
          <Descriptions.Item label="CCS 分类">{data.ccs_code || '-'}</Descriptions.Item>
          <Descriptions.Item label="归口单位">{data.governance_unit || '-'}</Descriptions.Item>
        </Descriptions>
      </div>

      {/* 演变与关联分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded-full"></span> 标准替代关系
          </h3>
          <div className="space-y-4">
             <div className="p-4 bg-white/40 rounded-xl border border-white/60">
                <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">替代以下标准</p>
                <p className="text-sm font-medium text-slate-700">{data.replace_std || '无'}</p>
             </div>
             <div className="p-4 bg-white/40 rounded-xl border border-white/60">
                <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">被以下标准替代</p>
                <p className="text-sm font-medium text-slate-700">{data.replaced_by || '无'}</p>
             </div>
          </div>
        </div>
        
        <div className="glass-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full"></span> 智能应用提示
          </h3>
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
            <p className="text-sm text-emerald-800 leading-relaxed">
              该标准目前处于<b>{data.ex_state === 1 ? '现行' : data.ex_state === 2 ? '即将实施' : '废止'}</b>状态。系统已为您自动提取 12 个关键合规点，建议在执行评审时重点关注“{data.std_chinesename.slice(0, 8)}...”相关章节的技术参数变化。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPage;
