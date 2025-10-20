/**
 * Authentication Guard Component
 * Wrapper component that ensures user is authenticated before rendering children
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { loginWithRedirect } from '../../services/keycloak';
import { toast } from 'react-hot-toast';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  onAuthenticationRequired?: () => void;
  autoLogin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  loadingComponent,
  onAuthenticationRequired,
  autoLogin = true,
}) => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();
  const [authAttempted, setAuthAttempted] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !authAttempted && autoLogin) {
      setAuthAttempted(true);

      // Store the intended destination for post-login redirect
      const intendedPath = location.pathname + location.search;
      sessionStorage.setItem('intendedPath', intendedPath);

      if (onAuthenticationRequired) {
        onAuthenticationRequired();
      } else {
        console.log('Authentication required, initiating CSP-compliant redirect login...');
        try {
          // Use CSP-compliant redirect login
          loginWithRedirect();
        } catch (error) {
          console.error('Failed to initiate redirect login:', error);
          // Fallback to regular login
          toast.error('Authentication required');
          login();
        }
      }
    }
  }, [isAuthenticated, isLoading, onAuthenticationRequired, autoLogin, login, location, authAttempted]);

  // Show loading component while checking authentication
  if (isLoading) {
    return (
      <>
        {loadingComponent || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">Initializing authentication...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // If not authenticated, show fallback or nothing
  if (!isAuthenticated) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Authentication Required
              </h2>
              <p className="text-gray-600 mb-6">
                Please log in to access this application.
              </p>
              <button
                onClick={() => login()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Log In
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
};

export default AuthGuard;