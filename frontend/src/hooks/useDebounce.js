// useDebounce.js
// Hook fudud oo dib u dhigaya (debounce) qiimaha lagu celinayo wakhti la cayimay.
// Isticmaal: const debouncedValue = useDebounce(value, 300);
import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
