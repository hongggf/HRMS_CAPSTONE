import { RoleName } from './api';

export interface AdminUser {
  id: number;
  email: string;
  isActive: boolean;
  roles: RoleName[];
}

export interface RolePermission {
  id: number;
  name: RoleName;
  description?: string;
  permissions: string[];
}

export interface CreateUserPayload {
  email: string;
  password: string;
  roleId?: number;
  roleIds?: number[];
}

export interface AssignRolePayload {
  roleId?: number;
  roleIds?: number[];
}
