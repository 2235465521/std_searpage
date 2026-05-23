import React from 'react';
import { Briefcase, AppWindow, FileText, Settings, LogOut, Layout } from 'lucide-react';

const menuItems = [
  { icon: Briefcase, label: '核心业务', id: 'core' },
  { icon: AppWindow, label: '智能应用', id: 'apps' },
  { icon: FileText, label: '标准评审', id: 'review', active: true },
];

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-100 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-blue-800">智审平台</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Luminous Curator</p>
      </div>

      <nav className="flex-1 px-3 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              item.active 
                ? 'bg-blue-50 text-blue-600 font-medium' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <item.icon size={20} />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-6 border-t border-slate-50">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <Settings size={20} />
          <span className="text-sm">账户设置</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <LogOut size={20} />
          <span className="text-sm">退出登录</span>
        </button>
      </div>
    </aside>
  );
}
