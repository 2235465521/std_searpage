import React from 'react';
import { Bell, Settings, HelpCircle, User } from 'lucide-react';

export default function TopHeader() {
  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40 ml-64">
      <h2 className="text-lg font-bold text-blue-900">智能评审系统</h2>
      
      <div className="flex items-center gap-6 text-slate-500">
        <button className="hover:text-blue-600 transition-colors">
          <Bell size={20} />
        </button>
        <button className="hover:text-blue-600 transition-colors">
          <Settings size={20} />
        </button>
        <button className="hover:text-blue-600 transition-colors">
          <HelpCircle size={20} />
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden ml-2 border border-slate-300">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop" 
            alt="User profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
