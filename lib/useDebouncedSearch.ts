import { useCallback, useRef } from 'react';

/**
 * Hook for debounced search operations
 * Prevents excessive API calls by delaying execution until user stops typing
 * 
 * @param delay - Debounce delay in milliseconds (default: 200ms)
 * @returns Object with debouncedSearch function and cancelDebounce function
 */
export function useDebouncedSearch(delay: number = 200) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const debouncedSearch = useCallback(
    (onSearch: () => Promise<void> | void) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void onSearch();
      }, delay);
    },
    [delay]
  );

  const cancelDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return { debouncedSearch, cancelDebounce };
}
