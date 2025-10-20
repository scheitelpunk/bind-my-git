import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  CheckSquare,
  Clock,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: Home },
    { name: t('nav.projects'), href: '/projects', icon: FolderOpen },
    { name: t('nav.tasks'), href: '/tasks', icon: CheckSquare },
    { name: t('nav.timeTracking'), href: '/time-tracking', icon: Clock },
    { name: t('nav.reports'), href: '/reports', icon: BarChart3 },
  ];

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:z-30">
      <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
          <h1 className="text-white text-xl font-bold">ProjectFlow</h1>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    )}
                  />
                  {item.name}
                </NavLink>
              );
            })}

            {hasRole('admin') && (
              <NavLink
                to="/admin"
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  location.pathname === '/admin'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )}
              >
                <Settings
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5',
                    location.pathname === '/admin' ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  )}
                />
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <button
                onClick={logout}
                className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="h-3 w-3 mr-1" />
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;