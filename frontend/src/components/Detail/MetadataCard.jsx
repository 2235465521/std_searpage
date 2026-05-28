import React from 'react';

const EMPTY = '—';

function displayValue(value) {
  if (value == null || value === '') return EMPTY;
  if (typeof value === 'string' && value.trim() === '') return EMPTY;
  return value;
}

const InfoField = ({ label, value, highlight, statusBadge, colSpan }) => {
  const drafters = Array.isArray(value) ? value.filter(Boolean) : null;
  const text = displayValue(value);
  const isEmpty = text === EMPTY;

  return (
    <div className={colSpan === 'full' ? 'page-meta-full' : ''}>
      <p className="mb-1.5 text-[11px] font-medium text-slate-500">{label}</p>
      {statusBadge ? (
        <span
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusBadge}`}
        >
          {text}
        </span>
      ) : highlight ? (
        <span className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm shadow-blue-600/20">
          {text}
        </span>
      ) : drafters?.length ? (
        <ul className="space-y-2">
          {drafters.map((name, index) => (
            <li
              key={`${name}-${index}`}
              className="flex gap-2.5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200/80">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-xs font-medium leading-relaxed text-slate-700">
                {name}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={`text-sm leading-relaxed break-words ${
            isEmpty ? 'font-normal text-slate-300' : 'font-semibold text-slate-800'
          }`}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default function MetadataCard({ title, icon: Icon, fields }) {
  const items = fields.flat();

  return (
    <article className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_8px_30px_rgba(15,23,42,0.07)]">
      <header className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-white px-5 py-4">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/10">
            <Icon size={17} strokeWidth={2.25} />
          </span>
        )}
        <h3 className="text-sm font-bold tracking-tight text-slate-800">{title}</h3>
      </header>

      <div className="page-meta-grid">
        {items.map((field, i) => (
          <InfoField key={`${field.label}-${i}`} {...field} />
        ))}
      </div>
    </article>
  );
};
