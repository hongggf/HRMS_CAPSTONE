import { describe, it, expect, beforeEach } from 'vitest';
import { useTabStore } from '../store/useTabStore';

describe('useTabStore (TagsView)', () => {
  beforeEach(() => {
    useTabStore.getState().closeAll();
  });

  it('initializes with Dashboard tab as non-closable', () => {
    const { tabs, activeKey } = useTabStore.getState();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].key).toBe('/dashboard');
    expect(tabs[0].closable).toBe(false);
    expect(activeKey).toBe('/dashboard');
  });

  it('adds new tabs and updates activeKey', () => {
    useTabStore.getState().addTab({
      key: '/employees',
      label: 'Employees',
      path: '/employees',
    });

    const { tabs, activeKey } = useTabStore.getState();
    expect(tabs).toHaveLength(2);
    expect(tabs[1].key).toBe('/employees');
    expect(tabs[1].closable).toBe(true);
    expect(activeKey).toBe('/employees');
  });

  it('prevents duplicate tabs and switches activeKey to existing tab', () => {
    useTabStore
      .getState()
      .addTab({ key: '/employees', label: 'Employees', path: '/employees' });
    useTabStore
      .getState()
      .addTab({ key: '/payroll', label: 'Payroll', path: '/payroll' });
    useTabStore
      .getState()
      .addTab({ key: '/employees', label: 'Employees', path: '/employees' });

    const { tabs, activeKey } = useTabStore.getState();
    expect(tabs).toHaveLength(3);
    expect(activeKey).toBe('/employees');
  });

  it('removes tab and redirects to neighboring tab', () => {
    useTabStore
      .getState()
      .addTab({ key: '/employees', label: 'Employees', path: '/employees' });
    useTabStore
      .getState()
      .addTab({ key: '/payroll', label: 'Payroll', path: '/payroll' });

    // Remove active tab '/payroll'
    const nextKey = useTabStore.getState().removeTab('/payroll');
    expect(nextKey).toBe('/employees');

    const { tabs, activeKey } = useTabStore.getState();
    expect(tabs).toHaveLength(2);
    expect(activeKey).toBe('/employees');
  });

  it('closeOthers preserves only dashboard and active tab', () => {
    useTabStore
      .getState()
      .addTab({ key: '/employees', label: 'Employees', path: '/employees' });
    useTabStore
      .getState()
      .addTab({ key: '/payroll', label: 'Payroll', path: '/payroll' });

    useTabStore.getState().closeOthers('/employees');

    const { tabs, activeKey } = useTabStore.getState();
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.key)).toEqual(['/dashboard', '/employees']);
    expect(activeKey).toBe('/employees');
  });
});
