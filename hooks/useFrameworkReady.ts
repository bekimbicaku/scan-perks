import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(Platform.OS === 'web');
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