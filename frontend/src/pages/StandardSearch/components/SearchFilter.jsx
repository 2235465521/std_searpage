import React from 'react';
import { Form, Input, Select } from 'antd';

const formItemClass =
  'search-filter-item mb-0 min-w-0 w-full max-w-full [&_.ant-form-item-explain]:hidden [&_.ant-form-item-control]:min-w-0 [&_.ant-form-item-control-input]:min-w-0 [&_.ant-form-item-control-input-content]:w-full';

const labelEl = (text) => (
  <span className="font-label text-xs text-on-surface-variant font-medium leading-5 block">
    {text}
  </span>
);

/** 统一为「中文名称 (代号)」，下拉与选中显示一致 */
const STD_TYPE_OPTIONS = [
  { value: 'GB', label: '国家标准 (GB)' },
  { value: 'HB', label: '行业标准 (HB)' },
  { value: 'DB', label: '地方标准 (DB)' },
  { value: 'TB', label: '团体标准 (TB)' },
  { value: 'ISO', label: '国际标准 (ISO)' },
  { value: 'IEC', label: '国际电工标准 (IEC)' },
  { value: 'IEEE', label: '电气电子标准 (IEEE)' },
];

const SearchFilter = ({ onSearch, onReset, loading, initialValues }) => {
  const [form] = Form.useForm();

  const handleReset = () => {
    form.resetFields();
    onReset?.();
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={onSearch}
      >
        <div className="search-filter-bar">
          <Form.Item
            name="keyword"
            label={labelEl('综合检索')}
            className={`${formItemClass} search-filter-item--1`}
          >
            <Input
              className="search-filter-control search-filter-keyword w-full bg-surface-container-low text-sm rounded-lg border-none focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-colors outline-none"
              placeholder="输入标准名称或编号"
              allowClear
              prefix={
                <span className="material-symbols-outlined text-slate-400 text-sm leading-none">search</span>
              }
            />
          </Form.Item>

          <Form.Item
            name="std_type"
            label={labelEl('所属类别')}
            className={`${formItemClass} search-filter-item--2`}
          >
            <Select
              placeholder="全部分类"
              allowClear
              className="search-filter-control w-full max-w-full custom-select-transparent"
              popupMatchSelectWidth={280}
              suffixIcon={<span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>}
              options={STD_TYPE_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label={labelEl('执行状态')}
            className={`${formItemClass} search-filter-item--3`}
          >
            <Select
              placeholder="所有状态"
              allowClear
              className="search-filter-control w-full max-w-full custom-select-transparent"
              suffixIcon={<span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>}
              options={[
                { value: 1, label: '现行' },
                { value: 0, label: '废止' },
                { value: 2, label: '即将实施' },
              ]}
            />
          </Form.Item>

          <div className="search-filter-actions">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="search-filter-btn search-filter-item--4 search-filter-reset px-4 rounded-lg border border-outline-variant/50 bg-white/60 text-on-surface-variant font-medium text-sm hover:bg-surface-container-high hover:border-outline-variant transition-colors inline-flex flex-row items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base leading-none">restart_alt</span>
              全部清空
            </button>
            <button
              type="submit"
              disabled={loading}
              className="search-filter-btn search-filter-item--5 search-filter-submit px-5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-container hover:shadow-lg hover:shadow-primary/20 transition-all inline-flex flex-row items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base leading-none">search</span>
              {loading ? '查询中...' : '查询'}
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default SearchFilter;
