import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { RoleName } from '../../types/api';
import { Forbidden403 } from '../../pages/error/Forbidden403';

interface RoleGuardProps {
  requiredRoles: RoleName[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredRoles,
  children,
  fallback = <Forbidden403 />,
}) => {
  const { user } = useAuthStore();

  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return fallback ? <>{fallback}</> : null;
  }

  // Deny access by default if no required roles are specified
  if (!requiredRoles || requiredRoles.length === 0) {
    return fallback ? <>{fallback}</> : null;
  }

  // HEAD_OF_HR is the master authority and passes all role requirements
  const isHeadOfHr = user.roles.includes('HEAD_OF_HR');
  const hasRequiredRole =
    isHeadOfHr || requiredRoles.some((role) => user.roles.includes(role));

  if (!hasRequiredRole) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};
