import React from 'react';

export default function SectionCard({ title, icon: Icon, children, className = '', bodyClassName = '' }) {
  return (
    <section
      className={[
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.05)]',
        className,
      ].join(' ')}
    >
      <header className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-white px-5 py-4">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/10">
            <Icon size={17} strokeWidth={2.25} />
          </span>
        ) : null}
        <h3 className="text-sm font-bold tracking-tight text-slate-800">{title}</h3>
      </header>
      <div className={['p-5 md:p-6', bodyClassName].join(' ')}>{children}</div>
    </section>
  );
}
