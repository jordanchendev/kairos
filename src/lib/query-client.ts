import { QueryClient } from "@tanstack/react-query";

export const baseQueryDefaults = {
  gcTime: 1000 * 60 * 15,
  refetchOnWindowFocus: false,
  retry: 1,
  staleTime: 1000 * 30,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: baseQueryDefaults,
  },
});
