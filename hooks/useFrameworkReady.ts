import { useState, useEffect, useRef } from 'react';

export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    async function initFramework() {
      try {
        // Wait for any async initialization
        await Promise.resolve();
        if (!hasInitialized.current) {
          hasInitialized.current = true;
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize framework:', error);
      }
    }

    initFramework();
  }, []);

  return [isReady] as const;
}