import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import TimerWidget from '../timer/TimerWidget';

const Layout: React.FC = () => {
  return (
    <div className="h-screen flex overflow-hidden bg-dark-950">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>
      
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden md:ml-64 relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      <TimerWidget />
    </div>
  );
};

export default Layout;