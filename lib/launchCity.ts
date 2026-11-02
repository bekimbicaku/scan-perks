/**
 * Neighborhood being opened first. The setup phone field uses +355,
 * and the founder's studio is in Durrës. Override with EXPO_PUBLIC_LAUNCH_CITY.
 */
export const LAUNCH_CITY =
  (process.env.EXPO_PUBLIC_LAUNCH_CITY || 'Durrës').trim() || 'Durrës';
