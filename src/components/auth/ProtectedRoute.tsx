/**
 * Protected Route Component with Role-Based Access Control
 */

import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requireAllRoles?: boolean;
  fallbackPath?: string;
  showUnauthorizedMessage?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredRoles = [],
  requireAllRoles = false,
  fallbackPath = '/login',
  showUnauthorizedMessage = true,
}) => {
  const { isAuthenticated, isLoading, hasRole, hasAnyRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to={fallbackPath}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Check role-based access if roles are specified
  const allRequiredRoles = [
    ...(requiredRole ? [requiredRole] : []),
    ...requiredRoles,
  ];

  if (allRequiredRoles.length > 0) {
    const hasAccess = requireAllRoles
      ? allRequiredRoles.every(role => hasRole(role))
      : hasAnyRole(allRequiredRoles);

    if (!hasAccess) {
      if (showUnauthorizedMessage) {
        toast.error(
          `Access denied. Required ${requireAllRoles ? 'all' : 'any'} of: ${allRequiredRoles.join(', ')}`
        );
      }

      return (
        <Navigate
          to="/unauthorized"
          state={{
            from: location.pathname,
            requiredRoles: allRequiredRoles,
            requireAllRoles
          }}
          replace
        />
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;