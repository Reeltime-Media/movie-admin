import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false;
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          if (error instanceof Error && /\b(400|401|403|404|409|422)\b/.test(error.message)) {
            return false;
          }
          return true;
        },
        refetchOnWindowFocus: true,
      },
    },
  });
}
