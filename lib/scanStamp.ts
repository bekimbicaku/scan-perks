export function firstScanStampCount(
  happyHourActive: boolean,
  happyHourMultiplier: number,
  welcomeStampApplied: boolean
) {
  return (happyHourActive ? happyHourMultiplier : 1) + (welcomeStampApplied ? 1 : 0);
}
