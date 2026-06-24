import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
}

const sizes = {
  sm: { scan: 14, perks: 14, gap: 4 },
  md: { scan: 22, perks: 22, gap: 6 },
  lg: { scan: 32, perks: 32, gap: 8 },
};

export default function BrandLogo({ size = 'md', centered = true }: BrandLogoProps) {
  const s = sizes[size];

  return (
    <View style={[styles.row, centered ? styles.centered : styles.left]}>
      <Text style={[styles.scan, { fontSize: s.scan }]}>Scan</Text>
      <Text style={[styles.perks, { fontSize: s.perks, marginLeft: s.gap }]}>Perks</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  centered: { justifyContent: 'center' },
  left: { justifyContent: 'flex-start' },
  scan: {
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: 0.5,
  },
  perks: {
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
});
