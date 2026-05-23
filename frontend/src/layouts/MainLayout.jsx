import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import MobileNav from '../components/layout/MobileNav';
import MobileTopBar from '../components/layout/MobileTopBar';
import { prefetchDefaultModuleQueries } from '../utils/sessionPrefetch';

const MainLayout = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    prefetchDefaultModuleQueries();
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
      <Sidebar />
      <MobileTopBar />

      <main className="relative ml-0 flex h-screen flex-1 flex-col md:ml-[15rem]">
        <Header />

        <div className="no-scrollbar mt-14 flex-1 overflow-y-auto p-4 pb-24 md:mt-16 md:p-8 md:pb-24">
          <div className="mx-auto max-w-7xl space-y-6">
            <Outlet />
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
};

export default MainLayout;
