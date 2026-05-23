import React from 'react';
import { Skeleton, Spin } from 'antd';

export default function LoadingPanel({ variant = 'spin', rows = 5, label = '加载中…' }) {
  if (variant === 'skeleton') {
    return (
      <div className="glass-card rounded-xl p-8">
        <Skeleton active paragraph={{ rows }} />
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-col items-center justify-center rounded-xl px-6 py-14">
      <Spin size="large" />
      <p className="mt-4 text-sm font-medium text-slate-400">{label}</p>
    </div>
  );
}
