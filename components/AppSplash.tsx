import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import BrandLogo from '@/components/ui/BrandLogo';

export default function AppSplash() {
  return (
    <View style={styles.container}>
      <BrandLogo size="lg" />
      <ActivityIndicator size="large" color={colors.primaryDark} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.offWhite,
    gap: 24,
  },
  spinner: {
    marginTop: 8,
  },
});
