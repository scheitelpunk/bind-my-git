import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import TimerWidget from '../timer/TimerWidget';

const Layout: React.FC = () => {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden md:ml-64">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <TimerWidget />
    </div>
  );
};

export default Layout;