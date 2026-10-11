import { QueryClient } from '@tanstack/react-query';
import { registerOnLogout } from './store/useAuthStore';
import { useTabStore } from './store/useTabStore';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Clear cached sensitive server queries and reset navigation tabs on any session termination
registerOnLogout(() => {
  queryClient.clear();
  useTabStore.getState().closeAll();
});
