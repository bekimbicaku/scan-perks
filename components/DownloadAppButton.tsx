import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Download } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { getPreferredStoreUrl, getStoreLabel, shouldOfferNativeAppDownload } from '@/lib/appUpdates';

export default function DownloadAppButton() {
  if (!shouldOfferNativeAppDownload()) {
    return null;
  }

  const openStore = () => {
    Linking.openURL(getPreferredStoreUrl());
  };

  return (
    <TouchableOpacity style={styles.button} onPress={openStore} activeOpacity={0.85}>
      <Download size={18} color={colors.white} />
      <View>
        <Text style={styles.label}>Download the app</Text>
        <Text style={styles.sub}>Get it on {getStoreLabel()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  sub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 1,
  },
});
