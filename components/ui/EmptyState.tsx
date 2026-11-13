import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, stamp, outfit } from '@/theme';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  align?: 'center' | 'left';
  iconBg?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  align = 'center',
  iconBg,
}: EmptyStateProps) {
  const left = align === 'left';
  return (
    <View style={[styles.container, left && styles.left]}>
      <View style={[styles.iconWrap, left && styles.iconLeft, iconBg ? { backgroundColor: iconBg, borderWidth: 0 } : null]}>
        {icon}
      </View>
      <View style={left ? styles.copy : null}>
        <Text style={[styles.title, left && styles.titleLeft]}>{title}</Text>
        <Text style={[styles.description, left && styles.descriptionLeft]}>{description}</Text>
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glass.backgroundStrong,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 0,
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    ...typography.h3,
    fontFamily: outfit.extra,
    color: stamp.deep,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleLeft: { textAlign: 'left', fontSize: 16, marginBottom: 4 },
  description: {
    ...typography.caption,
    fontFamily: outfit.regular,
    color: stamp.muted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  descriptionLeft: { textAlign: 'left', maxWidth: '100%', marginBottom: spacing.sm },
});
