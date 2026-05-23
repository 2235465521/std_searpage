import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InfoFieldProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const InfoField = ({ label, value, highlight }: InfoFieldProps) => (
  <div className="mb-4">
    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-center">
      {highlight ? (
        <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded font-medium border border-blue-100">
          {value}
        </span>
      ) : (
        <span className="text-sm text-slate-700 font-medium">{value}</span>
      )}
    </div>
  </div>
);

interface MetadataCardProps {
  title: string;
  icon: LucideIcon;
  fields: InfoFieldProps[][];
}

export default function MetadataCard({ title, icon: Icon, fields }: MetadataCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex-1">
      <div className="flex items-center gap-2 mb-6">
        <Icon size={18} className="text-blue-600" />
        <h3 className="font-bold text-slate-800 tracking-tight">{title}</h3>
      </div>
      
      <div className="flex gap-12">
        {fields.map((column, i) => (
          <div key={i} className="flex-1">
            {column.map((field, j) => (
              <InfoField key={j} {...field} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
