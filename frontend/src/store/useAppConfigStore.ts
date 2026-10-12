import { create } from 'zustand';

interface AppConfigState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const SIDEBAR_KEY = 'hrms_sidebar_collapsed';

const initialCollapsed =
  typeof window !== 'undefined'
    ? localStorage.getItem(SIDEBAR_KEY) === 'true'
    : false;

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
  sidebarCollapsed: initialCollapsed,
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    try {
      localStorage.setItem(SIDEBAR_KEY, String(next));
    } catch {
      // LocalStorage access handling
    }
    set({ sidebarCollapsed: next });
  },
  setSidebarCollapsed: (collapsed: boolean) => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed));
    } catch {
      // LocalStorage access handling
    }
    set({ sidebarCollapsed: collapsed });
  },
}));
