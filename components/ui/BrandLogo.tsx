import { View, Text, StyleSheet } from 'react-native';
import { colors, outfit, stamp } from '@/theme';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
  tone?: 'default' | 'light';
}

const sizes = {
  sm: { scan: 14, perks: 14, gap: 4 },
  md: { scan: 22, perks: 22, gap: 6 },
  lg: { scan: 32, perks: 32, gap: 8 },
};

export default function BrandLogo({ size = 'md', centered = true, tone = 'default' }: BrandLogoProps) {
  const s = sizes[size];
  const scanColor = tone === 'light' ? stamp.white : stamp.deep;

  return (
    <View style={[styles.row, centered ? styles.centered : styles.left]}>
      <Text style={[styles.scan, { fontSize: s.scan, color: scanColor }]}>Scan</Text>
      <Text style={[styles.perks, { fontSize: s.perks, marginLeft: s.gap }]}>Perks</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  centered: { justifyContent: 'center' },
  left: { justifyContent: 'flex-start' },
  scan: {
    fontFamily: outfit.extra,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  perks: {
    fontFamily: outfit.extra,
    fontWeight: '800',
    color: stamp.sky,
    letterSpacing: -0.3,
  },
});
