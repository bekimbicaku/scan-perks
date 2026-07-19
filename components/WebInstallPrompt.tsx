import { Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Download } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { isMobileWebUserAgent } from '@/lib/appUpdates';
import { useEffect, useState } from 'react';

export default function WebInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const isDesktopWeb = Platform.OS === 'web' && !isMobileWebUserAgent();

  useEffect(() => {
    if (!isDesktopWeb || typeof window === 'undefined') {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, [isDesktopWeb]);

  if (!isDesktopWeb || !installPrompt) {
    return null;
  }

  const install = async () => {
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Download size={18} color={colors.primaryDark} />
        <Text style={styles.text}>Install Scan Perks on this device for quick access.</Text>
        <TouchableOpacity style={styles.button} onPress={install}>
          <Text style={styles.buttonText}>Install</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 12,
    left: spacing.md,
    right: spacing.md,
    zIndex: 999,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
