/**
 * Role Guard Component for Conditional Rendering
 */

import React, { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requireAllRoles?: boolean;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRole,
  requiredRoles = [],
  requireAllRoles = false,
  fallback = null,
  showFallback = true,
}) => {
  const { isAuthenticated, hasRole, hasAnyRole } = useAuth();

  // If not authenticated, don't render anything by default
  if (!isAuthenticated) {
    return showFallback ? <>{fallback}</> : null;
  }

  // Combine all required roles
  const allRequiredRoles = [
    ...(requiredRole ? [requiredRole] : []),
    ...requiredRoles,
  ];

  // If no roles specified, just check authentication
  if (allRequiredRoles.length === 0) {
    return <>{children}</>;
  }

  // Check role access
  const hasAccess = requireAllRoles
    ? allRequiredRoles.every(role => hasRole(role))
    : hasAnyRole(allRequiredRoles);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Return fallback if user doesn't have required roles
  return showFallback ? <>{fallback}</> : null;
};

// Convenience components for common use cases
export const AdminOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard requiredRole="admin" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const ManagerOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard requiredRole="manager" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const UserOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard requiredRole="user" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const ManagerOrAdmin: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard requiredRoles={['project_manager', 'admin']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export default RoleGuard;