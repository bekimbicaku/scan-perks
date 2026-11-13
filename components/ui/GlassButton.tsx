import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radius, spacing, stamp, outfit } from '@/theme';

interface GlassButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  appearance?: 'glass' | 'stamp';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GlassButton({
  label,
  onPress,
  variant = 'primary',
  appearance = 'glass',
  loading,
  disabled,
  icon,
  style,
}: GlassButtonProps) {
  const stampLook = appearance === 'stamp';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        stampLook && styles.stampBase,
        stampLook && variant === 'primary' && styles.stampPrimary,
        stampLook && variant === 'secondary' && styles.stampSecondary,
        stampLook && variant === 'ghost' && styles.stampGhost,
        stampLook && variant === 'danger' && styles.stampDanger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          color={
            stampLook
              ? variant === 'secondary'
                ? stamp.white
                : variant === 'danger'
                  ? stamp.danger
                  : stamp.ink
              : variant === 'primary'
                ? colors.white
                : colors.primaryDark
          }
        />
      ) : (
        <>
          {icon}
          <Text
            numberOfLines={2}
            style={[
              styles.label,
              variant === 'primary' && styles.labelPrimary,
              variant === 'secondary' && styles.labelSecondary,
              variant === 'ghost' && styles.labelGhost,
              variant === 'danger' && styles.labelDanger,
              stampLook && styles.stampLabel,
              stampLook && variant === 'primary' && styles.stampLabelPrimary,
              stampLook && variant === 'secondary' && styles.stampLabelSecondary,
              stampLook && variant === 'ghost' && styles.stampLabelGhost,
              stampLook && variant === 'danger' && styles.stampLabelDanger,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    width: '100%',
    maxWidth: '100%',
    minHeight: 48,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.glass.backgroundStrong,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.errorLight,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  labelPrimary: { color: colors.white },
  labelSecondary: { color: colors.primaryDark },
  labelGhost: { color: colors.primaryDark },
  labelDanger: { color: colors.error },
  stampBase: {
    minHeight: stamp.buttonHeight,
    borderRadius: stamp.radiusButton,
    paddingVertical: 0,
  },
  stampPrimary: {
    backgroundColor: stamp.sky,
    borderColor: stamp.sky,
    shadowColor: stamp.sky,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 4,
  },
  stampSecondary: {
    backgroundColor: stamp.deep,
    borderColor: stamp.deep,
  },
  stampGhost: {
    backgroundColor: stamp.white,
    borderColor: stamp.input,
    borderWidth: 1.5,
  },
  stampDanger: {
    backgroundColor: stamp.white,
    borderColor: stamp.danger,
    borderWidth: 1.5,
  },
  stampLabel: { fontFamily: outfit.bold, fontWeight: '700' },
  stampLabelPrimary: { color: stamp.ink },
  stampLabelSecondary: { color: stamp.white },
  stampLabelGhost: { color: stamp.deep },
  stampLabelDanger: { color: stamp.danger },
});
