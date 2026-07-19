import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isRemoteVersionNewer,
  RemoteVersionInfo,
  STORE_LINKS,
} from '@/lib/version';

const DISMISSED_UPDATE_KEY = '@scan_perks_dismissed_update';

function getVersionEndpoint(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return '/version.json';
  }

  const baseUrl = STORE_LINKS.web.replace(/\/$/, '');
  return `${baseUrl}/version.json`;
}

export function getLocalVersionInfo() {
  const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
  const buildNumber = Number(Constants.nativeBuildVersion) || 1;

  return { version, buildNumber };
}

export async function fetchRemoteVersionInfo(): Promise<RemoteVersionInfo | null> {
  try {
    const response = await fetch(`${getVersionEndpoint()}?t=${Date.now()}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as RemoteVersionInfo;
  } catch (error) {
    console.warn('[version] failed to fetch remote version', error);
    return null;
  }
}

export async function checkForAppUpdate(): Promise<{
  available: boolean;
  remote: RemoteVersionInfo | null;
  local: ReturnType<typeof getLocalVersionInfo>;
}> {
  const local = getLocalVersionInfo();
  const remote = await fetchRemoteVersionInfo();

  if (!remote) {
    return { available: false, remote: null, local };
  }

  const dismissedKey = `${remote.version}-${remote.buildNumber}`;
  const dismissed = await AsyncStorage.getItem(DISMISSED_UPDATE_KEY);
  if (dismissed === dismissedKey) {
    return { available: false, remote, local };
  }

  return {
    available: isRemoteVersionNewer(remote, local.version, local.buildNumber),
    remote,
    local,
  };
}

export async function dismissCurrentUpdate(remote: RemoteVersionInfo) {
  await AsyncStorage.setItem(DISMISSED_UPDATE_KEY, `${remote.version}-${remote.buildNumber}`);
}

export function isMobileWebUserAgent(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return false;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function getPreferredStoreUrl(): string {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return STORE_LINKS.ios;
    }
  }

  return STORE_LINKS.android;
}

export function reloadWebApp() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.reload();
  }
}
