import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const THEME_KEY = 'hrms_theme_mode';

const initialMode: ThemeMode =
  typeof window !== 'undefined' && localStorage.getItem(THEME_KEY) === 'dark'
    ? 'dark'
    : 'light';

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  toggleTheme: () => {
    const next = get().mode === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    set({ mode: next });
  },
  setMode: (mode: ThemeMode) => {
    localStorage.setItem(THEME_KEY, mode);
    set({ mode });
  },
}));
