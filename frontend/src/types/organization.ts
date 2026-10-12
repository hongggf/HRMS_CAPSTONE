import { PaginationMeta } from './api';

export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';
export type PositionStatus = 'OPEN' | 'CLOSED' | 'FROZEN';
export type EmploymentType =
  'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  status: DepartmentStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    positions: number;
  };
  positions?: Position[];
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string | null;
  status?: DepartmentStatus;
}

export interface ListDepartmentsQuery {
  page?: number;
  limit?: number;
  status?: DepartmentStatus;
  search?: string;
}

export interface Position {
  id: number;
  title: string;
  code: string;
  departmentId: number;
  description?: string | null;
  employmentType: EmploymentType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status: PositionStatus;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface CreatePositionInput {
  title: string;
  code: string;
  departmentId: number;
  description?: string;
  employmentType?: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
}

export interface UpdatePositionInput {
  title?: string;
  code?: string;
  departmentId?: number;
  description?: string | null;
  employmentType?: EmploymentType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status?: PositionStatus;
}

export interface ListPositionsQuery {
  page?: number;
  limit?: number;
  departmentId?: number;
  status?: PositionStatus;
  search?: string;
}

export interface DepartmentsResponse {
  departments: Department[];
  meta: PaginationMeta;
}

export interface PositionsResponse {
  positions: Position[];
  meta: PaginationMeta;
}
