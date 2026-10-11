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
  addTab: (tab: Omit<TabItem, 'closable'> & { closable?: boolean }) => void;
  removeTab: (targetKey: string) => string | undefined;
  closeOthers: (currentKey: string) => void;
  closeAll: () => string;
  setActiveKey: (key: string) => void;
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

  addTab: (newTab) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.key === newTab.key);
    if (!existing) {
      set({
        tabs: [
          ...tabs,
          {
            ...newTab,
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
}));
