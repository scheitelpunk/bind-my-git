import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';

const Header: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getPageName = (): string => {
    const pathname = location.pathname;

    // Handle dynamic routes
    if (pathname.startsWith('/projects/') && pathname !== '/projects') {
      return t('dashboard.projectDetails');
    }
    if (pathname.startsWith('/tasks/') && pathname !== '/tasks') {
      return t('dashboard.taskDetails');
    }

    const pageNames: Record<string, string> = {
      '/dashboard': t('nav.dashboard'),
      '/projects': t('nav.projects'),
      '/tasks': t('nav.tasks'),
      '/time-tracking': t('nav.timeTracking'),
      '/admin': t('nav.admin'),
    };

    return pageNames[pathname] || 'Page';
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow md:pl-0">
      <button
        type="button"
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span className="sr-only">{t('header.openSidebar')}</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          <h1 className="text-2xl font-semibold text-gray-900">{getPageName()}</h1>
        </div>

        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="search"
              placeholder={t('header.search')}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <NotificationDropdown />

          {/* Profile */}
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="ml-3 hidden lg:block">
              <p className="text-sm font-medium text-gray-700">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;