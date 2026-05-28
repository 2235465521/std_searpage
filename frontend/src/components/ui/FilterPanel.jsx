import React from 'react';
import { Input, Select } from 'antd';

export function FilterField({ label, children, className = '', compact = false }) {
  return (
    <div className={`min-w-0 ${compact ? 'panel-filter-field-compact' : ''} ${className}`}>
      <p
        className={[
          'panel-filter-label block font-label text-xs font-medium text-on-surface-variant',
          compact ? 'mb-0.5 leading-4' : 'mb-1 leading-5',
        ].join(' ')}
      >
        {label}
      </p>
      <div className="panel-filter-control w-full">{children}</div>
    </div>
  );
}

export const filterSelectSuffixIcon = (
  <span className="material-symbols-outlined text-lg leading-none text-slate-400">expand_more</span>
);

function mergeClassName(base, extra) {
  return [base, extra].filter(Boolean).join(' ');
}

function defaultMultiTagPlaceholder(omittedValues) {
  if (!omittedValues?.length) return null;
  const labels = omittedValues
    .map((item) => (typeof item?.label === 'string' ? item.label : item?.value))
    .filter(Boolean);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return labels.join('、');
  return `${labels.length} 项已选`;
}

/** 与标准检索页一致的 filled 下拉框 */
export function FilterSelect({
  className,
  suffixIcon,
  mode,
  maxTagCount,
  maxTagPlaceholder,
  ...props
}) {
  const isMultiple = mode === 'multiple';

  return (
    <Select
      variant="filled"
      mode={mode}
      className={mergeClassName(
        'panel-filter-select w-full max-w-full',
        isMultiple ? 'panel-filter-select-multiple' : '',
        className,
      )}
      suffixIcon={suffixIcon ?? filterSelectSuffixIcon}
      maxTagCount={isMultiple ? (maxTagCount ?? 0) : maxTagCount}
      maxTagPlaceholder={
        isMultiple
          ? (maxTagPlaceholder ?? defaultMultiTagPlaceholder)
          : maxTagPlaceholder
      }
      {...props}
    />
  );
}

/** 与标准检索页一致的 filled 输入框 */
export function FilterInput({ className, ...props }) {
  return (
    <Input
      variant="filled"
      className={mergeClassName('panel-filter-input w-full', className)}
      {...props}
    />
  );
}

export default function FilterPanel({ children, hint, actions, className = '', compact = false }) {
  const hasFooter = hint || actions;

  return (
    <div
      className={[
        'glass-card min-w-0 rounded-xl',
        compact ? 'mb-3 p-4' : 'mb-4 p-6',
        className,
      ].join(' ')}
    >
      {children}
      {hasFooter ? (
        compact && hint && actions ? (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="min-w-0 text-xs leading-snug text-on-surface-variant">{hint}</p>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
          </div>
        ) : (
          <>
            {hint ? (
              <p
                className={[
                  'text-xs leading-relaxed text-on-surface-variant',
                  compact ? 'mt-2' : 'mt-3',
                ].join(' ')}
              >
                {hint}
              </p>
            ) : null}
            {actions ? (
              <div
                className={[
                  'flex flex-wrap items-center justify-end gap-2',
                  compact ? 'mt-2' : 'mt-4',
                ].join(' ')}
              >
                {actions}
              </div>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

export function FilterPrimaryButton({
  children,
  loading,
  disabled,
  onClick,
  type = 'button',
  icon = 'search',
  size = 'default',
  className = '',
}) {
  const sizeClass = size === 'compact' ? 'h-8 px-4 text-sm' : 'h-11 px-5 text-sm';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={[
        'panel-filter-btn inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary font-medium text-white transition-all hover:bg-primary-container hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50',
        sizeClass,
        className,
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-base leading-none">{icon}</span>
      {loading ? '处理中...' : children}
    </button>
  );
}

export function FilterSecondaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
  icon = 'restart_alt',
  size = 'default',
  className = '',
}) {
  const sizeClass = size === 'compact' ? 'h-8 px-3.5 text-sm' : 'h-11 px-4 text-sm';
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        'panel-filter-btn inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-outline-variant/50 bg-white/60 font-medium text-on-surface-variant transition-colors hover:border-outline-variant hover:bg-surface-container-high disabled:opacity-50',
        sizeClass,
        className,
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-base leading-none">{icon}</span>
      {children}
    </button>
  );
}
