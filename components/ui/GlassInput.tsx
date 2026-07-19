import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps, ViewStyle, StyleProp, Platform } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface GlassInputProps extends TextInputProps {
  icon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function GlassInput({ icon, containerStyle, style, ...props }: GlassInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {icon}
      <TextInput
        underlineColorAndroid="transparent"
        keyboardAppearance="light"
        {...props}
        style={[styles.input, icon ? styles.inputWithIcon : undefined, style]}
        placeholderTextColor={props.placeholderTextColor || colors.textMuted}
        selectionColor={colors.primaryDark}
        cursorColor={colors.primaryDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: Platform.OS === 'android' ? 22 : undefined,
    color: colors.navy,
    paddingVertical: Platform.OS === 'android' ? 12 : spacing.md,
    // Force readable text on Android when system dark mode is on
    ...Platform.select({
      android: {
        textAlignVertical: 'center',
      },
    }),
  },
  inputWithIcon: {
    marginLeft: spacing.sm,
  },
});
