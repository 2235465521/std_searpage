/** 判定是否使用桌面固定布局（对齐研招网：固定宽度 + 横向滚动，不切换移动端） */
function shouldLockDesktopLayout() {
  const touchOnly = window.matchMedia('(pointer: coarse) and (hover: none)').matches;
  if (touchOnly && window.innerWidth < 768) return false;
  return window.innerWidth >= 768 || !touchOnly;
}

/** 首屏标记布局模式，桌面端用固定 min-width，缩放时由浏览器整页等比处理 */
export function initLayoutLock() {
  const root = document.documentElement;
  if (shouldLockDesktopLayout()) {
    root.classList.add('layout-desktop-lock');
    root.classList.remove('layout-mobile');
  } else {
    root.classList.add('layout-mobile');
    root.classList.remove('layout-desktop-lock');
  }
}

export const DESIGN_WIDTH = 1280;
