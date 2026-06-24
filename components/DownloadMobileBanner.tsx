import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Smartphone, Download, ChevronUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { getPreferredStoreUrl, isMobileWebUserAgent } from '@/lib/appUpdates';

export default function DownloadMobileBanner() {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(true);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const isMobileWeb = Platform.OS === 'web' && isMobileWebUserAgent();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  if (!isMobileWeb) {
    return null;
  }

  const openStore = async () => {
    const url = getPreferredStoreUrl();
    await Linking.openURL(url);
  };

  const installPwa = async () => {
    if (!installPrompt?.prompt) {
      return;
    }

    await installPrompt.prompt();
    setInstallPrompt(null);
    setCanInstallPwa(false);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + 72 }]}>
      {expanded ? (
        <View style={styles.banner}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Smartphone size={18} color={colors.primaryDark} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>Get Scan Perks on your phone</Text>
              <Text style={styles.subtitle}>
                Faster scanning, push rewards, and a smoother loyalty experience in the native app.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={openStore}>
              <Download size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>Download app</Text>
            </TouchableOpacity>

            {canInstallPwa && (
              <TouchableOpacity style={styles.secondaryButton} onPress={installPwa}>
                <Text style={styles.secondaryButtonText}>Install web app</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.minimizeButton} onPress={() => setExpanded(false)}>
            <ChevronUp size={16} color={colors.textMuted} />
            <Text style={styles.minimizeText}>Minimize</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.collapsedPill} onPress={() => setExpanded(true)}>
          <Smartphone size={16} color="#fff" />
          <Text style={styles.collapsedText}>Download mobile app</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  banner: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: colors.glass.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  minimizeButton: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  minimizeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  collapsedPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.glass.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  collapsedText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
