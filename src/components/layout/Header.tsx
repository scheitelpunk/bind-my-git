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
    <div className="relative z-10 flex-shrink-0 flex h-16 glass border-b border-dark-800/50 backdrop-blur-xl md:pl-0">
      <button
        type="button"
        className="px-4 border-r border-dark-800/50 text-dark-400 hover:text-dark-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span className="sr-only">{t('header.openSidebar')}</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          <h1 className="text-2xl font-semibold glow-text">{getPageName()}</h1>
        </div>

        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-dark-500" aria-hidden="true" />
            </div>
            <input
              type="search"
              placeholder={t('header.search')}
              className="block w-full pl-10 pr-3 py-2 bg-dark-900/50 border border-dark-700 rounded-lg leading-5 placeholder-dark-500 text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-all duration-300 backdrop-blur-sm"
            />
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <NotificationDropdown />

          {/* Profile */}
          <div className="flex items-center group">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-xl group-hover:shadow-primary-500/40 transition-all duration-300">
              <span className="text-sm font-medium text-white">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="ml-3 hidden lg:block">
              <p className="text-sm font-medium text-dark-100 group-hover:text-primary-400 transition-colors">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-dark-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;