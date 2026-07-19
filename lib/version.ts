export type RemoteVersionInfo = {
  version: string;
  buildNumber: number;
  iosBuildNumber?: string;
  releasedAt?: string;
  releaseNotes?: string;
  webUrl?: string;
  androidUrl?: string;
  iosUrl?: string;
};

export const STORE_LINKS = {
  android:
    process.env.EXPO_PUBLIC_ANDROID_STORE_URL ||
    'https://play.google.com/store/apps/details?id=com.scanperks.app',
  ios: process.env.EXPO_PUBLIC_IOS_STORE_URL || 'https://apps.apple.com/app/id6744923279',
  web: process.env.EXPO_PUBLIC_APP_URL || 'https://app.scan-perks.com',
} as const;

export function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

export function isRemoteVersionNewer(
  remote: RemoteVersionInfo,
  localVersion: string,
  localBuildNumber: number
): boolean {
  const versionDiff = compareVersions(remote.version, localVersion);
  if (versionDiff > 0) {
    return true;
  }

  if (versionDiff < 0) {
    return false;
  }

  return remote.buildNumber > localBuildNumber;
}
