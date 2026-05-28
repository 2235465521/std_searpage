import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import MobileNav from '../components/layout/MobileNav';
import MobileTopBar from '../components/layout/MobileTopBar';
import { SidebarProvider } from '../contexts/SidebarContext';
import { prefetchDefaultModuleQueries } from '../utils/sessionPrefetch';

const MainLayout = () => {
  useEffect(() => {
    prefetchDefaultModuleQueries();
  }, []);

  return (
    <SidebarProvider>
      <div className="app-shell flex min-h-screen w-full min-w-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
        <Sidebar />
        <MobileTopBar />

        <main className="layout-main relative ml-0 flex min-h-screen min-w-0 flex-1 flex-col md:ml-[var(--sidebar-width)]">
          <Header />

          <div className="main-content-scroll no-scrollbar">
            <div className="page-content mx-auto w-full space-y-6">
              <Outlet />
            </div>
          </div>
        </main>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
