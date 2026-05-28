import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearAuthTokens } from '../../api/tokenAuth';
import {
  ADMIN_NAV_ITEM,
  MAIN_NAV_ITEMS,
  isNavGroupActive,
  isSubNavActive,
} from '../../config/nav';
import { useSidebar } from '../../contexts/SidebarContext';

function navItemClass(isActive, compact = false, flyoutOpen = false) {
  return [
    'sidebar-nav-item',
    isActive ? 'is-active' : '',
    flyoutOpen && !isActive ? 'is-flyout-open' : '',
    compact ? 'is-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function NavItemContent({ icon, label, isActive, compact }) {
  return (
    <>
      <span className="sidebar-nav-icon">
        <span className="material-symbols-outlined text-[18px] leading-none">{icon}</span>
      </span>
      {!compact ? (
        <span className="sidebar-nav-text">
          <span className="sidebar-nav-label">{label}</span>
        </span>
      ) : null}
    </>
  );
}

function NavItemLink({ to, icon, label, desc, isActive, compact, showHoverTip }) {
  const [tipTop, setTipTop] = useState(0);
  const tipText = desc ? `${label} · ${desc}` : label;

  const handleHoverEnter = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTipTop(rect.top + rect.height / 2);
  };

  if (compact) {
    return (
      <div
        className="sidebar-hover-target relative flex justify-center py-0.5"
        onMouseEnter={handleHoverEnter}
      >
        <NavLink to={to} title={tipText} className={navItemClass(isActive, true)}>
          <NavItemContent icon={icon} label={label} isActive={isActive} compact />
        </NavLink>
        {showHoverTip ? (
          <span className="sidebar-hover-tip" style={{ top: tipTop }}>
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink to={to} title={tipText} className={navItemClass(isActive)}>
      <NavItemContent icon={icon} label={label} isActive={isActive} compact={false} />
    </NavLink>
  );
}

function NavGroupHeader({ item, isActive, expanded, onToggle, compact }) {
  return (
    <div className="sidebar-nav-group-head">
      <NavLink
        to={item.to}
        title={item.desc ? `${item.label} · ${item.desc}` : item.label}
        className={['sidebar-nav-group-link', navItemClass(isActive, compact)].join(' ')}
      >
        <NavItemContent icon={item.icon} label={item.label} isActive={isActive} compact={compact} />
      </NavLink>
      {!compact ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? '收起子页面' : '展开子页面'}
          onClick={onToggle}
          className={['sidebar-nav-toggle', expanded ? 'is-expanded' : ''].filter(Boolean).join(' ')}
        >
          <span className="material-symbols-outlined text-[17px] leading-none">expand_more</span>
        </button>
      ) : null}
    </div>
  );
}

function NavSubItem({ to, label, isActive, collapsed = false, onNavigate }) {
  if (collapsed) {
    return (
      <NavLink
        to={to}
        onClick={onNavigate}
        className={() => ['sidebar-flyout-link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
      >
        {label}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      className={() => ['sidebar-nav-subitem', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
    >
      {label}
    </NavLink>
  );
}

function SidebarFlyoutBackdrop({ onClose }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <button
      type="button"
      aria-label="关闭子菜单"
      className="sidebar-flyout-backdrop"
      onMouseDown={(event) => {
        event.preventDefault();
        onClose();
      }}
    />,
    document.body,
  );
}

function CollapsedFlyoutMenu({ item, pathname, searchParams, anchorTop, onNavigate }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="sidebar-flyout-menu is-open"
      style={{ top: anchorTop }}
      role="menu"
      aria-label={`${item.label}子页面`}
    >
      <div className="sidebar-flyout-panel">
        <span className="sidebar-flyout-arrow" aria-hidden />
        {item.children.map((child) => (
          <NavSubItem
            key={child.to}
            to={child.to}
            label={child.label}
            isActive={isSubNavActive(child, pathname, searchParams)}
            collapsed
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}

function NavGroup({
  item,
  pathname,
  searchParams,
  compact,
  collapsed,
  showHoverTip,
  openFlyoutKey,
  onFlyoutToggle,
}) {
  const groupActive = isNavGroupActive(item, pathname);
  const [expanded, setExpanded] = useState(groupActive);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const [tipTop, setTipTop] = useState(0);
  const anchorRef = useRef(null);
  const flyoutOpen = openFlyoutKey === item.to;

  useEffect(() => {
    if (groupActive) setExpanded(true);
  }, [groupActive]);

  const updateFlyoutTop = () => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setFlyoutTop(Math.max(8, rect.top + rect.height / 2 - 28));
    }
  };

  const handleFlyoutToggle = () => {
    if (flyoutOpen) {
      onFlyoutToggle(null);
      return;
    }
    updateFlyoutTop();
    onFlyoutToggle(item.to);
  };

  useLayoutEffect(() => {
    if (!flyoutOpen || !collapsed) return undefined;

    updateFlyoutTop();

    const handleRelayout = () => updateFlyoutTop();
    window.addEventListener('resize', handleRelayout);
    window.addEventListener('scroll', handleRelayout, true);

    return () => {
      window.removeEventListener('resize', handleRelayout);
      window.removeEventListener('scroll', handleRelayout, true);
    };
  }, [flyoutOpen, collapsed]);

  if (!item.children?.length) {
    return (
      <NavItemLink
        to={item.to}
        icon={item.icon}
        label={item.label}
        desc={item.desc}
        isActive={groupActive}
        compact={compact}
        showHoverTip={showHoverTip}
      />
    );
  }

  if (collapsed) {
    const handleHoverEnter = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setTipTop(rect.top + rect.height / 2);
    };

    return (
      <div ref={anchorRef} className="relative flex justify-center py-0.5">
        <div
          className="sidebar-hover-target relative"
          onMouseEnter={handleHoverEnter}
        >
          <div className="sidebar-nav-collapsed-slot">
            <NavLink
              to={item.to}
              title={item.desc ? `${item.label} · ${item.desc}` : item.label}
              onClick={() => {
                if (flyoutOpen) onFlyoutToggle(null);
              }}
              className={navItemClass(groupActive, true)}
            >
              <NavItemContent icon={item.icon} label={item.label} isActive={groupActive} compact />
            </NavLink>
            <button
              type="button"
              className={['sidebar-nav-collapsed-chevron', flyoutOpen ? 'is-open' : '']
                .filter(Boolean)
                .join(' ')}
              aria-expanded={flyoutOpen}
              aria-haspopup="menu"
              aria-label={`展开${item.label}子页面`}
              onClick={(event) => {
                event.stopPropagation();
                handleFlyoutToggle();
              }}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">expand_more</span>
            </button>
          </div>
          {showHoverTip && !flyoutOpen ? (
            <span className="sidebar-hover-tip" style={{ top: tipTop }}>
              {item.label}
            </span>
          ) : null}
        </div>
        {flyoutOpen ? (
          <CollapsedFlyoutMenu
            item={item}
            pathname={pathname}
            searchParams={searchParams}
            anchorTop={flyoutTop}
            onNavigate={() => onFlyoutToggle(null)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={['sidebar-nav-group', groupActive ? 'is-active' : ''].filter(Boolean).join(' ')}>
      <NavGroupHeader
        item={item}
        isActive={groupActive}
        expanded={expanded}
        onToggle={() => setExpanded((open) => !open)}
        compact={compact}
      />
      {expanded && !compact ? (
        <div className="sidebar-nav-sublist">
          {item.children.map((child) => (
            <NavSubItem
              key={child.to}
              to={child.to}
              label={child.label}
              isActive={isSubNavActive(child, pathname, searchParams)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { collapsed, setCollapsed, loginSidebarReveal } = useSidebar();
  const [labelsVisible, setLabelsVisible] = useState(!collapsed);
  const [openFlyoutKey, setOpenFlyoutKey] = useState(null);
  const [logoutTipTop, setLogoutTipTop] = useState(0);
  const compactNav = collapsed || !labelsVisible;
  const isSuperAdmin = localStorage.getItem('user_role') === 'superadmin';

  useEffect(() => {
    if (collapsed) setLabelsVisible(false);
  }, [collapsed]);

  useEffect(() => {
    if (loginSidebarReveal && !collapsed) setLabelsVisible(true);
  }, [loginSidebarReveal, collapsed]);

  useEffect(() => {
    setOpenFlyoutKey(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!openFlyoutKey) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest('.sidebar-flyout-menu')
        || target.closest('.sidebar-flyout-backdrop')
        || target.closest('.sidebar-nav-collapsed-chevron')
      ) {
        return;
      }
      setOpenFlyoutKey(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenFlyoutKey(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openFlyoutKey]);

  const handleSidebarTransitionEnd = (event) => {
    if (event.currentTarget !== event.target) return;
    if (event.propertyName !== 'width') return;
    if (!collapsed) setLabelsVisible(true);
    if (collapsed) setOpenFlyoutKey(null);
  };

  const handleToggleCollapsed = () => {
    if (!collapsed) {
      setLabelsVisible(false);
      setOpenFlyoutKey(null);
      setCollapsed(true);
      return;
    }
    setCollapsed(false);
  };

  const handleLogout = () => {
    clearAuthTokens();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {openFlyoutKey ? (
        <SidebarFlyoutBackdrop onClose={() => setOpenFlyoutKey(null)} />
      ) : null}

      <aside
        className="layout-sidebar fixed left-0 top-0 z-40 hidden h-full flex-col overflow-x-hidden p-3 md:flex"
        onTransitionEnd={handleSidebarTransitionEnd}
      >
        <NavLink
          to="/search"
          title="返回标准检索"
          className={compactNav ? 'sidebar-brand sidebar-brand-link flex justify-center pb-3' : 'sidebar-brand sidebar-brand-link'}
        >
          <div className={compactNav ? 'flex justify-center' : 'flex items-center gap-2.5'}>
            <div className="sidebar-brand-mark">
              <span className="material-symbols-outlined text-[20px] leading-none">hub</span>
            </div>
            {!compactNav ? (
              <div className="sidebar-brand-text min-w-0">
                <h1 className="sidebar-brand-title">智审平台</h1>
              </div>
            ) : null}
          </div>
        </NavLink>

        <nav className="sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="sidebar-nav-list">
            {MAIN_NAV_ITEMS.map((item) => (
              <NavGroup
                key={item.to}
                item={item}
                pathname={location.pathname}
                searchParams={searchParams}
                compact={compactNav}
                collapsed={collapsed}
                showHoverTip={collapsed}
                openFlyoutKey={openFlyoutKey}
                onFlyoutToggle={setOpenFlyoutKey}
              />
            ))}
            {isSuperAdmin ? (
              <NavItemLink
                to={ADMIN_NAV_ITEM.to}
                icon={ADMIN_NAV_ITEM.icon}
                label={ADMIN_NAV_ITEM.label}
                desc={ADMIN_NAV_ITEM.desc}
                isActive={location.pathname.startsWith(ADMIN_NAV_ITEM.to)}
                compact={compactNav}
                showHoverTip={collapsed}
              />
            ) : null}
          </div>
        </nav>

        <div className="sidebar-footer">
          {!compactNav ? <p className="sidebar-footer-label">工具</p> : null}
          <div className="sidebar-footer-actions">
            <button
              type="button"
              onClick={handleToggleCollapsed}
              title={collapsed ? '展开侧边栏' : '收起侧边栏'}
              className={[
                'sidebar-footer-btn',
                compactNav ? 'justify-center px-0' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="sidebar-footer-btn-icon">
                <span className="material-symbols-outlined text-[18px] leading-none">
                  {collapsed ? 'chevron_right' : 'chevron_left'}
                </span>
              </span>
              {!compactNav ? <span className="min-w-0 truncate">收起侧边栏</span> : null}
            </button>

            {compactNav ? (
              <div
                className="sidebar-hover-target relative flex justify-center"
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setLogoutTipTop(rect.top + rect.height / 2);
                }}
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  title="退出登录"
                  className="sidebar-footer-btn is-danger justify-center px-0"
                >
                  <span className="sidebar-footer-btn-icon">
                    <span className="material-symbols-outlined text-[18px] leading-none">logout</span>
                  </span>
                </button>
                {collapsed ? (
                  <span className="sidebar-hover-tip" style={{ top: logoutTipTop }}>
                    退出登录
                  </span>
                ) : null}
              </div>
            ) : (
              <button type="button" onClick={handleLogout} className="sidebar-footer-btn is-danger">
                <span className="sidebar-footer-btn-icon">
                  <span className="material-symbols-outlined text-[18px] leading-none">logout</span>
                </span>
                <span className="min-w-0 truncate">退出登录</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
