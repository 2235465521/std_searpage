/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import MetadataCard from './components/MetadataCard';
import EvolutionGraph from './components/EvolutionGraph';
import { ArrowLeft, Download, FileText, LayoutGrid, Info, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('evolution');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <div className="ml-64 flex flex-col min-h-screen">
        <TopHeader />
        
        <main className="p-8 flex-1">
          {/* Sub Header / Action Area */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm text-slate-600 hover:text-blue-600 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">GB 1000.1-1988</h2>
                  <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">已废止</span>
                </div>
                <p className="text-slate-500 text-sm mt-1">高压线路针式瓷绝缘子技术条件</p>
              </div>
            </div>
            
            <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <Download size={18} />
              下载源文件 (PDF)
            </button>
          </div>

          {/* Metadata Grid */}
          <div className="flex gap-6 mb-8">
            <MetadataCard 
              title="基础元数据" 
              icon={FileText}
              fields={[
                [
                  { label: '英文名称', value: 'Pin insulators of ceramic material for high voltage overhead lines--Technical specifications' },
                  { label: '标准类别', value: 'GB', highlight: true },
                  { label: '发布日期', value: '1988-08-10' }
                ],
                [
                  { label: '', value: '' }, // Spacer
                  { label: '系统内部状态', value: '未知' },
                  { label: '实施日期', value: '1989-07-01' }
                ]
              ]}
            />
            <MetadataCard 
              title="领域扩展明细" 
              icon={LayoutGrid}
              fields={[
                [
                  { label: 'ICS 分类码', value: '29.080.10' },
                  { label: '归口/起草单位', value: '-' }
                ],
                [
                  { label: 'CCS 分类码', value: 'K48' }
                ]
              ]}
            />
          </div>

          {/* Evolution Section */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="border-b border-slate-50 px-6">
              <div className="flex gap-8">
                <button 
                  onClick={() => setActiveTab('evolution')}
                  className={`py-4 text-sm font-bold transition-all relative ${activeTab === 'evolution' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                  标准演进图谱
                  {activeTab === 'evolution' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('traceability')}
                  className={`py-4 text-sm font-bold transition-all relative ${activeTab === 'traceability' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                  标准溯源关联
                  {activeTab === 'traceability' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 text-sm text-slate-700 bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 mb-6 font-medium">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Clock size={14} />
                </div>
                该版本直接或间接替代了旧版标准：<span className="text-blue-600 font-bold">GB 1000-1981</span>
              </div>

              <div className="relative border border-slate-50 rounded-xl bg-slate-50/10">
                <EvolutionGraph />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

