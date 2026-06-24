import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { RemoteVersionInfo } from '@/lib/version';
import {
  checkForAppUpdate,
  dismissCurrentUpdate,
  getLocalVersionInfo,
} from '@/lib/appUpdates';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function useAppUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<RemoteVersionInfo | null>(null);
  const [localVersion, setLocalVersion] = useState(getLocalVersionInfo());

  const runCheck = async () => {
    const result = await checkForAppUpdate();
    setLocalVersion(result.local);
    setRemoteVersion(result.remote);
    setUpdateAvailable(result.available);
  };

  useEffect(() => {
    runCheck();

    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
    const subscription =
      Platform.OS !== 'web'
        ? AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              runCheck();
            }
          })
        : null;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          runCheck();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(interval);
        subscription?.remove();
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, []);

  const dismissUpdate = async () => {
    if (remoteVersion) {
      await dismissCurrentUpdate(remoteVersion);
    }
    setUpdateAvailable(false);
  };

  return {
    updateAvailable,
    remoteVersion,
    localVersion,
    dismissUpdate,
    recheckUpdates: runCheck,
  };
}
