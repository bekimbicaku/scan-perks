import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Smartphone, Download, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { getPreferredStoreUrl, getStoreLabel, shouldOfferNativeAppDownload } from '@/lib/appUpdates';
import { hasDismissedDownloadBanner, markDownloadBannerDismissed } from '@/lib/onboarding';

export default function DownloadMobileBanner() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!shouldOfferNativeAppDownload()) {
      return;
    }

    let cancelled = false;
    hasDismissedDownloadBanner().then((dismissed) => {
      if (!cancelled && !dismissed) {
        setVisible(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) {
    return null;
  }

  const openStore = async () => {
    await Linking.openURL(getPreferredStoreUrl());
  };

  const dismiss = async () => {
    setVisible(false);
    await markDownloadBannerDismissed();
  };

  const storeLabel = getStoreLabel();

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + 72 }]}>
      {expanded ? (
        <View style={styles.banner}>
          <TouchableOpacity style={styles.closeBtn} onPress={dismiss} accessibilityLabel="Dismiss download banner">
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Smartphone size={18} color={colors.primaryDark} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>Get the Scan Perks app</Text>
              <Text style={styles.subtitle}>
                Faster scanning, push rewards, and a smoother loyalty experience on {storeLabel}.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={openStore}>
            <Download size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Download the app</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.minimizeButton} onPress={() => setExpanded(false)}>
            <Text style={styles.minimizeText}>Not now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.collapsedPill} onPress={() => setExpanded(true)}>
          <Smartphone size={16} color="#fff" />
          <Text style={styles.collapsedText}>Download app</Text>
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
  closeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
    padding: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingRight: spacing.lg,
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
  primaryButton: {
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
  minimizeButton: {
    marginTop: spacing.sm,
    alignSelf: 'center',
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
