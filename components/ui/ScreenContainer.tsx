import { View, ScrollView, StyleSheet, ScrollViewProps, ViewStyle, StyleProp, Platform } from 'react-native';
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
  const bottomPad = { paddingBottom: Platform.OS === 'web' ? spacing.xl : spacing.md };

  if (scroll) {
    return (
      <SafeAreaView style={[styles.flex, styles.clip, style]} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
          style={[styles.scroll, scrollProps?.style]}
          contentContainerStyle={[bottomPad, styles.scrollContent, scrollProps?.contentContainerStyle, contentStyle]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, styles.clip, style]} edges={['top', 'left', 'right']}>
      <View style={[styles.flex, styles.clip, bottomPad, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  clip: { width: '100%', maxWidth: '100%', overflow: 'hidden' },
  scroll: { flex: 1, width: '100%', maxWidth: '100%' },
  scrollContent: { width: '100%', maxWidth: '100%', flexGrow: 1 },
});
