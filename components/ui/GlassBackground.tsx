import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { colors, radius, spacing, stamp } from '@/theme';

interface GlassBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'customer' | 'business';
}

export default function GlassBackground({ children, style, variant = 'default' }: GlassBackgroundProps) {
  if (variant === 'customer' || variant === 'business') {
    return (
      <View style={[styles.container, { backgroundColor: variant === 'business' ? stamp.mistBusiness : stamp.mist }, style]}>
        <View pointerEvents="none" style={styles.stampOrb} />
        <View pointerEvents="none" style={styles.stampGlow} />
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gradient.start, colors.offWhite, colors.gradient.mid]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      {children}
    </LinearGradient>
  );
}

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  noPadding?: boolean;
  stamp?: boolean;
}

export function GlassCard({ children, style, intensity = 40, noPadding, stamp: solid }: GlassCardProps) {
  const content = (
    <View style={[styles.cardInner, !noPadding && styles.cardPadding]}>
      {children}
    </View>
  );

  if (solid) {
    return (
      <View style={[styles.card, styles.stampCard, style]}>
        {content}
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.card, styles.cardWeb, style]}>
        {content}
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.cardOverlay} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  orbTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(125, 211, 252, 0.35)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: 40,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  stampOrb: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: stamp.orb,
  },
  stampGlow: {
    position: 'absolute',
    top: -30,
    left: -150,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  stampCard: {
    backgroundColor: stamp.white,
    borderColor: stamp.line,
    borderRadius: stamp.radiusCard,
    shadowColor: stamp.deep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: colors.glass.border,
    shadowColor: colors.glass.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  cardWeb: {
    backgroundColor: colors.glass.backgroundStrong,
    backdropFilter: 'blur(12px)' as any,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glass.background,
  },
  cardInner: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '100%',
  },
  cardPadding: {
    padding: spacing.md,
  },
});
