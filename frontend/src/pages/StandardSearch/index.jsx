import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import SearchFilter from './components/SearchFilter';
import StandardTable from './components/StandardTable';
import PageHeader from '../../components/ui/PageHeader';
import {
  searchStandards,
  readListCache,
  writeListCache,
  invalidateListCache,
  prefetchSearchList,
  resolveListTotal,
  normalizePagination,
} from '../../api/standards';
import {
  AUTO_QUERY_PAGES,
  markPageAutoQueryDone,
  shouldPageAutoQueryOnFirstVisit,
} from '../../utils/sessionAutoQuery';

const DEFAULT_PAGE_SIZE = 10;
const LAST_SEARCH_PARAMS_KEY = 'standard_search_last_params:v1';

const normalizeFormValues = (values = {}) => {
  const formValues = {};
  const keyword = values.keyword?.trim();
  if (keyword) formValues.keyword = keyword;
  if (values.std_type) formValues.std_type = values.std_type;
  if (values.status !== undefined && values.status !== null && values.status !== '') {
    formValues.status = values.status;
  }
  return formValues;
};

const parsePage = (searchParams) => {
  const page = parseInt(searchParams.get('page') || '1', 10);
  return Number.isNaN(page) || page < 1 ? 1 : page;
};

const parsePageSize = (searchParams) => {
  const size = parseInt(searchParams.get('size') || String(DEFAULT_PAGE_SIZE), 10);
  return Number.isNaN(size) || size < 1 ? DEFAULT_PAGE_SIZE : size;
};

const parseFilters = (searchParams) => {
  const filters = {};
  const keyword = searchParams.get('keyword');
  if (keyword) filters.keyword = keyword;
  const std_type = searchParams.get('std_type');
  if (std_type) filters.std_type = std_type;
  const status = searchParams.get('status');
  if (status !== null && status !== '') {
    const n = parseInt(status, 10);
    if (!Number.isNaN(n)) filters.status = n;
  }
  return filters;
};

const buildSearchParams = (page, pageSize, formValues, { markSearched = true } = {}) => {
  const params = new URLSearchParams();
  if (markSearched) params.set('searched', '1');
  if (page > 1) params.set('page', String(page));
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set('size', String(pageSize));
  if (formValues.keyword) params.set('keyword', formValues.keyword.trim());
  if (formValues.std_type) params.set('std_type', formValues.std_type);
  if (formValues.status !== undefined && formValues.status !== null && formValues.status !== '') {
    params.set('status', String(formValues.status));
  }
  return params;
};

const buildApiParams = (page, pageSize, formValues, { skipCount = false } = {}) => ({
  page,
  size: pageSize,
  ...(skipCount ? { skip_count: 1 } : {}),
  ...formValues,
  ...(formValues.keyword ? { keyword: formValues.keyword.trim() } : {}),
});

const AUTO_QUERY_PAGE = AUTO_QUERY_PAGES.SEARCH;

const StandardSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [filters, setFilters] = useState({});
  const [totalPending, setTotalPending] = useState(false);
  const shouldAutoQueryOnInitRef = useRef(shouldPageAutoQueryOnFirstVisit(AUTO_QUERY_PAGE));

  const returnPath = `/search${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const filterQueryKey = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('page');
    params.delete('searched');
    return params.toString();
  }, [searchParams]);
  const filterInitialValues = useMemo(() => parseFilters(searchParams), [filterQueryKey]);

  const getPage1CacheTotal = (pageSize, formValues) => {
    const page1Key = buildSearchParams(1, pageSize, formValues).toString();
    const cached = readListCache(page1Key);
    const total = cached?.pagination?.total;
    return typeof total === 'number' && total >= 0 ? total : undefined;
  };

  /** 翻页时若尚无总数，先请求第 1 页拿到 total（写入缓存供后续 skip_count 使用） */
  const fetchTotalIfNeeded = async (pageSize, formValues, hintTotal) => {
    let total = resolveListTotal(hintTotal, getPage1CacheTotal(pageSize, formValues));
    if (total > 0) return total;

    const res = await searchStandards(buildApiParams(1, pageSize, formValues, { skipCount: false }));
    total = resolveListTotal(res.total, 0);
    if (total > 0) {
      const page1Key = buildSearchParams(1, pageSize, formValues).toString();
      const existing = readListCache(page1Key);
      writeListCache(page1Key, {
        data: existing?.data ?? res.items ?? [],
        pagination: { current: 1, pageSize, total },
        filters: formValues,
      });
    }
    return total;
  };

  const prefetchNextPage = (page, pageSize, formValues, total) => {
    const safeTotal = resolveListTotal(total, 0);
    const totalPages = Math.ceil(safeTotal / pageSize) || 1;
    if (page >= totalPages) return;

    const nextPage = page + 1;
    const nextKey = buildSearchParams(nextPage, pageSize, formValues).toString();
    prefetchSearchList(
      buildApiParams(nextPage, pageSize, formValues, { skipCount: true }),
      nextKey,
      safeTotal,
    );
  };

  const isWideOpenFirstPage = (page, formValues) =>
    page === 1 &&
    !formValues.keyword &&
    !formValues.std_type &&
    (formValues.status === undefined || formValues.status === null || formValues.status === '');

  const isTentativeListTotal = (cached, pageSize, formValues) => {
    if (!cached) return false;
    const rows = cached.data?.length ?? 0;
    const total = cached.pagination?.total ?? 0;
    if (!isWideOpenFirstPage(1, formValues) || rows <= 0) return false;
    if (cached.totalPending) return true;
    return total === rows && rows >= pageSize;
  };

  const refreshListTotal = useCallback(async (pageSize, formValues, cacheKey, items) => {
    setTotalPending(true);
    try {
      const full = await searchStandards(buildApiParams(1, pageSize, formValues, { skipCount: false }));
      const total = resolveListTotal(full.total, 0);
      const page1Key = buildSearchParams(1, pageSize, formValues).toString();
      const nextPagination = normalizePagination(1, pageSize, total);
      setTotalPending(false);
      setPagination(nextPagination);
      const payload = {
        data: items,
        pagination: nextPagination,
        filters: formValues,
        totalPending: false,
      };
      writeListCache(page1Key, payload);
      writeListCache(cacheKey || page1Key, payload);
      prefetchNextPage(1, pageSize, formValues, nextPagination.total);
    } catch (error) {
      console.error('Fetch search total failed:', error);
      setTotalPending(false);
    }
  }, []);

  const fetchData = async (page, pageSize, formValues, cacheKey, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const totalHint =
        page === 1 ? undefined : getPage1CacheTotal(pageSize, formValues) ?? pagination.total;

      // 登录后默认全量检索：先 skip_count 拉列表（快），再后台补 total（慢）
      if (isWideOpenFirstPage(page, formValues) && !getPage1CacheTotal(pageSize, formValues)) {
        setTotalPending(true);
        const res = await searchStandards(
          buildApiParams(1, pageSize, formValues, { skipCount: true }),
        );
        const items = res.items || [];
        const page1Key = buildSearchParams(1, pageSize, formValues).toString();
        const tentativePagination = { current: 1, pageSize, total: 0 };
        setData(items);
        setPagination(tentativePagination);
        setFilters(formValues);
        const pendingPayload = {
          data: items,
          pagination: tentativePagination,
          filters: formValues,
          totalPending: true,
        };
        writeListCache(cacheKey, pendingPayload);
        writeListCache(page1Key, pendingPayload);
        if (cacheKey) sessionStorage.setItem(LAST_SEARCH_PARAMS_KEY, cacheKey);
        markPageAutoQueryDone(AUTO_QUERY_PAGE);

        refreshListTotal(pageSize, formValues, cacheKey || page1Key, items);
        return;
      }

      setTotalPending(false);

      let total = await fetchTotalIfNeeded(pageSize, formValues, totalHint);

      if (total <= 0 && page > 1) {
        setSearchParams(buildSearchParams(1, pageSize, formValues));
        return;
      }

      let nextPagination = normalizePagination(page, pageSize, total);
      if (nextPagination.current !== page) {
        setSearchParams(buildSearchParams(nextPagination.current, pageSize, formValues));
        return;
      }

      const res = await searchStandards(
        buildApiParams(page, pageSize, formValues, { skipCount: page > 1 && total > 0 }),
      );
      const items = res.items || [];

      if (page === 1) {
        total = resolveListTotal(res.total, total);
        nextPagination = normalizePagination(1, pageSize, total);
        const page1Key = buildSearchParams(1, pageSize, formValues).toString();
        writeListCache(page1Key, { data: items, pagination: nextPagination, filters: formValues });
      }

      setData(items);
      setPagination(nextPagination);
      setFilters(formValues);
      writeListCache(cacheKey, { data: items, pagination: nextPagination, filters: formValues });
      if (cacheKey) sessionStorage.setItem(LAST_SEARCH_PARAMS_KEY, cacheKey);
      markPageAutoQueryDone(AUTO_QUERY_PAGE);
      prefetchNextPage(nextPagination.current, pageSize, formValues, nextPagination.total);
    } catch (error) {
      console.error('Fetch search failed:', error);
      message.error('获取数据失败，请检查网络或登录状态');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchParams.toString()) {
      const lastSearch = sessionStorage.getItem(LAST_SEARCH_PARAMS_KEY);
      if (lastSearch) {
        setSearchParams(new URLSearchParams(lastSearch));
        return;
      }
      
      // 如果没有查询参数且没有历史记录，则默认自动查第一页
      setSearchParams(buildSearchParams(1, DEFAULT_PAGE_SIZE, {}));
      return;
    }
    const cacheKey = searchParams.toString();
    const page = parsePage(searchParams);
    const pageSize = parsePageSize(searchParams);
    const formValues = parseFilters(searchParams);

    const cached = readListCache(cacheKey);
    if (cached) {
      const fallbackTotal = getPage1CacheTotal(pageSize, formValues) ?? pagination.total;
      const tentative = isTentativeListTotal(cached, pageSize, formValues);
      const total = tentative ? 0 : resolveListTotal(cached.pagination?.total, fallbackTotal);
      if (total <= 0 && !tentative) {
        fetchData(page, pageSize, formValues, cacheKey, true);
        return;
      }
      const safePagination = normalizePagination(page, pageSize, total || fallbackTotal || 0);
      if (safePagination.current !== page) {
        setSearchParams(buildSearchParams(safePagination.current, pageSize, formValues));
        return;
      }
      setData(cached.data);
      setPagination(safePagination);
      setFilters(cached.filters);
      setLoading(false);
      setTotalPending(!!tentative);
      if (cacheKey) sessionStorage.setItem(LAST_SEARCH_PARAMS_KEY, cacheKey);
      if (tentative) {
        refreshListTotal(pageSize, formValues, cacheKey, cached.data || []);
        return;
      }
      prefetchNextPage(page, pageSize, formValues, safePagination.total);
      return;
    }

    setFilters(formValues);
    fetchData(page, pageSize, formValues, cacheKey, true);
  }, [searchParams]);

  const applySearch = (values = {}) => {
    const formValues = normalizeFormValues(values);
    const nextParams = buildSearchParams(1, pagination.pageSize, formValues);
    const cacheKey = nextParams.toString();

    // URL 未变时（例如无筛选再次点「查询」）也要重新请求
    if (cacheKey === searchParams.toString()) {
      invalidateListCache(cacheKey);
      setFilters(formValues);
      fetchData(1, pagination.pageSize, formValues, cacheKey, true);
      return;
    }

    setSearchParams(nextParams);
  };

  const handlePageChange = (newPage) => {
    const nextKey = buildSearchParams(newPage, pagination.pageSize, filters).toString();
    const cached = readListCache(nextKey);
    const fallbackTotal = getPage1CacheTotal(pagination.pageSize, filters) ?? pagination.total;
    const total = cached
      ? resolveListTotal(cached.pagination?.total, fallbackTotal)
      : fallbackTotal;
    const safePagination = normalizePagination(newPage, pagination.pageSize, total);

    if (cached && total > 0) {
      setData(cached.data);
      setPagination(safePagination);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setSearchParams(buildSearchParams(safePagination.current, pagination.pageSize, filters));
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="标准检索中心"
        subtitle="支持标准号、名称、类型与执行状态组合检索，点击行或「查看详情」进入标准详情页"
        badge={pagination.total > 0 && !totalPending ? `${pagination.total.toLocaleString()} 条` : undefined}
      />

      <SearchFilter
        key={filterQueryKey || 'default'}
        onSearch={applySearch}
        onReset={() => applySearch({})}
        loading={loading}
        initialValues={filterInitialValues}
      />

      <div className="h-6" />

      <StandardTable
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        returnPath={returnPath}
        totalPending={totalPending}
      />
    </div>
  );
};

export default StandardSearch;
