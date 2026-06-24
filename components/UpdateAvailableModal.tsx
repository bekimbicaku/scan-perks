import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { Download, RefreshCw, Sparkles, X } from 'lucide-react-native';
import GlassButton from '@/components/ui/GlassButton';
import { colors, radius, spacing } from '@/theme';
import { RemoteVersionInfo } from '@/lib/version';
import { getPreferredStoreUrl, reloadWebApp } from '@/lib/appUpdates';

interface UpdateAvailableModalProps {
  visible: boolean;
  remoteVersion: RemoteVersionInfo | null;
  localVersion: string;
  onDismiss: () => void;
}

export default function UpdateAvailableModal({
  visible,
  remoteVersion,
  localVersion,
  onDismiss,
}: UpdateAvailableModalProps) {
  if (!remoteVersion) {
    return null;
  }

  const handleUpdate = async () => {
    if (Platform.OS === 'web') {
      reloadWebApp();
      return;
    }

    const storeUrl = getPreferredStoreUrl();
    await Linking.openURL(storeUrl);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Sparkles size={28} color={colors.primaryDark} />
          </View>

          <Text style={styles.title}>New update available</Text>
          <Text style={styles.subtitle}>
            Version {remoteVersion.version} is ready. You are on v{localVersion}.
          </Text>

          {!!remoteVersion.releaseNotes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>What&apos;s new</Text>
              <Text style={styles.notesText}>{remoteVersion.releaseNotes}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <GlassButton
              label={Platform.OS === 'web' ? 'Refresh now' : 'Update in store'}
              onPress={handleUpdate}
              icon={
                Platform.OS === 'web' ? (
                  <RefreshCw size={18} color="#fff" />
                ) : (
                  <Download size={18} color="#fff" />
                )
              }
            />
            <GlassButton label="Later" onPress={onDismiss} variant="ghost" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 74, 110, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
    zIndex: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  notesBox: {
    backgroundColor: colors.offWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
});
