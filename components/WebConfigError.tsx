import { View, Text, StyleSheet } from 'react-native';
import BrandLogo from '@/components/ui/BrandLogo';
import { colors, spacing } from '@/theme';

interface WebConfigErrorProps {
  message: string;
}

export default function WebConfigError({ message }: WebConfigErrorProps) {
  return (
    <View style={styles.container}>
      <BrandLogo size="md" />
      <Text style={styles.title}>Scan Perks cannot start</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.offWhite,
    gap: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 420,
  },
});
