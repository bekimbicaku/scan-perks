import UpdateAvailableModal from '@/components/UpdateAvailableModal';
import DownloadMobileBanner from '@/components/DownloadMobileBanner';
import WebInstallPrompt from '@/components/WebInstallPrompt';
import { useAppUpdates } from '@/hooks/useAppUpdates';

export default function AppUpdateManager() {
  const { updateAvailable, remoteVersion, localVersion, dismissUpdate } = useAppUpdates();

  return (
    <>
      <UpdateAvailableModal
        visible={updateAvailable}
        remoteVersion={remoteVersion}
        localVersion={localVersion.version}
        onDismiss={dismissUpdate}
      />
      <DownloadMobileBanner />
      <WebInstallPrompt />
    </>
  );
}
