import { useWindowDimensions } from 'react-native';

export const COMPACT_BREAKPOINT = 640;

export function useCompactLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isCompact: width < COMPACT_BREAKPOINT,
  };
}
