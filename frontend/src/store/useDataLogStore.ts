import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DataLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  statusText?: string;
  durationMs: number;
  requestHeaders?: Record<string, any>;
  requestData?: any;
  queryParams?: Record<string, any>;
  responseData?: any;
  isError: boolean;
  errorMessage?: string | null;
}

interface DataLogState {
  logs: DataLogEntry[];
  isRecording: boolean;
  maxLogs: number;
  addLog: (entry: Omit<DataLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  toggleRecording: () => void;
  setRecording: (recording: boolean) => void;
}

export const useDataLogStore = create<DataLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      isRecording: true,
      maxLogs: 100,

      addLog: (entryData) => {
        if (!get().isRecording) return;

        const newEntry: DataLogEntry = {
          ...entryData,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          logs: [newEntry, ...state.logs].slice(0, state.maxLogs),
        }));
      },

      clearLogs: () => {
        set({ logs: [] });
      },

      toggleRecording: () => {
        set((state) => ({ isRecording: !state.isRecording }));
      },

      setRecording: (recording: boolean) => {
        set({ isRecording: recording });
      },
    }),
    {
      name: 'hrms_data_logs',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        logs: state.logs,
        isRecording: state.isRecording,
      }),
    },
  ),
);
