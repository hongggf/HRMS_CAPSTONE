import React from 'react';
import {
  DashboardOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
  ScheduleOutlined,
  DollarOutlined,
  RiseOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  ThunderboltOutlined,
  FolderOpenOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { RoleName } from '../types/api';

export interface NavigationItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  roles?: RoleName[];
  children?: NavigationItem[];
  isDev?: boolean;
  phase?: string;
  description?: string;
}

export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    key: '/dashboard',
    label: 'Dashboard',
    icon: <DashboardOutlined />,
    roles: [
      'HEAD_OF_HR',
      'HR_RECRUITMENT',
      'HR_ADMIN',
      'HR_ATTENDANCE',
      'HR_PAYROLL',
      'HR_PERFORMANCE',
      'HR_LND',
    ],
    description:
      'Role-aware operational metrics and pending approvals overview',
  },
  {
    key: '/tasks',
    label: 'Tasks & Approvals',
    icon: <AuditOutlined />,
    roles: [
      'HEAD_OF_HR',
      'HR_RECRUITMENT',
      'HR_ADMIN',
      'HR_ATTENDANCE',
      'HR_PAYROLL',
      'HR_PERFORMANCE',
      'HR_LND',
    ],
    description: 'Executive review desk and workflow status tracker',
  },
  {
    key: '/org-group',
    label: 'Organization & Workforce',
    icon: <BankOutlined />,
    roles: ['HEAD_OF_HR', 'HR_ADMIN', 'HR_RECRUITMENT'],
    children: [
      {
        key: '/organization',
        label: 'Departments & Structure',
        icon: <ApartmentOutlined />,
        roles: ['HEAD_OF_HR', 'HR_ADMIN'],
        description:
          'Manage departmental hierarchies, positions, and company nodes',
      },
      {
        key: '/workforce',
        label: 'Workforce Planning',
        icon: <SolutionOutlined />,
        roles: ['HEAD_OF_HR', 'HR_RECRUITMENT', 'HR_ADMIN'],
        description:
          'Forecast headcount requirements, budgets, and quota plans',
      },
    ],
  },
  {
    key: '/talent-group',
    label: 'Talent & Employees',
    icon: <TeamOutlined />,
    roles: ['HEAD_OF_HR', 'HR_RECRUITMENT', 'HR_ADMIN'],
    children: [
      {
        key: '/recruitment',
        label: 'Recruitment & ATS',
        icon: <FolderOpenOutlined />,
        roles: ['HEAD_OF_HR', 'HR_RECRUITMENT'],
        isDev: true,
        phase: 'Phase 4',
        description:
          'Candidate pipelines, job requisitions, and interview stages',
      },
      {
        key: '/employees',
        label: 'Employee Directory',
        icon: <UserOutlined />,
        roles: ['HEAD_OF_HR', 'HR_ADMIN'],
        isDev: true,
        phase: 'Phase 5',
        description:
          'Personnel records, status lifecycle, documents, and profiles',
      },
    ],
  },
  {
    key: '/operations-group',
    label: 'Operations & Payroll',
    icon: <ThunderboltOutlined />,
    roles: ['HEAD_OF_HR', 'HR_ATTENDANCE', 'HR_PAYROLL'],
    children: [
      {
        key: '/attendance',
        label: 'Attendance & Leaves',
        icon: <ScheduleOutlined />,
        roles: ['HEAD_OF_HR', 'HR_ATTENDANCE'],
        isDev: true,
        phase: 'Phase 6',
        description:
          'Time tracking, shift clocking, leave requests, and overtime logs',
      },
      {
        key: '/payroll',
        label: 'Payroll Processing',
        icon: <DollarOutlined />,
        roles: ['HEAD_OF_HR', 'HR_PAYROLL'],
        isDev: true,
        phase: 'Phase 7',
        description:
          'Salary calculations, period locks, allowances, and payslips',
      },
    ],
  },
  {
    key: '/growth-group',
    label: 'Growth & Governance',
    icon: <RiseOutlined />,
    roles: ['HEAD_OF_HR', 'HR_PERFORMANCE', 'HR_LND', 'HR_ADMIN'],
    children: [
      {
        key: '/performance',
        label: 'Performance & Reviews',
        icon: <RiseOutlined />,
        roles: ['HEAD_OF_HR', 'HR_PERFORMANCE'],
        isDev: true,
        phase: 'Phase 8',
        description:
          'Annual appraisals, KPI scoring, and performance improvement plans',
      },
      {
        key: '/lnd',
        label: 'Learning & Dev',
        icon: <ReadOutlined />,
        roles: ['HEAD_OF_HR', 'HR_LND'],
        isDev: true,
        phase: 'Phase 9',
        description:
          'Training programs, employee enrollments, and certification logs',
      },
      {
        key: '/audit-logs',
        label: 'Audit & Compliance',
        icon: <SafetyCertificateOutlined />,
        roles: ['HEAD_OF_HR', 'HR_ADMIN'],
        isDev: true,
        phase: 'Phase 10',
        description:
          'System audit trails, security event history, and change logs',
      },
    ],
  },
];

/**
 * Filters hierarchical navigation configuration based on active user roles.
 * A parent group is only shown if at least one of its children is accessible.
 */
export const filterNavByRoles = (
  items: NavigationItem[],
  roles: RoleName[] = [],
): NavigationItem[] => {
  const isHead = roles.includes('HEAD_OF_HR');

  const checkItemAccess = (item: NavigationItem): boolean => {
    if (isHead) return true;
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.some((r) => roles.includes(r));
  };

  const processItems = (navItems: NavigationItem[]): NavigationItem[] => {
    const filtered: NavigationItem[] = [];

    for (const item of navItems) {
      if (item.children && item.children.length > 0) {
        const filteredChildren = processItems(item.children);
        if (filteredChildren.length > 0) {
          filtered.push({
            ...item,
            children: filteredChildren,
          });
        }
      } else if (checkItemAccess(item)) {
        filtered.push(item);
      }
    }

    return filtered;
  };

  return processItems(items);
};

/**
 * Computes breadcrumb trail for a given pathname.
 */
export const findBreadcrumbTrail = (
  items: NavigationItem[],
  pathname: string,
): NavigationItem[] => {
  for (const item of items) {
    if (item.key === pathname) {
      return [item];
    }
    if (item.children) {
      const subTrail = findBreadcrumbTrail(item.children, pathname);
      if (subTrail.length > 0) {
        return [item, ...subTrail];
      }
    }
  }
  return [];
};

/**
 * Finds a specific navigation item by route key across all levels.
 */
export const findNavItem = (
  items: NavigationItem[],
  pathname: string,
): NavigationItem | undefined => {
  for (const item of items) {
    if (item.key === pathname) {
      return item;
    }
    if (item.children) {
      const match = findNavItem(item.children, pathname);
      if (match) return match;
    }
  }
  return undefined;
};
