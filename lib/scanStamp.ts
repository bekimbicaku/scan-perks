export function firstScanStampCount(
  happyHourActive: boolean,
  happyHourMultiplier: number,
  welcomeStampApplied: boolean
) {
  if (welcomeStampApplied) return 1;
  return happyHourActive ? happyHourMultiplier : 1;
}
