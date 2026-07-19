import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface GlassBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GlassBackground({ children, style }: GlassBackgroundProps) {
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
}

export function GlassCard({ children, style, intensity = 40, noPadding }: GlassCardProps) {
  const content = (
    <View style={[styles.cardInner, !noPadding && styles.cardPadding]}>
      {children}
    </View>
  );

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
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
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
  },
  cardPadding: {
    padding: spacing.md,
  },
});
