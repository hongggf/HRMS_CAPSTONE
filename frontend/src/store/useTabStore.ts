import { create } from 'zustand';

export interface TabItem {
  key: string;
  label: string;
  path: string;
  closable: boolean;
}

interface TabState {
  tabs: TabItem[];
  activeKey: string;
  refreshKey: number;
  addTab: (tab: Omit<TabItem, 'closable'> & { closable?: boolean }) => void;
  removeTab: (targetKey: string) => string | undefined;
  closeOthers: (currentKey: string) => void;
  closeAll: () => string;
  setActiveKey: (key: string) => void;
  reloadCurrentTab: () => void;
}

const DASHBOARD_TAB: TabItem = {
  key: '/dashboard',
  label: 'Dashboard',
  path: '/dashboard',
  closable: false,
};

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [DASHBOARD_TAB],
  activeKey: '/dashboard',
  refreshKey: 0,

  addTab: (newTab) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.key === newTab.key);
    if (!existing) {
      set({
        tabs: [
          ...tabs,
          {
            ...newTab,
            // Enforce protection policy: /dashboard is never closable
            closable: newTab.closable !== false && newTab.key !== '/dashboard',
          },
        ],
        activeKey: newTab.key,
      });
    } else {
      set({ activeKey: newTab.key });
    }
  },

  removeTab: (targetKey: string) => {
    const { tabs, activeKey } = get();
    // Deny closing protected dashboard tab
    if (targetKey === '/dashboard') return activeKey;

    let nextActiveKey = activeKey;
    if (activeKey === targetKey) {
      const idx = tabs.findIndex((t) => t.key === targetKey);
      const nextTab = tabs[idx + 1] || tabs[idx - 1] || DASHBOARD_TAB;
      nextActiveKey = nextTab.key;
    }

    set({
      tabs: tabs.filter((t) => t.key !== targetKey),
      activeKey: nextActiveKey,
    });

    return nextActiveKey;
  },

  closeOthers: (currentKey: string) => {
    const { tabs } = get();
    // Retain essential dashboard and currently active tab
    const retained = tabs.filter(
      (t) => t.key === '/dashboard' || t.key === currentKey,
    );
    set({
      tabs: retained,
      activeKey: currentKey,
    });
  },

  closeAll: () => {
    set({
      tabs: [DASHBOARD_TAB],
      activeKey: '/dashboard',
    });
    return '/dashboard';
  },

  setActiveKey: (key: string) => set({ activeKey: key }),

  reloadCurrentTab: () =>
    set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
