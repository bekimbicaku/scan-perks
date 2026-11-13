import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, stamp, outfit } from '@/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  iconEnd?: boolean;
}

export default function SectionHeader({ title, subtitle, actionLabel, onAction, icon, iconEnd }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        {icon && !iconEnd ? <View style={styles.icon}>{icon}</View> : null}
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {icon && iconEnd ? <View style={styles.icon}>{icon}</View> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { marginRight: spacing.sm },
  text: { flex: 1 },
  title: {
    ...typography.h2,
    fontFamily: outfit.extra,
    fontSize: 22,
    letterSpacing: -0.4,
    color: stamp.deep,
    marginBottom: 0,
  },
  subtitle: { ...typography.caption, fontFamily: outfit.regular, color: stamp.muted, marginTop: 2 },
  action: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
