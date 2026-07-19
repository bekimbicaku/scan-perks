import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius } from '@/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
  circle?: boolean;
}

export default function Skeleton({ width = '100%', height = 16, style, circle }: SkeletonProps) {
  return (
    <View
      style={[
        styles.base,
        { width, height: circle ? (typeof width === 'number' ? width : 48) : height },
        circle && { borderRadius: radius.full },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(186, 230, 253, 0.5)',
    borderRadius: radius.sm,
  },
});
