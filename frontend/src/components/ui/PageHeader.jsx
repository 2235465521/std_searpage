import React from 'react';



export default function PageHeader({ title, subtitle, extra, badge, compact = false }) {

  return (

    <div

      className={[

        'page-toolbar flex min-w-0 flex-col gap-2',

        compact ? 'mb-3' : 'mb-6 gap-3',

      ].join(' ')}

    >

      <div className="min-w-0">

        <div className="flex flex-wrap items-center gap-2">

          <h2

            className={[

              'font-headline font-bold tracking-tight text-on-surface',

              compact ? 'text-xl' : 'text-[1.5rem]',

            ].join(' ')}

          >

            {title}

          </h2>

          {badge ? (

            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100">

              {badge}

            </span>

          ) : null}

        </div>

        {subtitle ? (

          <p

            className={[

              'max-w-2xl text-on-surface-variant',

              compact ? 'mt-0.5 text-xs leading-snug' : 'mt-1.5 text-sm leading-relaxed',

            ].join(' ')}

          >

            {subtitle}

          </p>

        ) : null}

      </div>

      {extra ? <div className="shrink-0">{extra}</div> : null}

    </div>

  );

}

