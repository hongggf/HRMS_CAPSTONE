import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { RoleName } from '../../types/api';
import { Forbidden403 } from '../../pages/error/Forbidden403';

interface RoleGuardProps {
  requiredRoles: RoleName[];
  children: React.ReactElement;
  fallback?: React.ReactElement;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredRoles,
  children,
  fallback = <Forbidden403 />,
}) => {
  const { user } = useAuthStore();

  if (!user) {
    return fallback;
  }

  // HEAD_OF_HR is the master authority and passes all role requirements
  const isHeadOfHr = user.roles.includes('HEAD_OF_HR');
  const hasRequiredRole =
    isHeadOfHr || requiredRoles.some((role) => user.roles.includes(role));

  if (!hasRequiredRole) {
    return fallback;
  }

  return children;
};
