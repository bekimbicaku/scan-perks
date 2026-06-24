import { View, ScrollView, StyleSheet, ScrollViewProps, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function ScreenContainer({
  children,
  scroll = false,
  scrollProps,
  style,
  contentStyle,
}: ScreenContainerProps) {
  const bottomPad = { paddingBottom: spacing.md };

  if (scroll) {
    return (
      <SafeAreaView style={[styles.flex, style]} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          {...scrollProps}
          contentContainerStyle={[bottomPad, scrollProps?.contentContainerStyle, contentStyle]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, style]} edges={['top', 'left', 'right']}>
      <View style={[styles.flex, bottomPad, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
