import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, Home, Scan, User } from 'lucide-react-native';
import { stamp, outfit } from '@/theme';

const ICONS = {
  home: Home,
  scan: Scan,
  business: Building2,
  profile: User,
} as const;

export default function StampTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const onScan = current === 'scan';

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.pill, onScan ? styles.pillDark : styles.pillLight]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const Icon = ICONS[route.name as keyof typeof ICONS] ?? Home;
          const isScan = route.name === 'scan';
          const inactive = onScan ? stamp.navMutedDark : stamp.muted;
          const active = onScan ? stamp.white : stamp.deep;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={typeof label === 'string' ? label : route.name}
              onPress={onPress}
              style={styles.item}
            >
              {isScan ? (
                <View style={styles.scanIcon}>
                  <Icon size={17} color={stamp.ink} strokeWidth={2.4} />
                </View>
              ) : (
                <View style={[styles.iconSlot, focused && !onScan && styles.iconActive]}>
                  <Icon size={22} color={focused ? active : inactive} strokeWidth={focused ? 2.4 : 2} />
                </View>
              )}
              <Text
                style={[
                  styles.label,
                  { color: focused ? active : inactive },
                  focused && styles.labelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  pill: {
    height: 72,
    borderRadius: stamp.radiusNav,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 14px 34px rgba(4, 20, 33, 0.18)' } as object,
      default: {
        shadowColor: '#041421',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 34,
        elevation: 12,
      },
    }),
  },
  pillLight: {
    backgroundColor: stamp.white,
    borderColor: stamp.line,
  },
  pillDark: {
    backgroundColor: 'rgba(4, 20, 33, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  item: {
    minWidth: 64,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconSlot: {
    height: 34,
    minWidth: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: stamp.skyTint,
  },
  scanIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: stamp.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: outfit.semibold,
    fontSize: 12,
    fontWeight: '600',
  },
  labelActive: {
    fontFamily: outfit.extra,
    fontWeight: '800',
  },
});
