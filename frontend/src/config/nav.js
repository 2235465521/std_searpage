export const UNITS_TAB_KEYS = ['search', 'firstLead', 'firstJoin'];
export const ANALYTICS_TAB_KEYS = ['table', 'bar', 'pie', 'year'];

export const MAIN_NAV_ITEMS = [
  {
    to: '/search',
    icon: 'fact_check',
    label: '标准检索',
    mobileLabel: '检索',
    desc: '检索与浏览标准',
  },
  {
    to: '/analytics',
    icon: 'analytics',
    label: '数据分析',
    mobileLabel: '分析',
    desc: '统计与趋势',
  },
  {
    to: '/units',
    icon: 'corporate_fare',
    label: '起草单位查询',
    mobileLabel: '单位',
    desc: '按单位查标准',
    children: [
      { to: '/units', tab: 'search', label: '起草单位查询' },
      { to: '/units?tab=firstLead', tab: 'firstLead', label: '历史首家牵头国标' },
      { to: '/units?tab=firstJoin', tab: 'firstJoin', label: '单位首次参与' },
    ],
  },
];

export const ADMIN_NAV_ITEM = {
  to: '/register',
  icon: 'person_add',
  label: '分配人员账号',
  mobileLabel: '分配',
  desc: '管理员专用',
};

export function resolveUnitsTab(searchParams, fallback = 'search') {
  const tab = searchParams?.get?.('tab');
  return tab && UNITS_TAB_KEYS.includes(tab) ? tab : fallback;
}

export function resolveAnalyticsTab(searchParams, fallback = 'table') {
  const tab = searchParams?.get?.('tab');
  return tab && ANALYTICS_TAB_KEYS.includes(tab) ? tab : fallback;
}

export function isSubNavActive(child, pathname, searchParams) {
  if (child.pathOnly) {
    return pathname.startsWith(child.to);
  }

  const basePath = child.to.split('?')[0];
  if (pathname !== basePath) return false;
  if (basePath === '/units' && pathname.startsWith('/units/stats')) return false;

  const defaultTab = basePath === '/units' ? 'search' : 'table';
  const expectedTab = child.tab ?? defaultTab;
  const currentTab = searchParams.get('tab') || defaultTab;
  return currentTab === expectedTab;
}

export function isNavGroupActive(item, pathname) {
  const basePath = item.to.split('?')[0];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function getNavPageTitle(pathname, searchParams) {
  if (pathname.startsWith('/detail/')) return '标准详情';
  if (pathname.startsWith('/register')) return '分配人员账号';

  const match = MAIN_NAV_ITEMS.find((item) => isNavGroupActive(item, pathname));
  if (!match) return '智审平台';

  if (match.children?.length) {
    const activeChild = match.children.find((child) => isSubNavActive(child, pathname, searchParams));
    if (activeChild && activeChild.label !== match.label) {
      return `${match.label} · ${activeChild.label}`;
    }
    if (activeChild) return activeChild.label;
  }

  return match.label;
}
