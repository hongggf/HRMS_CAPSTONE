import { describe, it, expect } from 'vitest';
import {
  NAVIGATION_CONFIG,
  filterNavByRoles,
  findBreadcrumbTrail,
  findNavItem,
} from '../config/navigation';

describe('Navigation Configuration and Role Filtering', () => {
  it('HEAD_OF_HR has access to all top-level groups and submenus', () => {
    const filtered = filterNavByRoles(NAVIGATION_CONFIG, ['HEAD_OF_HR']);
    // HEAD_OF_HR should see dashboard, tasks, and all 4 group menus
    expect(filtered.length).toBe(6);
    const keys = filtered.map((item) => item.key);
    expect(keys).toContain('/dashboard');
    expect(keys).toContain('/tasks');
    expect(keys).toContain('/org-group');
    expect(keys).toContain('/talent-group');
    expect(keys).toContain('/operations-group');
    expect(keys).toContain('/growth-group');
  });

  it('HR_RECRUITMENT sees dashboard, recruitment and workforce planning', () => {
    const filtered = filterNavByRoles(NAVIGATION_CONFIG, ['HR_RECRUITMENT']);
    const keys = filtered.map((item) => item.key);
    // Should see role-aware dashboard
    expect(keys).toContain('/dashboard');
    // Should NOT see operations or growth
    expect(keys).not.toContain('/operations-group');
    expect(keys).not.toContain('/growth-group');

    // Should see org-group with workforce
    const orgGroup = filtered.find((i) => i.key === '/org-group');
    expect(orgGroup).toBeDefined();
    expect(orgGroup?.children?.map((c) => c.key)).toEqual(['/workforce']);

    // Should see talent-group with recruitment
    const talentGroup = filtered.find((i) => i.key === '/talent-group');
    expect(talentGroup).toBeDefined();
    expect(talentGroup?.children?.map((c) => c.key)).toEqual(['/recruitment']);
  });

  it('HR_ATTENDANCE sees dashboard, tasks and operations-group with attendance', () => {
    const filtered = filterNavByRoles(NAVIGATION_CONFIG, ['HR_ATTENDANCE']);
    const keys = filtered.map((item) => item.key);
    expect(keys).toContain('/dashboard');
    expect(keys).toContain('/tasks');
    expect(keys).toContain('/operations-group');
    expect(filtered.length).toBe(3);

    const opsGroup = filtered.find((i) => i.key === '/operations-group');
    expect(opsGroup?.children?.map((c) => c.key)).toEqual(['/attendance']);
  });

  it('HR_PAYROLL sees dashboard, tasks and operations-group with payroll', () => {
    const filtered = filterNavByRoles(NAVIGATION_CONFIG, ['HR_PAYROLL']);
    const keys = filtered.map((item) => item.key);
    expect(keys).toContain('/dashboard');
    expect(keys).toContain('/tasks');
    expect(keys).toContain('/operations-group');
    expect(filtered.length).toBe(3);

    const opsGroup = filtered.find((i) => i.key === '/operations-group');
    expect(opsGroup?.children?.map((c) => c.key)).toEqual(['/payroll']);
  });

  it('empty parent groups are omitted when role has no matching children', () => {
    const filtered = filterNavByRoles(NAVIGATION_CONFIG, ['HR_LND']);
    const keys = filtered.map((item) => item.key);
    expect(keys).toContain('/dashboard');
    expect(keys).toContain('/tasks');
    expect(keys).toContain('/growth-group');
    expect(keys).not.toContain('/org-group');
    expect(keys).not.toContain('/talent-group');
    expect(keys).not.toContain('/operations-group');
    expect(filtered.length).toBe(3);

    const growthGroup = filtered.find((i) => i.key === '/growth-group');
    expect(growthGroup?.children?.map((c) => c.key)).toEqual(['/lnd']);
  });

  it('computes breadcrumb trail accurately for nested submenus', () => {
    const trail = findBreadcrumbTrail(NAVIGATION_CONFIG, '/payroll');
    expect(trail.length).toBe(2);
    expect(trail[0].label).toBe('Operations & Payroll');
    expect(trail[1].label).toBe('Payroll Processing');
  });

  it('computes breadcrumb trail for top-level item', () => {
    const trail = findBreadcrumbTrail(NAVIGATION_CONFIG, '/dashboard');
    expect(trail.length).toBe(1);
    expect(trail[0].label).toBe('Dashboard');
  });

  it('findNavItem finds specific item and verifies isDev flag for upcoming phases', () => {
    const employeeItem = findNavItem(NAVIGATION_CONFIG, '/employees');
    expect(employeeItem).toBeDefined();
    expect(employeeItem?.label).toBe('Employee Directory');
    expect(employeeItem?.isDev).toBeFalsy();

    const upcomingItem = findNavItem(NAVIGATION_CONFIG, '/attendance');
    expect(upcomingItem).toBeDefined();
    expect(upcomingItem?.label).toBe('Attendance & Leaves');
    expect(upcomingItem?.isDev).toBe(true);
    expect(upcomingItem?.phase).toBe('Phase 6');
  });
});
